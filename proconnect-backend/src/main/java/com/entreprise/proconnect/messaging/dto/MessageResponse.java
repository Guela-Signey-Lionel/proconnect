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
        Instant createdAt,
        /** Message visé par la réponse (référence réelle — jamais copiée dans le texte). */
        UUID replyToId,
        String replyToSenderName,
        String replyToContent,
        boolean replyToHasAttachment
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
                    m.isEdited(), m.getEditedAt(), true, m.getCreatedAt(),
                    null, null, null, false
            );
        }
        Message reply = m.getReplyTo();
        boolean replyDeleted = reply != null && reply.isDeleted();
        return new MessageResponse(
                m.getId(), m.getConversation().getId(), ParticipantResponse.from(m.getSender()),
                m.getContent(), m.getAttachmentUrl(),
                m.getAttachmentType(), m.getAttachmentName(), m.getAttachmentSize(),
                m.isEdited(), m.getEditedAt(), m.isDeleted(), m.getCreatedAt(),
                reply != null ? reply.getId() : null,
                reply != null ? reply.getSender().getFullName() : null,
                replyDeleted || reply == null ? null : excerpt(reply.getContent(), 140),
                reply != null && !replyDeleted && reply.getAttachmentUrl() != null
        );
    }

    private static String excerpt(String content, int max) {
        if (content == null) return null;
        String flat = content.replaceAll("\\s*\\n+\\s*", " ").trim();
        return flat.length() > max ? flat.substring(0, max) + "…" : flat;
    }
}
