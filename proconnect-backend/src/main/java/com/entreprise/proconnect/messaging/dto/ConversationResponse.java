package com.entreprise.proconnect.messaging.dto;

import com.entreprise.proconnect.messaging.Conversation;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ConversationResponse(
        UUID id, boolean isGroup, String name, List<ParticipantResponse> participants,
        MessageResponse lastMessage, long unreadCount, Instant createdAt,
        /** Accusés de lecture : dernier instant où chaque participant a lu la conversation. */
        Map<UUID, Instant> readReceipts
) {
    public static ConversationResponse of(Conversation c, List<ParticipantResponse> participants, MessageResponse lastMessage, long unreadCount) {
        return of(c, participants, lastMessage, unreadCount, Map.of());
    }

    public static ConversationResponse of(
            Conversation c, List<ParticipantResponse> participants, MessageResponse lastMessage,
            long unreadCount, Map<UUID, Instant> readReceipts
    ) {
        return new ConversationResponse(c.getId(), c.isGroup(), c.getName(), participants, lastMessage, unreadCount, c.getCreatedAt(), readReceipts);
    }
}
