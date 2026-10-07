package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.AccountUpdateRequest;
import com.entreprise.proconnect.accounts.dto.ChangePasswordRequest;
import com.entreprise.proconnect.accounts.dto.LoginRequest;
import com.entreprise.proconnect.accounts.dto.PasswordResetConfirmRequest;
import com.entreprise.proconnect.accounts.dto.PasswordResetRequest;
import com.entreprise.proconnect.accounts.dto.RefreshRequest;
import com.entreprise.proconnect.accounts.dto.RegisterRequest;
import com.entreprise.proconnect.accounts.dto.TokenResponse;
import com.entreprise.proconnect.accounts.dto.UserResponse;
import com.entreprise.proconnect.accounts.security.JwtService;
import com.entreprise.proconnect.profiles.Profile;
import com.entreprise.proconnect.profiles.ProfileRepository;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Mirrors apps/accounts/urls.py — mounted under /api/v1/auth/ (see config/urls.py). */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Comptes & Authentification")
public class AccountController {

    private final AccountService accountService;
    private final JwtService jwtService;
    private final ProfileRepository profileRepository;

    public AccountController(
            AccountService accountService,
            JwtService jwtService,
            ProfileRepository profileRepository
    ) {
        this.accountService = accountService;
        this.jwtService = jwtService;
        this.profileRepository = profileRepository;
    }

    @PostMapping("/register/")
    @Operation(summary = "Création de compte")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = accountService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
    }

    @PostMapping("/login/")
    @Operation(summary = "Connexion — renvoie un access token, un refresh token et le flag « mot de passe à changer »")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = accountService.authenticate(request.email(), request.password());
        String accessToken = jwtService.generateAccessToken(user, user.getId());
        String refreshToken = jwtService.generateRefreshToken(user, user.getId());
        return ResponseEntity.ok(new TokenResponse(accessToken, refreshToken, "Bearer", user.isMustChangePassword()));
    }

    @PostMapping("/login/refresh/")
    @Operation(summary = "Obtenir un nouvel access token à partir d'un refresh token")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        String token = request.refreshToken();
        if (!"refresh".equals(jwtService.extractTokenType(token))) {
            throw new BusinessRuleException("Jeton invalide : un refresh token est attendu.");
        }
        User user = accountService.getById(jwtService.extractUserId(token));
        // Un compte suspendu/banni/supprimé ne peut pas rafraîchir sa session.
        accountService.assertCanUseSession(user);
        if (!jwtService.isTokenValid(token, user)) {
            throw new BusinessRuleException("Refresh token invalide ou expiré.");
        }
        String newAccessToken = jwtService.generateAccessToken(user, user.getId());
        String newRefreshToken = jwtService.generateRefreshToken(user, user.getId());
        return ResponseEntity.ok(new TokenResponse(newAccessToken, newRefreshToken));
    }

    @GetMapping("/me/")
    @Operation(summary = "Profil du compte connecté (avec l'URL de sa photo de profil)")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal User user) {
        String avatarUrl = profileRepository.findByUserId(user.getId())
                .map(Profile::getAvatarUrl).orElse(null);
        return ResponseEntity.ok(UserResponse.from(user, avatarUrl));
    }

    @PatchMapping("/me/")
    @Operation(summary = "Modifier mon email et/ou mon numéro de téléphone")
    public ResponseEntity<UserResponse> updateAccount(
            @AuthenticationPrincipal User user, @jakarta.validation.Valid @RequestBody AccountUpdateRequest request
    ) {
        // Email : géré par AccountService (unicité, validation).
        if (request.email() != null && !request.email().isBlank()) {
            accountService.updateEmail(user, request.email());
        }
        // Téléphone : vit sur le profil.
        if (request.phone() != null) {
            Profile profile = profileRepository.findByUserId(user.getId())
                    .orElseGet(() -> profileRepository.save(Profile.builder().user(user).build()));
            profile.setPhone(request.phone().trim().isEmpty() ? null : request.phone().trim());
            profileRepository.save(profile);
        }
        return ResponseEntity.ok(UserResponse.from(
                accountService.getById(user.getId()),
                profileRepository.findByUserId(user.getId()).map(Profile::getAvatarUrl).orElse(null)
        ));
    }

    @PostMapping("/change-password/")
    @Operation(summary = "Changer son mot de passe")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal User user, @Valid @RequestBody ChangePasswordRequest request
    ) {
        accountService.changePassword(user, request.oldPassword(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password-reset/")
    @Operation(summary = "Demander un email de réinitialisation de mot de passe")
    public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        accountService.requestPasswordReset(request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password-reset-confirm/")
    @Operation(summary = "Confirmer la réinitialisation avec le token reçu par email")
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        accountService.confirmPasswordReset(request.token(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/deactivate/")
    @Operation(summary = "Désactiver son propre compte")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deactivate(@AuthenticationPrincipal User user) {
        accountService.deactivate(user);
        return ResponseEntity.ok().build();
    }
}
