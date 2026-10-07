package com.entreprise.proconnect.feed;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    Page<Comment> findByPostIdOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    long countByPostId(UUID postId);

    long countByParentId(UUID parentId);

    long countByAuthorId(UUID authorId);
}
