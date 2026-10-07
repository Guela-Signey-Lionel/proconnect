package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * oldPassword est requis SAUF quand le serveur a posé mustChangePassword=true
 * (première connexion du compte bootstrap) : l'utilisateur est déjà authentifié
 * par un JWT valide, exiger l'ancien mot de passe temporaire n'apporte rien.
 */
public record ChangePasswordRequest(
        String oldPassword,
        @NotBlank @Size(min = 10) String newPassword
) {
}
