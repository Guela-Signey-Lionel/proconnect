package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, UUID> {
    Optional<ConversationParticipant> findByConversationIdAndUser(UUID conversationId, User user);
}
