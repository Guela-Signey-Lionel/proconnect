package com.entreprise.proconnect.feed;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, UUID> {
    Page<Post> findByHiddenFalseOrderByCreatedAtDesc(Pageable pageable);

    Page<Post> findByAuthorIdAndHiddenFalseOrderByCreatedAtDesc(UUID authorId, Pageable pageable);
}
