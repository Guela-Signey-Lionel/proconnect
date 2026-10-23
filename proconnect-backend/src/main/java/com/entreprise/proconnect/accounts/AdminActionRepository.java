package com.entreprise.proconnect.accounts;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminActionRepository
        extends JpaRepository<AdminAction, UUID>, JpaSpecificationExecutor<AdminAction> {

    Page<AdminAction> findByTargetUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByActorId(UUID actorId);
}
