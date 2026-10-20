package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Corps de POST /api/v1/auth/otp/request/ — demande d'un code de connexion par email. */
public record OtpRequest(
        @Email @NotBlank String email
) {}
