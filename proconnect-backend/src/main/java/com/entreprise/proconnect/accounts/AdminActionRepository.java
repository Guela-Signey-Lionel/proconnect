package com.entreprise.proconnect.accounts;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminActionRepository
        extends JpaRepository<AdminAction, UUID>, JpaSpecificationExecutor<AdminAction> {

    Page<AdminAction> findByTargetUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByActorId(UUID actorId);

    /**
     * Journal paginé avec filtres optionnels : auteur (qui), cible (sur qui),
     * type d'action. Tous les paramètres sont nullables (null = filtre ignoré).
     */
    @Query(
            """
            SELECT a FROM AdminAction a
            WHERE (:actorId IS NULL OR a.actor.id = :actorId)
              AND (:targetUserId IS NULL OR a.targetUser.id = :targetUserId)
              AND (:actionType IS NULL OR a.actionType = :actionType)
            """
    )
    Page<AdminAction> search(
            @Param("actorId") UUID actorId,
            @Param("targetUserId") UUID targetUserId,
            @Param("actionType") AdminActionType actionType,
            Pageable pageable
    );
}
