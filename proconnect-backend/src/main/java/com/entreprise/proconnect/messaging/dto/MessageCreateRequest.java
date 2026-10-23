package com.entreprise.proconnect.messaging.dto;

import java.util.UUID;

/**
 * Corps d'envoi de message. `replyToId` : id du message visé (optionnel) —
 * la réponse est associée à CE message en base, jamais copiée dans le texte.
 */
public record MessageCreateRequest(String content, UUID replyToId) {
}
