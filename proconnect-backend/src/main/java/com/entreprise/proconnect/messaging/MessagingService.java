package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.messaging.dto.ConversationResponse;
import com.entreprise.proconnect.messaging.dto.MessageResponse;
import com.entreprise.proconnect.messaging.dto.ParticipantResponse;
import com.entreprise.proconnect.profiles.Profile;
import com.entreprise.proconnect.profiles.ProfileRepository;
import com.entreprise.proconnect.notifications.NotificationService;
import com.entreprise.proconnect.notifications.NotificationType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ProfileRepository profileRepository;

    public MessagingService(
            ConversationRepository conversationRepository,
            ConversationParticipantRepository participantRepository,
            MessageRepository messageRepository,
            NotificationService notificationService,
            SimpMessagingTemplate messagingTemplate,
            ProfileRepository profileRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.profileRepository = profileRepository;
    }

    public List<Conversation> listForUser(User user) {
        return conversationRepository.findAllForUser(user);
    }

    public Conversation getById(UUID id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable."));
    }

    public void assertParticipant(UUID conversationId, User user) {
        if (!conversationRepository.isParticipant(conversationId, user)) {
            throw new BusinessRuleException("Vous ne participez pas à cette conversation.");
        }
    }

    @Transactional
    public Conversation startDirectConversation(User initiator, User other) {
        if (initiator.getId().equals(other.getId())) {
            throw new BusinessRuleException("Impossible de démarrer une conversation avec soi-même.");
        }

        return conversationRepository.findDirectConversationBetween(initiator, other)
                .orElseGet(() -> {
                    Conversation conversation = conversationRepository.save(
                            Conversation.builder().isGroup(false).build()
                    );
                    participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(initiator).build());
                    participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(other).build());
                    return conversation;
                });
    }

    /** Création d'une conversation de groupe (2 participants minimum). */
    @Transactional
    public Conversation createGroupConversation(User initiator, String name, List<User> members) {
        if (name == null || name.isBlank()) {
            throw new BusinessRuleException("Le nom du groupe est obligatoire.");
        }
        if (members == null || members.isEmpty()) {
            throw new BusinessRuleException("Un groupe doit contenir au moins un autre membre.");
        }

        Conversation conversation = conversationRepository.save(
                Conversation.builder().isGroup(true).name(name.trim()).build()
        );
        participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(initiator).build());
        for (User member : members) {
            if (member.getId().equals(initiator.getId())) {
                continue; // jamais en double
            }
            participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(member).build());
        }
        return conversation;
    }

    /**
     * Supprime une conversation (pour l'utilisateur courant uniquement) :
     * le participant est retiré, l'entrée disparaît de sa liste ; la conversation
     * reste intacte pour les autres participants.
     */
    @Transactional
    public void deleteConversation(UUID conversationId, User user) {
        assertParticipant(conversationId, user);
        Conversation conversation = getById(conversationId);
        conversation.getParticipants().stream()
                .filter(p -> p.getUser().getId().equals(user.getId()))
                .findFirst()
                .ifPresent(participantRepository::delete);
    }

    public Page<Message> history(UUID conversationId, User user, Pageable pageable) {
        assertParticipant(conversationId, user);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId, pageable);
    }

    /** Modifie le texte d'un message (auteur uniquement, sans pièce jointe obligatoire). */
    @Transactional
    public Message editMessage(UUID conversationId, UUID messageId, User sender, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable."));
        if (conversationId != null && !message.getConversation().getId().equals(conversationId)) {
            throw new ResourceNotFoundException("Message introuvable dans cette conversation.");
        }
        if (!message.getSender().getId().equals(sender.getId())) {
            throw new BusinessRuleException("Seul l'auteur peut modifier ce message.");
        }
        if (message.isDeleted()) {
            throw new BusinessRuleException("Ce message a été supprimé.");
        }
        if (newContent == null || newContent.isBlank()) {
            throw new BusinessRuleException("Le contenu du message ne peut pas être vide.");
        }
        message.setContent(newContent.trim());
        message.setEditedAt(Instant.now());
        message.setEdited(true);
        Message saved = messageRepository.save(message);
        broadcastUpdate(saved);
        return saved;
    }

    /** Supprime un message (auteur uniquement). Suppression douce + broadcast. */
    @Transactional
    public Message deleteMessage(UUID conversationId, UUID messageId, User sender) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable."));
        if (conversationId != null && !message.getConversation().getId().equals(conversationId)) {
            throw new ResourceNotFoundException("Message introuvable dans cette conversation.");
        }
        if (!message.getSender().getId().equals(sender.getId())) {
            throw new BusinessRuleException("Seul l'auteur peut supprimer ce message.");
        }
        message.setDeleted(true);
        message.setContent(null);
        message.setAttachmentUrl(null);
        message.setAttachmentType(null);
        message.setAttachmentName(null);
        message.setAttachmentSize(null);
        Message saved = messageRepository.save(message);
        broadcastUpdate(saved);
        return saved;
    }

    /** Transfère un message (texte et/ou pièce jointe) vers une autre conversation. */
    @Transactional
    public Message transferMessage(UUID messageId, User sender, UUID targetConversationId) {
        Message source = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message introuvable."));
        assertParticipant(source.getConversation().getId(), sender);
        assertParticipant(targetConversationId, sender);
        if (source.isDeleted()) {
            throw new BusinessRuleException("Ce message a été supprimé.");
        }
        if ((source.getContent() == null || source.getContent().isBlank())
                && (source.getAttachmentUrl() == null || source.getAttachmentUrl().isBlank())) {
            throw new BusinessRuleException("Ce message ne contient rien à transférer.");
        }
        Conversation target = getById(targetConversationId);
        Message copy = messageRepository.save(
                Message.builder()
                        .conversation(target)
                        .sender(sender)
                        .content(source.getContent())
                        .attachmentUrl(source.getAttachmentUrl())
                        .attachmentType(source.getAttachmentType())
                        .attachmentName(source.getAttachmentName())
                        .attachmentSize(source.getAttachmentSize())
                        .build()
        );
        messagingTemplate.convertAndSend("/topic/conversations/" + targetConversationId, MessageResponse.from(copy));
        target.getParticipants().stream()
                .filter(p -> !p.getUser().getId().equals(sender.getId()))
                .forEach(p -> notificationService.notify(
                        p.getUser(), sender, NotificationType.NEW_MESSAGE, copy.getId(),
                        "Message transféré de " + sender.getFullName() + "."
                ));
        return copy;
    }

    /** Diffuse une mise à jour (édition / suppression) aux abonnés du topic. */
    private void broadcastUpdate(Message message) {
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + message.getConversation().getId(),
                MessageResponse.from(message)
        );
    }

    @Transactional
    public Message sendMessage(UUID conversationId, User sender, String content, String attachmentUrl) {
        return sendMessage(conversationId, sender, content, attachmentUrl, null, null, null);
    }

    /** Envoi direct par destinataire : crée (ou réutilise) la conversation 1-1 si besoin. */
    @Transactional
    public Message sendMessageToUser(User sender, User recipient, String content) {
        Conversation conversation = startDirectConversation(sender, recipient);
        return sendMessage(conversation.getId(), sender, content, null);
    }

    /**
     * Envoi d'un message avec pièce jointe optionnelle (image, vidéo, audio/vocal,
     * document — tout format). Diffusion temps réel via STOMP + notifications push.
     */
    @Transactional
    public Message sendMessage(
            UUID conversationId, User sender, String content, String attachmentUrl,
            String attachmentType, String attachmentName, Long attachmentSize
    ) {
        assertParticipant(conversationId, sender);
        // Un compte suspendu ou banni ne peut plus envoyer de messages.
        com.entreprise.proconnect.accounts.UserGuard.assertCanInteract(sender);
        if ((content == null || content.isBlank()) && (attachmentUrl == null || attachmentUrl.isBlank())) {
            throw new BusinessRuleException("Un message doit contenir du texte ou une pièce jointe.");
        }

        Conversation conversation = getById(conversationId);
        Message message = messageRepository.save(
                Message.builder()
                        .conversation(conversation)
                        .sender(sender)
                        .content(content)
                        .attachmentUrl(attachmentUrl)
                        .attachmentType(attachmentType)
                        .attachmentName(attachmentName)
                        .attachmentSize(attachmentSize)
                        .build()
        );

        // Broadcast over STOMP to everyone subscribed to this conversation's topic.
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, MessageResponse.from(message));

        conversation.getParticipants().stream()
                .filter(p -> !p.getUser().getId().equals(sender.getId()))
                .forEach(p -> notificationService.notify(
                        p.getUser(), sender, NotificationType.NEW_MESSAGE, message.getId(),
                        "Nouveau message de " + sender.getFullName() + "."
                ));

        return message;
    }

    /** Classification du type de pièce jointe à partir du MIME type. */
    public static String classifyAttachment(String contentType) {
        if (contentType == null) return "FILE";
        if (contentType.startsWith("image/")) return "IMAGE";
        if (contentType.startsWith("video/")) return "VIDEO";
        if (contentType.startsWith("audio/")) return "AUDIO";
        return "FILE";
    }

    @Transactional
    public void markRead(UUID conversationId, User user) {
        ConversationParticipant participant = participantRepository.findByConversationIdAndUser(conversationId, user)
                .orElseThrow(() -> new BusinessRuleException("Vous ne participez pas à cette conversation."));
        participant.setLastReadAt(Instant.now());
        participantRepository.save(participant);
    }

    public long unreadCount(Conversation conversation, User user) {
        return participantRepository.findByConversationIdAndUser(conversation.getId(), user)
                .map(p -> p.getLastReadAt() != null
                        ? messageRepository.countByConversationIdAndSenderNotAndCreatedAtAfter(conversation.getId(), user, p.getLastReadAt())
                        : messageRepository.countByConversationIdAndSenderNot(conversation.getId(), user))
                .orElse(0L);
    }

    public Message lastMessage(Conversation conversation) {
        return messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId());
    }

    /**
     * Sérialise une conversation en DTO. Doit rester appelée dans une transaction
     * ouverte : les collections LAZY (participants, user) sont initialisées ici,
     * à l'intérieur de la session Hibernate. C'était la cause du 500 sur
     * « Envoyer un message » (LazyInitializationException hors transaction).
     */
    @Transactional(readOnly = true)
    public ConversationResponse toResponse(Conversation conversation, User currentUser) {
        Conversation attached = conversationRepository.findById(conversation.getId())
                .orElse(conversation);
        attached.getParticipants().size(); // force l'initialisation de la collection LAZY
        attached.getParticipants().forEach(p -> p.getUser().getId()); // idem pour le user de chaque participant

        // Avatars des participants (1 requête batch au lieu de N).
        List<UUID> userIds = attached.getParticipants().stream()
                .map(p -> p.getUser().getId()).toList();
        Map<UUID, String> avatars = profileRepository.findByUserIdIn(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        p -> p.getUser().getId(),
                        p -> p.getAvatarUrl() == null ? "" : p.getAvatarUrl()
                ));
        // Téléphones des participants (1 requête batch, depuis les profils).
        Map<UUID, String> phones = profileRepository.findByUserIdIn(userIds).stream()
                .filter(p -> p.getPhone() != null && !p.getPhone().isBlank())
                .collect(java.util.stream.Collectors.toMap(
                        p -> p.getUser().getId(),
                        Profile::getPhone
                ));
        List<ParticipantResponse> participants = attached.getParticipants().stream()
                .map(p -> ParticipantResponse.from(
                        p.getUser(), avatars.get(p.getUser().getId()), phones.get(p.getUser().getId())
                ))
                .toList();        Message last = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(attached.getId());
        long unread = participantRepository.findByConversationIdAndUser(attached.getId(), currentUser)
                .map(p -> p.getLastReadAt() != null
                        ? messageRepository.countByConversationIdAndSenderNotAndCreatedAtAfter(attached.getId(), currentUser, p.getLastReadAt())
                        : messageRepository.countByConversationIdAndSenderNot(attached.getId(), currentUser))
                .orElse(0L);
        return ConversationResponse.of(attached, participants, last != null ? MessageResponse.from(last) : null, unread);
    }
}
