package com.entreprise.proconnect.feed.dto;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record PostUpdateRequest(
        @Size(max = 10000, message = "Le contenu dépasse la taille maximale autorisée.") String content,
        /** Ids des pièces jointes à retirer de la publication (optionnel). */
        List<UUID> removeAttachmentIds
) {
}
