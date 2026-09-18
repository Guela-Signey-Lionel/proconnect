package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    Optional<Bookmark> findByUserIdAndPostId(UUID userId, UUID postId);

    boolean existsByUserIdAndPostId(UUID userId, UUID postId);

    void deleteByUserIdAndPostId(UUID userId, UUID postId);

    long countByPostId(UUID postId);

    java.util.List<Bookmark> findByUserOrderByCreatedAtDesc(User user);

    Page<Bookmark> findByUser(User user, Pageable pageable);
}
