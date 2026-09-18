package com.entreprise.proconnect.community;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {

    Optional<JobApplication> findByUserIdAndJobId(UUID userId, UUID jobId);

    boolean existsByUserIdAndJobId(UUID userId, UUID jobId);

    void deleteByUserIdAndJobId(UUID userId, UUID jobId);

    long countByJobId(UUID jobId);
}
