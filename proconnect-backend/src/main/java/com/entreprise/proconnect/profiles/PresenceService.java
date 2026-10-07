package com.entreprise.proconnect.profiles;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.accounts.UserRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suivi de présence (utilisateur en ligne).
 *
 * Le client envoie un « heartbeat » toutes les 60 s via POST /api/v1/presence/heartbeat.
 * Un utilisateur est considéré EN LIGNE si son last_seen_at date de moins de
 * 2 minutes (voir User#isOnline) — aucun état à activer/désactiver : le statut
 * est dérivé, ce qui évite les sessions fantômes après un crash du client.
 */
@Service
@RequiredArgsConstructor
public class PresenceService {

    private final UserRepository userRepository;

    /** Enregistre le heartbeat de l'utilisateur connecté (UPDATE ciblé, sans SELECT). */
    @Transactional
    public void heartbeat(User user) {
        userRepository.touchLastSeen(user.getId(), Instant.now());
    }

    /**
     * Statut en ligne par lot (1 requête) pour une collection d'ids utilisateurs.
     * Sert aux listes (répertoire, participants, connexions) sans requête N+1.
     */
    @Transactional(readOnly = true)
    public Map<UUID, Boolean> onlineByUserIds(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<UUID> distinct = userIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Boolean> result = new HashMap<>();
        for (UUID id : distinct) {
            result.put(id, Boolean.FALSE);
        }
        userRepository.findOnlineIds(distinct, Instant.now().minusSeconds(120))
                .forEach(id -> result.put(id, Boolean.TRUE));
        return result;
    }
}
