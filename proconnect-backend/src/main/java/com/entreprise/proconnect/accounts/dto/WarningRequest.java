package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Requête d'avertissement officiel envoyé à un utilisateur. */
public record WarningRequest(
        @NotBlank(message = "Le motif de l'avertissement est requis.")
        @Size(max = 1000, message = "Le motif ne doit pas dépasser 1000 caractères.")
        String reason,

        @Size(max = 4000, message = "Le message ne doit pas dépasser 4000 caractères.")
        String message
) {
}
