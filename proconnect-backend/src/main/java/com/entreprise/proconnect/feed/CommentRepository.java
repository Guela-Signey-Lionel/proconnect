package com.entreprise.proconnect.feed;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CommentRepository extends JpaRepository<Comment, UUID>, JpaSpecificationExecutor<Comment> {

    /** Commentaires visibles d'une publication (le fil n'affiche jamais les masqués). */
    Page<Comment> findByPostIdAndHiddenFalseOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    long countByPostId(UUID postId);

    long countByPostIdAndHiddenFalse(UUID postId);

    long countByParentId(UUID parentId);

    long countByAuthorId(UUID authorId);

    long countByHiddenTrue();
}
