package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LikeRepository extends JpaRepository<Like, UUID> {
    Optional<Like> findByPostAndUser(Post post, User user);

    long countByPost(Post post);

    boolean existsByPostAndUser(Post post, User user);
}
