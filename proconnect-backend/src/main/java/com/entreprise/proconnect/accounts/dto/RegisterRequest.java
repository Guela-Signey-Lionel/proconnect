package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank @Size(min = 10, message = "Le mot de passe doit contenir au moins 10 caractères.") String password,
        @Pattern(regexp = "^$|^[+0-9 ()\\-.]{6,30}$", message = "Numéro de téléphone invalide.")
        String phone
) {
}
