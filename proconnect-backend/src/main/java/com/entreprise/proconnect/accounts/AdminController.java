package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.AdminActionResponse;
import com.entreprise.proconnect.accounts.dto.AdminStatsResponse;
import com.entreprise.proconnect.accounts.dto.AdminUserDetailResponse;
import com.entreprise.proconnect.accounts.dto.AdminCreateRequest;
import com.entreprise.proconnect.accounts.dto.UserResponse;
import com.entreprise.proconnect.accounts.dto.WarningRequest;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.Comment;
import com.entreprise.proconnect.feed.CommentRepository;
import com.entreprise.proconnect.feed.Post;
import com.entreprise.proconnect.feed.PostRepository;
import com.entreprise.proconnect.feed.dto.CommentModerationResponse;
import com.entreprise.proconnect.feed.dto.PostModerationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Back-office d'administration (ADMIN complet, MODERATOR limité à la modération) :
 * gestion des utilisateurs, modération de contenu, journal des actions et
 * statistiques. Aucun compte préconfiguré : le premier Admin est créé via
 * /admin/bootstrap (token requis) puis gère les autres comptes depuis l'interface.
 */
@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Administration")
public class AdminController {

    private final UserRepository userRepository;
    private final AdminService adminService;
    private final AdminModerationService moderationService;
    private final AdminActionRepository actionRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public AdminController(
            UserRepository userRepository,
            AdminService adminService,
            AdminModerationService moderationService,
            AdminActionRepository actionRepository,
            PostRepository postRepository,
            CommentRepository commentRepository
    ) {
        this.userRepository = userRepository;
        this.adminService = adminService;
        this.moderationService = moderationService;
        this.actionRepository = actionRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
    }

    /* --------------------------- Création Admin ----------------------------- */

    /**
     * Crée le PREMIER administrateur (ou un administrateur supplémentaire si un
     * token est fourni). Aucune authentification : c'est la porte d'entrée du
     * back-office quand la base est vierge (aucun compte préconfiguré).
     */
    @PostMapping("/bootstrap/")
    @Operation(summary = "Créer un compte ADMIN : sans authentification s'il n'existe aucun admin, sinon avec le token d'un admin connecté")
    public ResponseEntity<UserResponse> bootstrapAdmin(@Valid @RequestBody AdminCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserResponse.from(adminService.createAdmin(request)));
    }

    /* ------------------------------ Listing -------------------------------- */

    @GetMapping("/users/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister les comptes : pagination, recherche, filtres (statut, inscription, dernière connexion)")
    public PageResponse<UserResponse> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate registeredFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate registeredTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastLoginFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lastLoginTo,
            Pageable pageable
    ) {
        Page<User> page = adminService.listUsers(
                search, status, registeredFrom, registeredTo, lastLoginFrom, lastLoginTo, pageable);
        return PageResponse.from(page.map(UserResponse::from));
    }

    /* ------------------------------- Détail -------------------------------- */

    @GetMapping("/users/{id}/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Détail d'un compte : profil, activité, avertissements reçus, actions le concernant")
    public AdminUserDetailResponse getUser(@PathVariable UUID id) {
        return adminService.getUserDetail(id);
    }

    /* ---------------------------- Statistiques ----------------------------- */

    @GetMapping("/stats/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Statistiques : utilisateurs, nouveaux comptes, suspendus, bannis, en ligne, contenus masqués")
    public AdminStatsResponse stats() {
        return adminService.stats();
    }

    /* ---------------------------- Avertissement ---------------------------- */

    @PostMapping("/users/{id}/warn/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Avertir : message officiel (notification + email), motif conservé dans l'historique et le journal")
    public AdminUserDetailResponse warn(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id,
            @Valid @RequestBody WarningRequest request
    ) {
        adminService.warn(admin, id, request);
        return adminService.getUserDetail(id);
    }

    /* ---------------------- Suspension / bannissement ---------------------- */

    @PostMapping("/users/{id}/suspend/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Suspendre : connexion bloquée, données conservées, réactivable")
    public UserResponse suspend(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        return UserResponse.from(adminService.suspend(admin, id));
    }

    @PostMapping("/users/{id}/reactivate/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Réactiver un compte suspendu (ou lever un bannissement)")
    public UserResponse reactivate(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        return UserResponse.from(adminService.reactivate(admin, id));
    }

    @PostMapping("/users/{id}/ban/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Bannir durablement (données conservées)")
    public UserResponse ban(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        return UserResponse.from(adminService.ban(admin, id));
    }

    /**
     * Compatibilité avec l'ancien toggle actif/inactif : désactiver suspend
     * désormais le compte (statut), réactiver le remet à ACTIVE.
     */
    @PatchMapping("/users/{id}/active/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "[Compatibilité] Activer / désactiver un compte")
    public UserResponse setActive(
            @AuthenticationPrincipal User admin, @PathVariable UUID id, @RequestBody Map<String, Boolean> body
    ) {
        Boolean value = body.get("active");
        if (value == null) {
            throw new BusinessRuleException("Le champ 'active' est requis.");
        }
        return UserResponse.from(value ? adminService.reactivate(admin, id) : adminService.suspend(admin, id));
    }

    /* ------------------------- Suppression logique ------------------------- */

    @DeleteMapping("/users/{id}/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer (LOGIQUE) : statut DELETED + données personnelles anonymisées")
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        adminService.softDelete(admin, id);
        return ResponseEntity.noContent().build();
    }

    /* ------------------------------ Rôles ---------------------------------- */

    @PatchMapping("/users/{id}/role/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Changer le rôle : EMPLOYEE, MODERATOR ou ADMIN (jamais son propre rôle)")
    public UserResponse setRole(
            @AuthenticationPrincipal User actor, @PathVariable UUID id, @RequestBody Map<String, String> body
    ) {
        String role = body.get("role");
        if (!"EMPLOYEE".equals(role) && !"ADMIN".equals(role) && !"MODERATOR".equals(role)) {
            throw new BusinessRuleException("Rôle invalide : EMPLOYEE, MODERATOR ou ADMIN attendu.");
        }
        return UserResponse.from(adminService.changeRole(actor, id, Role.valueOf(role)));
    }

    /* ----------------------- Réinitialisation MDP -------------------------- */

    @PostMapping("/users/{id}/reset-password/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Réinitialiser le mot de passe : mot de passe temporaire (généré si absent) et changement forcé à la prochaine connexion")
    public Map<String, String> resetPassword(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id,
            @RequestBody(required = false) ResetPasswordRequest request
    ) {
        String temporary = adminService.resetPassword(
                admin, id, request != null ? request.newPassword() : null);
        // Le mot de passe temporaire est retourné UNE SEULE FOIS pour être
        // communiqué à l'utilisateur via un canal externe (jamais stocké en clair).
        return Map.of("temporaryPassword", temporary);
    }

    /** Corps optionnel : newPassword absent → généré côté serveur. */
    public record ResetPasswordRequest(String newPassword) {
    }

    /* ----------------------------- Modération ------------------------------ */

    /** Publications visibles, paginées, filtrables — scan aisé avant action. */
    @GetMapping("/moderation/posts/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Lister les publications (visibles et masquées) pour modération")
    public PageResponse<PostModerationResponse> moderationPosts(
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Post> page = moderationService.listPosts(blankToNull(search), hidden, sorted);
        return PageResponse.from(page.map(p -> PostModerationResponse.from(
                p, commentRepository.countByPostIdAndHiddenFalse(p.getId()))));
    }

    /** Commentaires visibles / masqués, filtrables par publication. */
    @GetMapping("/moderation/comments/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Lister les commentaires (visibles et masqués) pour modération")
    public PageResponse<CommentModerationResponse> moderationComments(
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(required = false) UUID postId,
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Comment> page = moderationService.listComments(blankToNull(search), postId, hidden, sorted);
        return PageResponse.from(page.map(CommentModerationResponse::from));
    }

    /** Masque une publication (reversible) — équivaut à un signalement traité. */
    @PostMapping("/moderation/posts/{id}/hide/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Masquer une publication du fil (réversible, journalisé)")
    public ResponseEntity<Void> hidePost(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        moderationService.hidePost(admin, id);
        return ResponseEntity.noContent().build();
    }

    /** Restaure une publication masquée. */
    @PostMapping("/moderation/posts/{id}/unhide/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Restaurer (afficher à nouveau) une publication masquée")
    public ResponseEntity<Void> unhidePost(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        moderationService.unhidePost(admin, id);
        return ResponseEntity.noContent().build();
    }

    /** Supprime DÉFINITIVEMENT une publication (irréversible, journalisé). */
    @DeleteMapping("/moderation/posts/{id}/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Supprimer définitivement une publication (irréversible, journalisé)")
    public ResponseEntity<Void> deletePost(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        moderationService.deletePost(admin, id);
        return ResponseEntity.noContent().build();
    }

    /** Masque un commentaire (réversible). */
    @PostMapping("/moderation/comments/{id}/hide/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Masquer un commentaire (réversible, journalisé)")
    public ResponseEntity<Void> hideComment(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        moderationService.hideComment(admin, id);
        return ResponseEntity.noContent().build();
    }

    /** Restaure un commentaire masqué. */
    @PostMapping("/moderation/comments/{id}/unhide/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Restaurer (afficher à nouveau) un commentaire masqué")
    public ResponseEntity<Void> unhideComment(
            @AuthenticationPrincipal User admin, @PathVariable UUID id
    ) {
        moderationService.unhideComment(admin, id);
        return ResponseEntity.noContent().build();
    }

    /** Supprime DÉFINITIVEMENT un commentaire (irréversible, journalisé). */
    @DeleteMapping("/moderation/comments/{id}/")
    @PreAuthorize("hasAnyRole('ADMIN','MODERATOR')")
    @Operation(summary = "Supprimer définitivement un commentaire (irréversible, journalisé)")
    public ResponseEntity<Void> deleteComment(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        moderationService.deleteComment(admin, id);
        return ResponseEntity.noContent().build();
    }

    /* ------------------------- Journal des actions -------------------------- */

    @GetMapping("/actions/")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Journal d'administration : qui a fait quoi, quand (filtres auteur/cible/type)")
    public PageResponse<AdminActionResponse> actions(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) UUID targetUserId,
            @RequestParam(required = false) AdminActionType actionType,
            Pageable pageable
    ) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminAction> page = actionRepository.search(actorId, targetUserId, actionType, sorted);
        return PageResponse.from(page.map(AdminActionResponse::from));
    }

    /* ---------------------------- Utilitaires ------------------------------ */

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
