package com.entreprise.proconnect.accounts;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);

    /**
     * Mise à jour du « heartbeat » de présence : UPDATE direct (aucun SELECT
     * préalable, aucun dirty-checking) — appelé toutes les 60 s par chaque client.
     * L'instant est passé en paramètre typé : Hibernate 6 type CURRENT_TIMESTAMP
     * en TIMESTAMP, incompatible avec le champ Instant (erreur de validation JPQL).
     */
    @Modifying
    @Query("UPDATE User u SET u.lastSeenAt = :now WHERE u.id = :id")
    void touchLastSeen(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Ids des utilisateurs en ligne (heartbeat de moins de 2 minutes) parmi une
     * collection donnée — un seul appel SQL pour toutes les listes du frontend.
     */
    @Query("SELECT u.id FROM User u WHERE u.id IN :ids AND u.lastSeenAt > :threshold")
    List<UUID> findOnlineIds(@Param("ids") Collection<UUID> ids, @Param("threshold") java.time.Instant threshold);

    boolean existsByEmail(String email);

    Page<User> findByActiveTrue(Pageable pageable);

    java.util.List<User> findByActiveTrue();

    @Query(
            """
            SELECT u FROM User u
            WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
            """
    )
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    long countByStatus(UserStatus status);

    long countByStatusNot(UserStatus status);

    long countByStatusNotAndRoleNot(UserStatus status, Role role);

    long countByRole(Role role);

    long countByRoleAndStatusNot(Role role, UserStatus status);

    long countByCreatedAtAfter(Instant after);

    long countByLastSeenAtAfter(Instant after);

}
