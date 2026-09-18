package com.entreprise.proconnect.messaging.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

/**
 * Création de conversation :
 * - directe : {@code participantId} renseigné
 * - groupe  : {@code name} + {@code participantIds} renseignés
 */
public record ConversationCreateRequest(UUID participantId, String name, List<UUID> participantIds) {
}
