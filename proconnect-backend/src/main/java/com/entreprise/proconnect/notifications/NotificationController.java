package com.entreprise.proconnect.notifications;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.notifications.dto.NotificationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Mirrors apps/notifications/urls.py — mounted under /api/v1/notifications/. */
@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Lister mes notifications (unread=true pour les non lues seulement)")
    public PageResponse<NotificationResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, name = "unread") Boolean unreadOnly,
            Pageable pageable
    ) {
        Page<Notification> page = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByRecipientAndIsReadFalseOrderByCreatedAtDesc(user, pageable)
                : notificationRepository.findByRecipientOrderByCreatedAtDesc(user, pageable);
        return PageResponse.from(page.map(NotificationResponse::from));
    }

    @PostMapping("/{id}/read/")
    @Operation(summary = "Marquer une notification comme lue")
    public NotificationResponse markRead(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification introuvable."));
        if (!notification.getRecipient().getId().equals(user.getId())) {
            throw new BusinessRuleException("Cette notification ne vous appartient pas.");
        }
        notification.setRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    @PostMapping("/mark-all-read/")
    @Operation(summary = "Marquer toutes mes notifications comme lues")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal User user) {
        int updated = notificationRepository.markAllRead(user);
        return Map.of("markedRead", updated);
    }
}
