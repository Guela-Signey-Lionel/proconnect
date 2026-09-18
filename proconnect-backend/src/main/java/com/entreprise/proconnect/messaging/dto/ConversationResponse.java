package com.entreprise.proconnect.messaging.dto;

import com.entreprise.proconnect.messaging.Conversation;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConversationResponse(
        UUID id, boolean isGroup, String name, List<ParticipantResponse> participants,
        MessageResponse lastMessage, long unreadCount, Instant createdAt
) {
    public static ConversationResponse of(Conversation c, List<ParticipantResponse> participants, MessageResponse lastMessage, long unreadCount) {
        return new ConversationResponse(c.getId(), c.isGroup(), c.getName(), participants, lastMessage, unreadCount, c.getCreatedAt());
    }
}
