package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("""
            SELECT DISTINCT c FROM Conversation c
            JOIN c.participants p
            WHERE p.user = :user
            ORDER BY c.createdAt DESC
            """)
    java.util.List<Conversation> findAllForUser(@Param("user") User user);

    @Query("""
            SELECT c FROM Conversation c
            WHERE c.isGroup = false
            AND EXISTS (SELECT 1 FROM ConversationParticipant p1 WHERE p1.conversation = c AND p1.user = :userA)
            AND EXISTS (SELECT 1 FROM ConversationParticipant p2 WHERE p2.conversation = c AND p2.user = :userB)
            """)
    Optional<Conversation> findDirectConversationBetween(@Param("userA") User userA, @Param("userB") User userB);

    @Query("""
            SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM ConversationParticipant p
            WHERE p.conversation.id = :conversationId AND p.user = :user
            """)
    boolean isParticipant(@Param("conversationId") UUID conversationId, @Param("user") User user);
}
