package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.TokenResponse;
import com.entreprise.proconnect.accounts.dto.UserResponse;
import com.entreprise.proconnect.accounts.security.JwtService;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Sign in / sign up with Google. The frontend obtains a Google ID token via
 * Google Identity Services, then posts it here; the backend verifies it against
 * Google's public keys and either finds the matching local account or creates
 * one on the fly (passwordless — the account is flagged with a random password).
 */
@RestController
@RequestMapping("/api/v1/auth/google")
@Tag(name = "Comptes & Authentification")
public class GoogleAuthController {

    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final AccountService accountService;
    private final JwtService jwtService;

    @Value("${proconnect.google.client-id:}")
    private String clientId;

    public GoogleAuthController(
            GoogleIdTokenVerifier googleIdTokenVerifier,
            AccountService accountService,
            JwtService jwtService
    ) {
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.accountService = accountService;
        this.jwtService = jwtService;
    }

    /** Public info used by the frontend to render the Google button. */
    @GetMapping("/client-id/")
    @Operation(summary = "Client ID Google à utiliser côté frontend")
    public Map<String, String> clientId() {
        return Map.of("clientId", clientId == null ? "" : clientId);
    }

    @PostMapping("/login/")
    @Operation(summary = "Connexion / inscription avec un jeton Google ID")
    public ResponseEntity<TokenResponse> login(@RequestBody Map<String, String> body) {
        String idToken = body == null ? null : body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            throw new BusinessRuleException("Le jeton Google (idToken) est requis.");
        }
        GoogleIdTokenVerifier.GoogleProfile profile;
        try {
            profile = googleIdTokenVerifier.verify(idToken);
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException(ex.getMessage());
        }

        User user = accountService.findOrCreateGoogleUser(
                profile.email(), profile.firstName(), profile.lastName(), profile.picture()
        );
        String accessToken = jwtService.generateAccessToken(user, user.getId());
        String refreshToken = jwtService.generateRefreshToken(user, user.getId());
        return ResponseEntity.ok(new TokenResponse(accessToken, refreshToken));
    }
}
