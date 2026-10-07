package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Présence (statut « en ligne »).
 *
 * - POST /api/v1/presence/heartbeat/ : le client l'appelle toutes les 60 s tant
 *   que l'onglet est ouvert ; le serveur note l'heure dans users.last_seen_at.
 * - GET  /api/v1/presence/statuses/?userIds=... : statut par lot pour rafraîchir
 *   les points verts affichés côté frontend.
 */
@RestController
@RequestMapping("/api/v1/presence")
@Tag(name = "Présence (en ligne)")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/heartbeat/")
    @Operation(summary = "Enregistrer mon heartbeat de présence (appelé toutes les 60 s par le client)")
    public Map<String, Boolean> heartbeat(@AuthenticationPrincipal User user) {
        presenceService.heartbeat(user);
        return Map.of("online", true);
    }

    @GetMapping("/statuses/")

    @Operation(summary = "Statut en ligne par lot (ids utilisateurs, max 500)")
    public Map<UUID, Boolean> statuses(@RequestParam("userIds") List<UUID> userIds) {
        if (userIds.size() > 500) {
            userIds = userIds.subList(0, 500);
        }
        return presenceService.onlineByUserIds(userIds);
    }
}
