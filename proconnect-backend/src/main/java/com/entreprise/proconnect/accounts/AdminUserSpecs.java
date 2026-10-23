package com.entreprise.proconnect.accounts;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * Critères de recherche du back-office (listing des comptes) : recherche texte
 * (email / prénom / nom), statut, période d'inscription et période de dernière
 * connexion. Chaque filtre est optionnel — les spécifications composent
 * dynamiquement les prédicats, sans paramètre JPQL nullable (incompatible
 * PostgreSQL, source d'erreurs 500 sur GET /admin/users/).
 */
public final class AdminUserSpecs {

    private AdminUserSpecs() {
    }

    /** Texte libre : correspond à l'email, au prénom ou au nom (insensible à la casse). */
    public static Specification<User> search(String search) {
        return (root, query, cb) -> {
            String q = search == null || search.isBlank() ? null : search.trim().toLowerCase();
            if (q == null) return cb.conjunction();
            String pattern = "%" + q + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("email")), pattern),
                    cb.like(cb.lower(root.get("firstName")), pattern),
                    cb.like(cb.lower(root.get("lastName")), pattern)
            );
        };
    }

    public static Specification<User> hasStatus(UserStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<User> createdAtAfter(Instant from) {
        return (root, query, cb) ->
                from == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<User> createdAtBefore(Instant to) {
        return (root, query, cb) ->
                to == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    public static Specification<User> lastLoginAfter(Instant from) {
        return (root, query, cb) ->
                from == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get("lastLoginAt"), from);
    }

    public static Specification<User> lastLoginBefore(Instant to) {
        return (root, query, cb) ->
                to == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("lastLoginAt"), to);
    }

    /** Combine tous les filtres (null = ignoré) en une seule spécification. */
    public static Specification<User> adminSearch(
            String search, UserStatus status,
            Instant registeredFrom, Instant registeredTo,
            Instant lastLoginFrom, Instant lastLoginTo
    ) {
        List<Specification<User>> parts = List.of(
                search(search), hasStatus(status),
                createdAtAfter(registeredFrom), createdAtBefore(registeredTo),
                lastLoginAfter(lastLoginFrom), lastLoginBefore(lastLoginTo)
        );
        Specification<User> combined = null;
        for (Specification<User> part : parts) {
            combined = combined == null ? part : combined.and(part);
        }
        return combined;
    }
}
