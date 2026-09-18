package com.entreprise.proconnect.messaging.dto;

import java.util.UUID;

/** Corps de la requête de transfert d'un message vers une autre conversation. */
public record MessageTransferRequest(UUID targetConversationId) {
}
