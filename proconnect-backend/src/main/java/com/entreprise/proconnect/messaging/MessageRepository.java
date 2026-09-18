package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId, Pageable pageable);

    Message findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    long countByConversationIdAndSenderNotAndCreatedAtAfter(UUID conversationId, User sender, Instant after);

    long countByConversationIdAndSenderNot(UUID conversationId, User sender);
}
