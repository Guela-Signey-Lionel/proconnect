package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.AdminStatsResponse;
import com.entreprise.proconnect.accounts.dto.AdminUserDetailResponse;
import com.entreprise.proconnect.accounts.dto.WarningRequest;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.Comment;
import com.entreprise.proconnect.feed.CommentRepository;
import com.entreprise.proconnect.feed.Post;
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
 * Actions d'administration sur les comptes (cahier des charges, section 3) : listing
 * paginé/filtré, détail, avertissement (notification + email, historisé), suspension/
 * réactivation, bannissement, suppression LOGIQUE anonymisée, changement de rôle,
 * réinitialisation de mot de passe et statistiques. Chaque action est historisée dans
 * le journal (AdminAction).
 */
@Service
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AdminWarningRepository warningRepository;
    private final AdminActionRepository actionRepository;
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
            AdminActionRepository actionRepository,
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
        this.actionRepository = actionRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.messageRepository = messageRepository;
        this.notificationService = notificationService;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    /* -------------------------- Création Admin ----------------------------- */

    /**
     * Porte d'entrée du back-office quand la base est vierge : crée le PREMIER
     * compte ADMIN (aucun identifiant préconfiguré n'existe plus). Si un admin
     * existe déjà, l'endpoint refuse et renvoie vers la gestion des rôles depuis
     * une session ADMIN existante — la route ne permet jamais de créer un
     * second compte sans être admin.
     */
    @Transactional
    public User createAdmin(com.entreprise.proconnect.accounts.dto.AdminCreateRequest request) {
        if (userRepository.countByRole(Role.ADMIN) > 0) {
            throw new BusinessRuleException(
                    "Un administrateur existe déjà : connectez-vous avec un compte ADMIN "
                    + "pour promouvoir d'autres comptes depuis le back-office.");
        }
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BusinessRuleException("Un compte existe déjà avec cet email.");
        }
        User admin = userRepository.save(
                User.builder()
                        .email(email)
                        .password(passwordEncoder.encode(request.password()))
                        .firstName(request.firstName().trim())
                        .lastName(request.lastName().trim())
                        .role(Role.ADMIN)
                        .staff(true)
                        .active(true)
                        .status(UserStatus.ACTIVE)
                        .build()
        );
        profileRepository.save(com.entreprise.proconnect.profiles.Profile.builder()
                .user(admin)
                .jobTitle("Administrateur")
                .build());
        log.info("Premier compte ADMIN créé pour {} (bootstrap back-office).", email);
        return admin;
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
            throw new BusinessRuleException("On n'avertit pas un compte d'administration.");
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

        logAdminAction(admin, AdminActionType.WARN, target, warning.getId(),
                "Avertissement envoyé — motif : " + request.reason());

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
    public User suspend(User admin, UUID id) {
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de suspendre un compte d'administration.");
        }
        user.setStatus(UserStatus.SUSPENDED);
        User saved = userRepository.save(user);
        logAdminAction(admin, AdminActionType.SUSPEND, user, null, "Compte suspendu");
        return saved;
    }

    /** Réactive un compte suspendu (ou lève un bannissement, décision métier explicite). */
    @Transactional
    public User reactivate(User admin, UUID id) {
        User user = getUserEntity(id);
        if (user.getStatus() == UserStatus.DELETED) {
            throw new BusinessRuleException("Un compte supprimé ne peut pas être réactivé.");
        }
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.save(user);
        logAdminAction(admin, AdminActionType.REACTIVATE, user, null, "Compte réactivé");
        return saved;
    }

    /* ------------------------------ Bannir -------------------------------- */

    /** Bannit durablement : connexion définitivement bloquée, données conservées. */
    @Transactional
    public User ban(User admin, UUID id) {
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de bannir un compte d'administration.");
        }
        user.setStatus(UserStatus.BANNED);
        User saved = userRepository.save(user);
        logAdminAction(admin, AdminActionType.BAN, user, null, "Compte banni définitivement");
        return saved;
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
            throw new BusinessRuleException("Impossible de supprimer un compte d'administration.");
        }
        String emailBefore = user.getEmail();
        anonymizeAndMarkDeleted(user);
        User saved = userRepository.save(user);
        // Journal APRÈS anonymisation : la cible est déjà anonymisée, on journalise
        // le compte visé d'origine pour une trace lisible.
        AdminAction entry = AdminAction.builder()
                .actor(admin)
                .targetUser(saved)
                .actionType(AdminActionType.SOFT_DELETE)
                .description("Compte supprimé (logique) — identités anonymisées; e-mail avant suppression : " + emailBefore)
                .build();
        actionRepository.save(entry);
        return saved;
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
     * Change le rôle d'un compte : EMPLOYEE, MODERATOR ou ADMIN. Réservé aux
     * comptes ADMIN (l'accent MODERATOR n'a pas accès à cette fonction).
     */
    @Transactional
    public User changeRole(User actor, UUID id, Role newRole) {
        if (actor.getId().equals(id)) {
            throw new BusinessRuleException("Un administrateur ne peut pas modifier son propre rôle.");
        }
        User user = getUserEntity(id);
        user.setRole(newRole);
        user.setStaff(newRole != Role.EMPLOYEE);
        User saved = userRepository.save(user);
        String description = "Rôle : " + newRole.name();
        logAdminAction(actor, AdminActionType.ROLE_CHANGE, saved, null, description);
        return saved;
    }

    /* ------------------------- Réinitialisation MDP ----------------------- */

    /**
     * Réinitialisation administrative du mot de passe : pose un mot de passe
     * TEMPORAIRE et force son changement à la prochaine connexion
     * (mustChangePassword=true), comme l'exige le cahier des charges.
     */
    @Transactional
    public String resetPassword(User admin, UUID id, String newPassword) {
        User user = getUserEntity(id);
        // Mot de passe fourni par l'admin ou généré côté serveur (jamais de null).
        String password = (newPassword == null || newPassword.isBlank())
                ? generateTemporaryPassword()
                : newPassword;
        user.setPassword(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
        User saved = userRepository.save(user);
        logAdminAction(admin, AdminActionType.PASSWORD_RESET, saved, null,
                "Mot de passe réinitialisé par l'administration (changement forcé à la prochaine connexion)");
        dispatchResetEmail(saved.getEmail(), saved.getFirstName());
        return password;
    }

    /** Mot de passe temporaire lisible : 14 caractères sans caractères ambigus (0/O, 1/l/I). */
    private static String generateTemporaryPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(14);
        for (int i = 0; i < 14; i++) {
            sb.append(alphabet.charAt(random.nextInt(alphabet.length())));
        }
        return sb.toString();
    }

    @Async
    public void dispatchResetEmail(String toEmail, String firstName) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(toEmail);
            mail.setSubject("Votre mot de passe ProConnect a été réinitialisé");
            mail.setText(
                    "Bonjour " + firstName + ",\n\n"
                    + "L'administration a réinitialisé votre mot de passe. Un mot de passe\n"
                    + "temporaire vous a été communiqué — il DOIT être changé à votre prochaine\n"
                    + "connexion.\n\n"
                    + "L'administration ProConnect"
            );
            mailSender.send(mail);
        } catch (Exception ex) {
            // SMTP absent ou mal configuré : le flag mustChangePassword reste posé.
            log.warn("Échec de l'envoi de l'email de réinitialisation à {}", toEmail, ex);
        }
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
        long moderators = userRepository.countByRoleAndStatusNot(Role.MODERATOR, UserStatus.DELETED);
        long admins = userRepository.countByRoleAndStatusNot(Role.ADMIN, UserStatus.DELETED);
        long hiddenPosts = postRepository.countByHiddenTrue();
        long hiddenComments = commentRepository.countByHiddenTrue();
        return new AdminStatsResponse(total, newToday, new7d, new30d, suspended, banned, deleted, activeNow,
                moderators, admins, hiddenPosts, hiddenComments);
    }

    /* ------------------------------- Journal ------------------------------- */

    /** Persiste une entrée du journal des actions (échoue silencieusement pour ne pas bloquer l'action métier). */
    private void logAdminAction(User actor, AdminActionType type, User target, UUID objectId, String description) {
        try {
            actionRepository.save(AdminAction.builder()
                    .actor(actor)
                    .targetUser(target)
                    .actionType(type)
                    .objectId(objectId)
                    .description(description != null && description.length() > 1000
                            ? description.substring(0, 1000)
                            : description)
                    .build());
        } catch (Exception ex) {
            log.warn("Impossible d'enregistrer l'action {} dans le journal", type, ex);
        }
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
