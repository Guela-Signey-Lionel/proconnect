package com.entreprise.proconnect.feed;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PostRepository extends JpaRepository<Post, UUID>, JpaSpecificationExecutor<Post> {
    Page<Post> findByHiddenFalseOrderByCreatedAtDesc(Pageable pageable);

    Page<Post> findByAuthorIdAndHiddenFalseOrderByCreatedAtDesc(UUID authorId, Pageable pageable);

    long countByAuthorId(UUID authorId);

    long countByHiddenTrue();
}
