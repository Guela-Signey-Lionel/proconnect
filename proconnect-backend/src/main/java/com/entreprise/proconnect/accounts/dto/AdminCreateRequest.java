package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Création d'un compte d'administration (premier admin ou admin supplémentaire). */
public record AdminCreateRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 10, max = 72) String password,
        @NotBlank @Size(max = 150) String firstName,
        @NotBlank @Size(max = 150) String lastName
) {
}
