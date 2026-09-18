package com.entreprise.proconnect.accounts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies a Google ID token without any extra dependency: fetches Google's public
 * JWKS (https://www.googleapis.com/oauth2/v3/certs), caches it, and validates the
 * signature, audience, issuer and expiry with JJWT.
 */
@Component
public class GoogleIdTokenVerifier {

    private static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String ISSUER = "https://accounts.google.com";

    private final String expectedAudience;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ConcurrentHashMap<String, CachedKey> keys = new ConcurrentHashMap<>();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public GoogleIdTokenVerifier(@Value("${proconnect.google.client-id:}") String clientId) {
        this.expectedAudience = clientId;
    }

    public record GoogleProfile(String email, String firstName, String lastName, String picture) {
    }

    public GoogleProfile verify(String idToken) {
        try {
            // Decode header to find the kid and pick the right key.
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Jeton Google mal formé.");
            }
            String kid;
            try {
                kid = objectMapper.readTree(Base64.getUrlDecoder().decode(parts[0]))
                        .path("kid").asText(null);
            } catch (java.io.IOException ioEx) {
                throw new IllegalArgumentException("Jeton Google illisible.");
            }
            if (kid == null) {
                throw new IllegalArgumentException("Jeton Google sans kid.");
            }

            PublicKey publicKey = loadKey(kid);

            Claims claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(ISSUER)
                    .requireAudience(expectedAudience)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();

            String email = claims.get("email", String.class);
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("Le jeton Google ne contient pas d'email.");
            }
            if (Boolean.FALSE.equals(claims.get("email_verified", Boolean.class))) {
                throw new IllegalArgumentException("L'email Google n'est pas vérifié.");
            }

            String firstName = claims.get("given_name", String.class);
            String lastName = claims.get("family_name", String.class);
            if ((firstName == null || firstName.isBlank()) && email.contains("@")) {
                firstName = email.substring(0, email.indexOf('@'));
            }
            return new GoogleProfile(
                    email.toLowerCase(),
                    firstName != null ? firstName : "Utilisateur",
                    lastName != null ? lastName : "",
                    claims.get("picture", String.class)
            );
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException ex) {
            throw new IllegalArgumentException("Jeton Google invalide ou expiré.");
        }
    }

    private PublicKey loadKey(String kid) {
        CachedKey cached = keys.get(kid);
        if (cached != null && !cached.isExpired()) {
            return cached.key;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(JWKS_URL)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Impossible de récupérer les clés publiques Google.");
            }
            JsonNode jwks = objectMapper.readTree(response.body());
            JsonNode matching = null;
            for (JsonNode key : jwks.path("keys")) {
                if (kid.equals(key.path("kid").asText())) {
                    matching = key;
                    break;
                }
            }
            if (matching == null) {
                throw new IllegalArgumentException("Clé Google inconnue pour kid=" + kid);
            }

            BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(matching.path("n").asText()));
            BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(matching.path("e").asText()));
            PublicKey key = KeyFactory.getInstance("RSA")
                    .generatePublic(new RSAPublicKeySpec(modulus, exponent));

            // Rotate the cache hourly and drop stale entries.
            keys.clear();
            keys.put(kid, new CachedKey(key, System.currentTimeMillis() + Duration.ofHours(1).toMillis()));
            return key;
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur lors de la récupération des clés Google.", ex);
        }
    }

    private record CachedKey(PublicKey key, long expiresAt) {
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
