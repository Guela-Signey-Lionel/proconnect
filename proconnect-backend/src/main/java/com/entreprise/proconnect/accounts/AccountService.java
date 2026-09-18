package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.RegisterRequest;
import com.entreprise.proconnect.accounts.security.JwtService;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.profiles.Profile;
import com.entreprise.proconnect.profiles.ProfileRepository;
import java.util.UUID;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;
    private final ProfileRepository profileRepository;

    public AccountService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetService passwordResetService,
            ProfileRepository profileRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
        this.profileRepository = profileRepository;
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessRuleException("Un compte existe déjà avec cet email.");
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(Role.EMPLOYEE)
                .active(true)
                .build();

        User saved = userRepository.save(user);

        // Un profil est créé pour CHAQUE compte : sans cela, l'utilisateur est absent
        // de /api/v1/profiles (recherche, suggestions, réseau) — il n'apparaissait
        // chez les autres utilisateurs qu'une fois un profil édité manuellement.
        Profile profile = Profile.builder().user(saved).build();
        if (request.phone() != null && !request.phone().isBlank()) {
            profile.setPhone(request.phone().trim());
        }
        profileRepository.save(profile);

        return saved;
    }

    /**
     * Used by the Google sign-in flow: find the account by email, or create one with
     * an unusable random password (Google accounts never authenticate by password).
     */
    @Transactional
    public User findOrCreateGoogleUser(String email, String firstName, String lastName, String pictureUrl) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = User.builder()
                    .email(email)
                    // Un-guessable random password: the user can still use "mot de passe oublié" later.
                    .password(passwordEncoder.encode(UUID.randomUUID() + ":" + UUID.randomUUID()))
                    .firstName(firstName)
                    .lastName(lastName == null || lastName.isBlank() ? "-" : lastName)
                    .role(Role.EMPLOYEE)
                    .active(true)
                    .build();
            User saved = userRepository.save(user);
            // Profil systématique : garantit la visibilité du compte chez les autres utilisateurs.
            profileRepository.save(Profile.builder().user(saved).build());
            return saved;
        });
        // pictureUrl is kept for API parity; the avatar lives on the Profile entity.
    }

    public User authenticate(String email, String rawPassword) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, rawPassword));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            throw new BadCredentialsException("Identifiants invalides.");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    public User getById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    @Transactional
    public void changePassword(User user, String oldPassword, String newPassword) {
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessRuleException("Mot de passe actuel incorrect.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void deactivate(User user) {
        user.setActive(false);
        userRepository.save(user);
    }

    /** Modification de l'email du compte (avec vérification d'unicité). */
    @Transactional
    public User updateEmail(User user, String newEmail) {
        String normalized = newEmail == null ? "" : newEmail.trim().toLowerCase();
        if (normalized.isEmpty()) {
            throw new BusinessRuleException("L'email ne peut pas être vide.");
        }
        if (!normalized.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new BusinessRuleException("Adresse e-mail invalide.");
        }
        if (normalized.equalsIgnoreCase(user.getEmail())) {
            return user; // rien à faire
        }
        if (userRepository.existsByEmail(normalized)) {
            throw new BusinessRuleException("Un compte existe déjà avec cet email.");
        }
        user.setEmail(normalized);
        return userRepository.save(user);
    }

    public void requestPasswordReset(String email) {
        userRepository.findByEmail(email)
                .filter(User::isActive)
                .ifPresent(passwordResetService::sendResetEmail);
        // Intentionally silent when the account doesn't exist — do not leak account existence.
    }

    @Transactional
    public void confirmPasswordReset(String token, String newPassword) {
        User user = passwordResetService.consumeToken(token);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
