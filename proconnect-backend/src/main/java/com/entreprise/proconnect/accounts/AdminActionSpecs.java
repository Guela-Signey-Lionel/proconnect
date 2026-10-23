package com.entreprise.proconnect.accounts;

import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/**
 * Critères du journal d'administration (« Qui a fait quoi, quand ») : filtres
 * par auteur, cible et type d'action, facultatifs et combinables. Remplace le
 * JPQL à paramètres nullables du repository (source d'erreurs 500 avec
 * Hibernate 6 + PostgreSQL).
 */
public final class AdminActionSpecs {

    private AdminActionSpecs() {
    }

    public static Specification<AdminAction> byActor(UUID actorId) {
        return (root, query, cb) -> cb.equal(root.get("actor").get("id"), actorId);
    }

    public static Specification<AdminAction> byTarget(UUID targetUserId) {
        return (root, query, cb) -> cb.equal(root.get("targetUser").get("id"), targetUserId);
    }

    public static Specification<AdminAction> byType(AdminActionType actionType) {
        return (root, query, cb) -> cb.equal(root.get("actionType"), actionType);
    }
}
