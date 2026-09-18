package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Garantit qu'un profil existe pour chaque utilisateur actif au démarrage de
 * l'application. Filet de sécurité en complément de la migration V7 : tout
 * compte sans profil est invisible des autres utilisateurs (recherche,
 * suggestions, réseau) puisque ces listes s'appuient sur /api/v1/profiles.
 */
@Component
@Slf4j
public class ProfileBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    public ProfileBootstrap(UserRepository userRepository, ProfileRepository profileRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        long created = userRepository.findByActiveTrue().stream()
                .filter(u -> profileRepository.findByUserId(u.getId()).isEmpty())
                .peek(u -> profileRepository.save(Profile.builder().user(u).build()))
                .count();
        if (created > 0) {
            log.info("ProfileBootstrap : {} profil(s) créé(s) pour des comptes orphelins.", created);
        }
    }
}
