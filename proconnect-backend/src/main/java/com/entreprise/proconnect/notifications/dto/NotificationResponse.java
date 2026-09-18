package com.entreprise.proconnect.notifications.dto;

import com.entreprise.proconnect.notifications.Notification;
import com.entreprise.proconnect.notifications.NotificationType;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType notificationType,
        UUID objectId,
        String message,
        boolean isRead,
        UUID actorId,
        String actorName,
        Instant createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(), n.getNotificationType(), n.getObjectId(), n.getMessage(), n.isRead(),
                n.getActor() != null ? n.getActor().getId() : null,
                n.getActor() != null ? n.getActor().getFullName() : null,
                n.getCreatedAt()
        );
    }
}
