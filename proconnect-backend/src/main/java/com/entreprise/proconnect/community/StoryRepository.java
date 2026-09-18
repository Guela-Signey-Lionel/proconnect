package com.entreprise.proconnect.community;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findByExpiresAtAfterOrderByCreatedAtDesc(Instant now);

    List<Story> findByAuthorIdAndExpiresAtAfterOrderByCreatedAtDesc(UUID authorId, Instant now);
}
