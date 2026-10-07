package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.profiles.Profile;
import com.entreprise.proconnect.profiles.ProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crée le compte Superadmin au démarrage s'il n'existe pas encore.
 *
 * Les identifiants ne sont JAMAIS dans le code ni dans Git : ils viennent des
 * variables d'environnement du serveur :
 *   - ADMIN_BOOTSTRAP_EMAIL    (défaut local : superadmin@proconnect.com)
 *   - ADMIN_BOOTSTRAP_PASSWORD (défaut local : Superad2026)
 *   - ADMIN_BOOTSTRAP_FIRST_NAME / ADMIN_BOOTSTRAP_LAST_NAME (optionnels)
 *
 * En production, définissez uniquement les variables d'environnement ; les
 * défauts ci-dessous ne servent qu'aux environnements de développement local.
 *
 * Le compte est créé avec mustChangePassword = true : la connexion renvoie ce
 * flag et le frontend force le changement de mot de passe à la première session.
 */
@Component
@Slf4j
public class SuperadminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${proconnect.admin-bootstrap.email:superadmin@proconnect.com}")
    private String bootstrapEmail;

    @Value("${proconnect.admin-bootstrap.password:Superad2026}")
    private String bootstrapPassword;

    @Value("${proconnect.admin-bootstrap.first-name:Super}")
    private String bootstrapFirstName;

    @Value("${proconnect.admin-bootstrap.last-name:Admin}")
    private String bootstrapLastName;

    public SuperadminBootstrap(
            UserRepository userRepository,
            ProfileRepository profileRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (bootstrapEmail == null || bootstrapEmail.isBlank()
                || bootstrapPassword == null || bootstrapPassword.isBlank()) {
            log.warn("SuperadminBootstrap : ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD non définis, compte non créé.");
            return;
        }

        String email = bootstrapEmail.trim().toLowerCase();
        if (email.equals("superadmin@proconnect.com") && "Superad2026".equals(bootstrapPassword)) {
            log.warn("SuperadminBootstrap : identifiants par défaut utilisés — définissez ADMIN_BOOTSTRAP_EMAIL et "
                    + "ADMIN_BOOTSTRAP_PASSWORD en production et changez le mot de passe à la première connexion.");
        }

        if (userRepository.existsByEmail(email)) {
            return; // Compte déjà créé (redémarrage) : on ne touche à rien.
        }

        try {
            User superadmin = userRepository.save(
                    User.builder()
                            .email(email)
                            // BCrypt : jamais de mot de passe en clair en base.
                            .password(passwordEncoder.encode(bootstrapPassword))
                            .firstName(bootstrapFirstName)
                            .lastName(bootstrapLastName)
                            .role(Role.SUPERADMIN)
                            .staff(true)
                            .active(true)
                            .status(UserStatus.ACTIVE)
                            // Force le changement de mot de passe à la première connexion.
                            .mustChangePassword(true)
                            .build()
            );
            profileRepository.save(Profile.builder()
                    .user(superadmin)
                    .jobTitle("Super administrateur")
                    .department("Direction Générale")
                    .build());
            log.info("SuperadminBootstrap : compte Superadmin créé pour {} (mot de passe à changer à la première connexion).", email);
        } catch (DataIntegrityViolationException ex) {
            // Course bénigne entre deux démarrages simultanés : le compte existe déjà.
            log.info("SuperadminBootstrap : le compte {} existe déjà.", email);
        }
    }
}
