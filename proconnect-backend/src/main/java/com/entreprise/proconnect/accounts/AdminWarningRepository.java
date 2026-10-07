package com.entreprise.proconnect.accounts;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminWarningRepository extends JpaRepository<AdminWarning, UUID> {

    Page<AdminWarning> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<AdminWarning> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
