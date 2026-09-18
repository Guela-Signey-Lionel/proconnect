package com.entreprise.proconnect.accounts.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

/**
 * Issues and validates JWT access/refresh tokens.
 * Equivalent role to djangorestframework-simplejwt on the Django side.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long accessTokenTtlMs;
    private final long refreshTokenTtlMs;

    public JwtService(
            @Value("${proconnect.jwt.secret}") String secret,
            @Value("${proconnect.jwt.access-ttl-minutes:30}") long accessTtlMinutes,
            @Value("${proconnect.jwt.refresh-ttl-days:7}") long refreshTtlDays
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessTokenTtlMs = accessTtlMinutes * 60 * 1000;
        this.refreshTokenTtlMs = refreshTtlDays * 24 * 60 * 60 * 1000;
    }

    public String generateAccessToken(UserDetails userDetails, UUID userId) {
        return buildToken(userDetails.getUsername(), userId, accessTokenTtlMs, "access");
    }

    public String generateRefreshToken(UserDetails userDetails, UUID userId) {
        return buildToken(userDetails.getUsername(), userId, refreshTokenTtlMs, "refresh");
    }

    private String buildToken(String subject, UUID userId, long ttlMs, String tokenType) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .claim("userId", userId.toString())
                .claim("type", tokenType)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMs))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("type", String.class));
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(extractClaim(token, claims -> claims.get("userId", String.class)));
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }
}
