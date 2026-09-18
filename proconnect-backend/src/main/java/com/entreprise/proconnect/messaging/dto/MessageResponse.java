package com.entreprise.proconnect.messaging.dto;

import com.entreprise.proconnect.messaging.Message;
import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID conversationId,
        ParticipantResponse sender,
        String content,
        String attachmentUrl,
        String attachmentType,
        String attachmentName,
        Long attachmentSize,
        boolean isEdited,
        Instant editedAt,
        boolean isDeleted,
        Instant createdAt
) {
    public static MessageResponse from(Message m) {
        return from(m, false);
    }

    public static MessageResponse from(Message m, boolean hardDelete) {
        // Message supprimé : on ne divulgue plus le contenu ni la pièce jointe.
        if (m.isDeleted() && !hardDelete) {
            return new MessageResponse(
                    m.getId(), m.getConversation().getId(), ParticipantResponse.from(m.getSender()),
                    null, null, null, null, null,
                    m.isEdited(), m.getEditedAt(), true, m.getCreatedAt()
            );
        }
        return new MessageResponse(
                m.getId(), m.getConversation().getId(), ParticipantResponse.from(m.getSender()),
                m.getContent(), m.getAttachmentUrl(),
                m.getAttachmentType(), m.getAttachmentName(), m.getAttachmentSize(),
                m.isEdited(), m.getEditedAt(), m.isDeleted(), m.getCreatedAt()
        );
    }
}
