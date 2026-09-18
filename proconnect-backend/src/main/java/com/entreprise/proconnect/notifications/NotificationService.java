package com.entreprise.proconnect.notifications;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.notifications.dto.NotificationResponse;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single entry point used by connections/feed/messaging to create a notification and
 * push it in real time — equivalent to notifications/services.py's notify() on the
 * Django side. Callers never need to know about STOMP/WebSocket directly.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public Notification notify(User recipient, User actor, NotificationType type, UUID objectId, String message) {
        Notification notification = notificationRepository.save(
                Notification.builder()
                        .recipient(recipient)
                        .actor(actor)
                        .notificationType(type)
                        .objectId(objectId)
                        .message(message)
                        .isRead(false)
                        .build()
        );

        // Push to the recipient's personal STOMP destination: /user/{email}/queue/notifications
        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/notifications",
                NotificationResponse.from(notification)
        );

        return notification;
    }
}
