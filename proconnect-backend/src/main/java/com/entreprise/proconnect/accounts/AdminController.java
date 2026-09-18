package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.accounts.dto.UserResponse;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Administration de la plateforme — réservé aux comptes ADMIN / SUPERADMIN. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
@Tag(name = "Administration")
public class AdminController {

    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/users/")
    @Operation(summary = "Lister / rechercher les comptes (paginé)")
    public PageResponse<UserResponse> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            Pageable pageable
    ) {
        Page<User> page;
        if (search != null && !search.isBlank()) {
            page = userRepository.searchUsers(search, pageable);
        } else if (Boolean.TRUE.equals(active)) {
            page = userRepository.findByActiveTrue(pageable);
        } else {
            page = userRepository.findAll(pageable);
        }
        return PageResponse.from(page.map(UserResponse::from));
    }

    @GetMapping("/users/{id}/")
    @Operation(summary = "Détail d'un compte")
    public UserResponse getUser(@PathVariable UUID id) {
        return UserResponse.from(getUserEntity(id));
    }

    @PatchMapping("/users/{id}/active/")
    @Operation(summary = "Activer / désactiver un compte")
    public UserResponse setActive(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        User user = getUserEntity(id);
        Boolean value = body.get("active");
        if (value == null) {
            throw new BusinessRuleException("Le champ 'active' est requis.");
        }
        if (!value && user.isAdmin()) {
            throw new BusinessRuleException("Impossible de désactiver un compte administrateur.");
        }
        user.setActive(value);
        return UserResponse.from(userRepository.save(user));
    }

    @PatchMapping("/users/{id}/role/")
    @Operation(summary = "Changer le rôle d'un compte (EMPLOYEE ou ADMIN)")
    public UserResponse setRole(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        User user = getUserEntity(id);
        String role = body.get("role");
        if (!"EMPLOYEE".equals(role) && !"ADMIN".equals(role)) {
            throw new BusinessRuleException("Rôle invalide : EMPLOYEE ou ADMIN attendu.");
        }
        if ("SUPERADMIN".equals(user.getRole().name())) {
            throw new BusinessRuleException("Le rôle d'un super administrateur ne peut pas être modifié.");
        }
        user.setRole(Role.valueOf(role));
        return UserResponse.from(userRepository.save(user));
    }

    @DeleteMapping("/users/{id}/")
    @Operation(summary = "Supprimer définitivement un compte")
    public ResponseEntity<Void> deleteUser(@AuthenticationPrincipal User admin, @PathVariable UUID id) {
        if (admin.getId().equals(id)) {
            throw new BusinessRuleException("Vous ne pouvez pas supprimer votre propre compte.");
        }
        User user = getUserEntity(id);
        if (user.isAdmin()) {
            throw new BusinessRuleException("Impossible de supprimer un compte administrateur.");
        }
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    private User getUserEntity(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }
}
