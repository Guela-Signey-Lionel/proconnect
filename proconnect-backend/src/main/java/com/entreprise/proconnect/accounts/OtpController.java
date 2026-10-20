package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.OtpRequest;
import com.entreprise.proconnect.accounts.dto.OtpVerifyRequest;
import com.entreprise.proconnect.accounts.dto.TokenResponse;
import com.entreprise.proconnect.accounts.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Connexion par code unique envoyé par email. L'OTP remplace l'étape
 * « vérifier le mot de passe » : une fois le code validé, on émet exactement
 * le même couple access/refresh token que le login classique.
 *
 * /request répond TOUJOURS 202 (compte existant ou non) pour ne pas permettre
 * l'énumération des emails.
 */
@RestController
@RequestMapping("/api/v1/auth/otp")
@Tag(name = "Comptes & Authentification", description = "Connexion par code email (OTP)")
public class OtpController {

    private final OtpService otpService;
    private final AccountService accountService;
    private final JwtService jwtService;

    public OtpController(OtpService otpService, AccountService accountService, JwtService jwtService) {
        this.otpService = otpService;
        this.accountService = accountService;
        this.jwtService = jwtService;
    }

    @PostMapping("/request/")
    @Operation(summary = "Demander un code de connexion envoyé par email (toujours 202)")
    public ResponseEntity<Void> request(@Valid @RequestBody OtpRequest request) {
        otpService.request(request.email());
        // Toujours 202, jamais de 404 : pas d'énumération d'emails.
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/verify/")
    @Operation(summary = "Vérifier le code et ouvrir la session (access + refresh tokens)")
    public ResponseEntity<?> verify(@Valid @RequestBody OtpVerifyRequest request) {
        if (!otpService.verify(request.email(), request.code())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Code invalide ou expiré."));
        }

        // Le code est bon : compte existant ou première connexion (création auto,
        // même logique que le flux Google), puis contrôle du statut du compte
        // (suspendu / banni / supprimé) avec les mêmes messages que le login classique.
        User user = accountService.findOrCreateOtpUser(request.email());
        user = accountService.assertCanLoginOtp(user);

        String accessToken = jwtService.generateAccessToken(user, user.getId());
        String refreshToken = jwtService.generateRefreshToken(user, user.getId());
        return ResponseEntity.ok(new TokenResponse(accessToken, refreshToken, "Bearer", user.isMustChangePassword()));
    }
}
