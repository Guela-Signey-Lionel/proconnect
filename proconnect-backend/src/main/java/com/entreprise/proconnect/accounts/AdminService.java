package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.AdminStatsResponse;
import com.entreprise.proconnect.accounts.dto.AdminUserDetailResponse;
import com.entreprise.proconnect.accounts.dto.WarningRequest;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.CommentRepository;
import com.entreprise.proconnect.feed.PostRepository;
import com.entreprise.proconnect.messaging.MessageRepository;
import com.entreprise.proconnect.notifications.NotificationService;
import com.entreprise.proconnect.notifications.NotificationType;
import com.entreprise.proconnect.profiles.Profile;
import com.entreprise.proconnect.profiles.ProfileRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Actions Superadmin sur les comptes (cahier des charges, section 3) :
 * listing paginé/filtré, détail, avertissement (notification + email, historisé),
 * suspension/réactivation, bannissement, suppression LOGIQUE anonymisée,
 * changement de rôle et statistiques.
 */
@Service
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AdminWarningRepository warningRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            UserRepository userRepository,
            ProfileRepository profileRepository,
            AdminWarningRepository warningRepository,
            PostRepository postRepository,
            CommentRepository commentRepository,
            MessageRepository messageRepository,
            NotificationService notificationService,
            JavaMailSender mailSender,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.warningRepository = warningRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.messageRepository = messageRepository;
        this.notificationService = notificationService;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    /* ----------------------------- Listing -------------------------------- */

    /**
     * Liste paginée des comptes avec recherche texte et filtres :
     * statut, date d'inscription (période) et dernière connexion (période).
     */
    @Transactional(readOnly = true)
    public Page<User> listUsers(
            String search, UserStatus status,
            LocalDate registeredFrom, LocalDate registeredTo,
            LocalDate lastLoginFrom, LocalDate lastLoginTo,
            Pageable pageable
    ) {
        return userRepository.searchAdmin(
                blankToNull(search), status,
                startOfDay(registeredFrom), endOfDay(registeredTo),
                startOfDay(lastLoginFrom), endOfDay(lastLoginTo),
                pageable
        );
    }

    /* ------------------------------ Détail -------------------------------- */

    @Transactional(readOnly = true)
    public AdminUserDetailResponse getUserDetail(UUID id) {
        User user = getUserEntity(id);
        var profile = profileRepository.findByUserId(id);
        var warnings = warningRepository.findByUserIdOrderByCreatedAtDesc(id, Pageable.unpaged());
        long posts = postRepository.countByAuthorId(id);
        long comments = commentRepository.countByAuthorId(id);
        long messages = messageRepository.countBySenderId(id);
        return AdminUserDetailResponse.from(user, profile.orElse(null), warnings.getContent(), posts, comments, messages);
    }

    /* --------------------------- Avertissement ---------------------------- */

    /**
     * Avertit un utilisateur : message officiel conservé dans l'historique,
     * notification in-app temps réel et email (si un serveur SMTP est configuré).
     */
    @Transactional
    public AdminWarning warn(User admin, UUID userId, WarningRequest request) {
        User target = getUserEntity(userId);
        if (target.isAdmin()) {
            throw new BusinessRuleException("On n'avertit pas un compte administrateur.");
        }
        AdminWarning warning = warningRepository.save(
                AdminWarning.builder()
                        .user(target)
                        .issuedBy(admin)
                        .reason(request.reason())
                        .message(request.message())
                        .build()
        );

        String text = "Avertissement de l'administration : " + request.reason();
        notificationService.notify(target, admin, NotificationType.MENTION, warning.getId(), text);
        dispatchWarningEmail(target.getEmail(), target.getFirstName(), request.reason(), request.message());

        log.info("Admin {} a averti l'utilisateur {} (motif : {})", admin.getEmail(), target.getEmail(), request.reason());
        return warning;
    }

    @Async
    public void dispatchWarningEmail(String toEmail, String firstName, String reason, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(toEmail);
            mail.setSubject("Avertissement officiel — ProConnect");
            mail.setText(
                    "Bonjour " + firstName + ",\n\n"
                    + "Vous recevez un avertissement de l'administration de ProConnect.\n\n"
                    + "Motif : " + reason + "\n"
                    + (message == null || message.isBlank() ? "" : "\nMessage :\n" + message + "\n")
                    + "\nCet avertissement est conservé dans votre historique de compte.\n\n"
                    + "L'administration ProConnect"
            );
            mailSender.send(mail);
        } catch (Exception ex) {
            // SMTP absent ou mal configuré : l'avertissement reste historisé et notifié in-app.
            log.warn("Échec de l'envoi de l'email d'avertissement à {}", toEmail, ex);
        }
    }

    /* ----------------------- Suspendre / réactiver ------------------------ */

    /** Suspend : l'utilisateur ne peut plus se connecter, ses données sont conservées. */
    @Transactional
    public User suspend(UUID id) {
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de suspendre un compte administrateur.");
        }
        user.setStatus(UserStatus.SUSPENDED);
        return userRepository.save(user);
    }

    /** Réactive un compte suspendu (ou lève un bannissement, décision métier explicite). */
    @Transactional
    public User reactivate(UUID id) {
        User user = getUserEntity(id);
        if (user.getStatus() == UserStatus.DELETED) {
            throw new BusinessRuleException("Un compte supprimé ne peut pas être réactivé.");
        }
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    /* ------------------------------ Bannir -------------------------------- */

    /** Bannit durablement : connexion définitivement bloquée, données conservées. */
    @Transactional
    public User ban(UUID id) {
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de bannir un compte administrateur.");
        }
        user.setStatus(UserStatus.BANNED);
        return userRepository.save(user);
    }

    /* ------------------------ Suppression logique ------------------------- */

    /**
     * Suppression LOGIQUE (recommandée et implémentée ainsi) : status = DELETED et
     * données personnelles anonymisées. Les messages, publications et documents déjà
     * échangés restent en base pour ne pas casser les conversations des autres
     * utilisateurs — aucun DELETE physique.
     */
    @Transactional
    public User softDelete(User admin, UUID id) {
        if (admin.getId().equals(id)) {
            throw new BusinessRuleException("Vous ne pouvez pas supprimer votre propre compte.");
        }
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de supprimer un compte administrateur.");
        }
        anonymizeAndMarkDeleted(user);
        return userRepository.save(user);
    }

    /** Anonymisation RGPD-style : toutes les données personnelles sont écrasées. */
    private void anonymizeAndMarkDeleted(User user) {
        user.setStatus(UserStatus.DELETED);
        user.setActive(false);
        user.setEmail("deleted-" + user.getId() + "@deleted.proconnect.local");
        // Mot de passe remplacé par un hash d'une valeur aléatoire : la session
        // éventuelle reste valide jusqu'à expiration, mais plus aucune connexion.
        user.setPassword(passwordEncoder.encode(UUID.randomUUID() + ":" + UUID.randomUUID()));
        user.setFirstName("Utilisateur");
        user.setLastName("Supprimé");
        user.setLastSeenAt(null);
        user.setLastLoginAt(null);
        profileRepository.findByUserId(user.getId()).ifPresent(profile -> {
            profile.setPhone(null);
            profile.setBio(null);
            profile.setLocation(null);
            profile.setJobTitle(null);
            profile.setDepartment(null);
            profileRepository.save(profile);
        });
    }

    /* ----------------------------- Rôles ---------------------------------- */

    /**
     * Change le rôle d'un compte. Seul le SUPERADMIN peut monter un EMPLOYEE en
     * ADMIN ou retirer un rôle ADMIN — conformément au périmètre défini.
     */
    @Transactional
    public User changeRole(User actor, UUID id, Role newRole) {
        User user = getUserEntity(id);
        if (user.getRole() == Role.SUPERADMIN) {
            throw new BusinessRuleException("Le rôle d'un super administrateur ne peut pas être modifié.");
        }
        if (newRole == Role.SUPERADMIN) {
            throw new BusinessRuleException("Aucun compte ne peut être promu SUPERADMIN (compte technique de bootstrap).");
        }
        if (actor.getId().equals(id)) {
            throw new BusinessRuleException("Un administrateur ne peut pas modifier son propre rôle.");
        }
        user.setRole(newRole);
        if (newRole == Role.ADMIN) {
            user.setStaff(true);
        }
        return userRepository.save(user);
    }

    /* --------------------------- Statistiques ----------------------------- */

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        long total = userRepository.countByStatusNot(UserStatus.DELETED);
        long suspended = userRepository.countByStatus(UserStatus.SUSPENDED);
        long banned = userRepository.countByStatus(UserStatus.BANNED);
        long deleted = userRepository.countByStatus(UserStatus.DELETED);
        long newToday = userRepository.countByCreatedAtAfter(startOfDay(LocalDate.now()));
        long new7d = userRepository.countByCreatedAtAfter(startOfDay(LocalDate.now().minusDays(7)));
        long new30d = userRepository.countByCreatedAtAfter(startOfDay(LocalDate.now().minusDays(30)));
        long activeNow = userRepository.countByLastSeenAtAfter(Instant.now().minusSeconds(120));
        return new AdminStatsResponse(total, newToday, new7d, new30d, suspended, banned, deleted, activeNow);
    }

    /* ---------------------------- Utilitaires ----------------------------- */

    private User getUserEntity(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static Instant startOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private static Instant endOfDay(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().minusMillis(1);
    }
}
