package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.accounts.UserRepository;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.messaging.dto.ConversationCreateRequest;
import com.entreprise.proconnect.messaging.dto.ConversationResponse;
import com.entreprise.proconnect.messaging.dto.MessageCreateRequest;
import com.entreprise.proconnect.messaging.dto.MessageResponse;
import com.entreprise.proconnect.messaging.dto.MessageTransferRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Mirrors apps/messaging/urls.py — mounted under /api/v1/messages/. REST for CRUD + history,
 *  STOMP (see WebSocketConfig) for the live push of new messages. */
@RestController
@RequestMapping("/api/v1/messages")
@Tag(name = "Messagerie")
public class MessagingController {

    private final MessagingService messagingService;
    private final UserRepository userRepository;
    private final com.entreprise.proconnect.feed.MediaStorageService mediaStorageService;

    public MessagingController(
            MessagingService messagingService,
            UserRepository userRepository,
            com.entreprise.proconnect.feed.MediaStorageService mediaStorageService
    ) {
        this.messagingService = messagingService;
        this.userRepository = userRepository;
        this.mediaStorageService = mediaStorageService;
    }

    @GetMapping("/conversations/")
    @Operation(summary = "Lister mes conversations (directes et de groupe)")
    public List<ConversationResponse> list(@AuthenticationPrincipal User user) {
        return messagingService.listForUser(user).stream()
                .map(c -> messagingService.toResponse(c, user))
                .toList();
    }

    @PostMapping("/conversations/")
    @Operation(summary = "Démarrer une conversation directe (participantId) ou de groupe (name + participantIds)")
    public ResponseEntity<ConversationResponse> create(
            @AuthenticationPrincipal User user, @jakarta.validation.Valid @RequestBody ConversationCreateRequest request
    ) {
        if (request.participantIds() != null && !request.participantIds().isEmpty()) {
            // Conversation de groupe
            List<User> members = request.participantIds().stream()
                    .map(id -> userRepository.findById(id)
                            .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable : " + id)))
                    .toList();
            Conversation conversation = messagingService.createGroupConversation(
                    user, request.name(), members
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(messagingService.toResponse(conversation, user));
        }
        User other = userRepository.findById(request.participantId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        Conversation conversation = messagingService.startDirectConversation(user, other);
        return ResponseEntity.status(HttpStatus.CREATED).body(messagingService.toResponse(conversation, user));
    }

    @GetMapping("/conversations/{id}/")
    @Operation(summary = "Détail d'une conversation")
    public ConversationResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        messagingService.assertParticipant(id, user);
        return messagingService.toResponse(messagingService.getById(id), user);
    }

    @GetMapping("/conversations/{id}/messages/")
    @Operation(summary = "Historique paginé des messages d'une conversation")
    public PageResponse<MessageResponse> history(
            @AuthenticationPrincipal User user, @PathVariable UUID id, Pageable pageable
    ) {
        Page<Message> page = messagingService.history(id, user, pageable);
        return PageResponse.from(page.map(MessageResponse::from));
    }

    @PostMapping("/conversations/{id}/messages/")
    @Operation(summary = "Envoyer un message dans une conversation")
    public ResponseEntity<MessageResponse> sendMessage(
            @AuthenticationPrincipal User user, @PathVariable UUID id, @RequestBody MessageCreateRequest request
    ) {
        Message message = messagingService.sendMessage(id, user, request.content(), null);
        return ResponseEntity.status(HttpStatus.CREATED).body(MessageResponse.from(message));
    }

    /**
     * Envoi d'un message avec pièce jointe : image, vidéo, audio (vocal), document —
     * tout format jusqu'à 100 Mo. Le fichier est stocké dans MinIO, ses métadonnées
     * en base ; la diffusion temps réel se fait ensuite via STOMP.
     */
    @PostMapping(value = "/conversations/{id}/messages/attachment/", consumes = "multipart/form-data")
    @Operation(summary = "Envoyer un message avec pièce jointe (image, vidéo, audio/vocal, document — 100 Mo max)")
    public ResponseEntity<MessageResponse> sendMessageWithAttachment(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "content", required = false) String content
    ) {
        String url = mediaStorageService.upload(file, "messaging");
        Message message = messagingService.sendMessage(
                id, user,
                (content == null || content.isBlank()) ? null : content,
                url,
                MessagingService.classifyAttachment(file.getContentType()),
                file.getOriginalFilename(),
                file.getSize()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(MessageResponse.from(message));
    }

    @PatchMapping("/messages/{messageId}/")
    @Operation(summary = "Modifier le texte d'un message (auteur uniquement)")
    public MessageResponse editMessage(
            @AuthenticationPrincipal User user, @PathVariable UUID messageId,
            @RequestBody MessageCreateRequest request
    ) {
        Message message = messagingService.editMessage(null, messageId, user, request.content());
        return MessageResponse.from(message);
    }

    @DeleteMapping("/messages/{messageId}/")
    @Operation(summary = "Supprimer un message (auteur uniquement)")
    public MessageResponse deleteMessage(
            @AuthenticationPrincipal User user, @PathVariable UUID messageId
    ) {
        Message message = messagingService.deleteMessage(null, messageId, user);
        return MessageResponse.from(message);
    }

    @PostMapping("/messages/{messageId}/transfer/")
    @Operation(summary = "Transférer un message vers une autre conversation")
    public ResponseEntity<MessageResponse> transferMessage(
            @AuthenticationPrincipal User user, @PathVariable UUID messageId,
            @RequestBody MessageTransferRequest request
    ) {
        Message message = messagingService.transferMessage(messageId, user, request.targetConversationId());
        return ResponseEntity.status(HttpStatus.CREATED).body(MessageResponse.from(message));
    }

    @DeleteMapping("/conversations/{id}/")
    @Operation(summary = "Supprimer une conversation (la retire de ma liste)")
    public ResponseEntity<Void> deleteConversation(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        messagingService.deleteConversation(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/conversations/{id}/mark-read/")
    @Operation(summary = "Marquer tous les messages d'une conversation comme lus")
    public Map<String, String> markRead(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        messagingService.markRead(id, user);
        return Map.of("detail", "Conversation marquée comme lue.");
    }
}
