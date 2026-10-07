package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.AdminStatsResponse;
import com.entreprise.proconnect.accounts.dto.AdminUserDetailResponse;
import com.entreprise.proconnect.accounts.dto.UserResponse;
import com.entreprise.proconnect.accounts.dto.WarningRequest;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Espace d'administration — ADMIN conserve ses capacités d'origine sur les
 * utilisateurs standards ; le SUPERADMIN peut en plus gérer les administrateurs
 * (rôles) et dispose des mêmes actions de modération.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
@Tag(name = "Administration")
public class AdminController {

    private final UserRepository userRepository;
    private final AdminService adminService;

    public AdminController(UserRepository userRepository, AdminService adminService) {
        this.userRepository = userRepository;
        this.adminService = adminService;
    }

    /* ------------------------------ Listing -------------------------------- */

    @GetMapping("/users/")
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
    @Operation(summary = "Détail d'un compte : profil, activité, avertissements reçus")
    public AdminUserDetailResponse getUser(@PathVariable UUID id) {
        return adminService.getUserDetail(id);
    }

    /* ---------------------------- Statistiques ----------------------------- */

    @GetMapping("/stats/")
    @Operation(summary = "Statistiques : utilisateurs, nouveaux comptes, suspendus, bannis, en ligne")
    public AdminStatsResponse stats() {
        return adminService.stats();
    }

    /* ---------------------------- Avertissement ---------------------------- */

    @PostMapping("/users/{id}/warn/")
    @Operation(summary = "Avertir : message officiel (notification + email), motif conservé dans l'historique")
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
    @Operation(summary = "Suspendre : connexion bloquée, données conservées, réactivable")
    public UserResponse suspend(@PathVariable UUID id) {
        return UserResponse.from(adminService.suspend(id));
    }

    @PostMapping("/users/{id}/reactivate/")
    @Operation(summary = "Réactiver un compte suspendu (ou lever un bannissement)")
    public UserResponse reactivate(@PathVariable UUID id) {
        return UserResponse.from(adminService.reactivate(id));
    }

    @PostMapping("/users/{id}/ban/")
    @Operation(summary = "Bannir durablement (données conservées)")
    public UserResponse ban(@PathVariable UUID id) {
        return UserResponse.from(adminService.ban(id));
    }

    /**
     * Compatibilité avec l'ancien toggle actif/inactif : désactiver suspend
     * désormais le compte (statut), réactiver le remet à ACTIVE.
     */
    @PatchMapping("/users/{id}/active/")
    @Operation(summary = "[Compatibilité] Activer / désactiver un compte")
    public UserResponse setActive(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        User user = getUserEntity(id);
        Boolean value = body.get("active");
        if (value == null) {
            throw new BusinessRuleException("Le champ 'active' est requis.");
        }
        return UserResponse.from(value ? adminService.reactivate(id) : adminService.suspend(id));
    }

    /* ------------------------- Suppression logique ------------------------- */

    @DeleteMapping("/users/{id}/")
    @Operation(summary = "Supprimer (LOGIQUE) : statut DELETED + données personnelles anonymisées")
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        adminService.softDelete(admin, id);
        return ResponseEntity.noContent().build();
    }

    /* ------------------------------ Rôles ---------------------------------- */

    @PatchMapping("/users/{id}/role/")
    @Operation(summary = "Changer le rôle (EMPLOYEE <-> ADMIN) — SUPERADMIN uniquement")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public UserResponse setRole(@AuthenticationPrincipal User actor, @PathVariable UUID id, @RequestBody Map<String, String> body) {
        String role = body.get("role");
        if (!"EMPLOYEE".equals(role) && !"ADMIN".equals(role)) {
            throw new BusinessRuleException("Rôle invalide : EMPLOYEE ou ADMIN attendu.");
        }
        return UserResponse.from(adminService.changeRole(actor, id, Role.valueOf(role)));
    }

    private User getUserEntity(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }
}
