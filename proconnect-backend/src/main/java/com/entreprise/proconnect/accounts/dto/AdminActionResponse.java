package com.entreprise.proconnect.accounts.dto;

import com.entreprise.proconnect.accounts.AdminAction;
import com.entreprise.proconnect.accounts.AdminActionType;
import java.time.Instant;
import java.util.UUID;

/** Entrée du journal des actions d'administration (onglet « Journal » du back-office). */
public record AdminActionResponse(
        UUID id,
        AdminActionType actionType,
        UUID actorId,
        String actorName,
        UUID targetUserId,
        String targetUserName,
        UUID objectId,
        String description,
        Instant createdAt
) {
    public static AdminActionResponse from(AdminAction action) {
        return new AdminActionResponse(
                action.getId(),
                action.getActionType(),
                action.getActor() != null ? action.getActor().getId() : null,
                action.getActor() != null ? action.getActor().getFullName() : null,
                action.getTargetUser() != null ? action.getTargetUser().getId() : null,
                // Pour les comptes supprimés (anonymisés), fullName affiche « Utilisateur Supprimé ».
                action.getTargetUser() != null ? action.getTargetUser().getFullName() : null,
                action.getObjectId(),
                action.getDescription(),
                action.getCreatedAt()
        );
    }
}
