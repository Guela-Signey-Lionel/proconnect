package com.entreprise.proconnect.connections;

import com.entreprise.proconnect.accounts.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlockRepository extends JpaRepository<Block, UUID> {
    boolean existsByBlockerAndBlocked(User blocker, User blocked);

    List<Block> findByBlocker(User blocker);
}
