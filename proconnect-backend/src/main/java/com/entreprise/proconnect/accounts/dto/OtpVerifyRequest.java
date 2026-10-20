package com.entreprise.proconnect.accounts.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Corps de POST /api/v1/auth/otp/verify/ — soumission du code à 6 chiffres reçu par email. */
public record OtpVerifyRequest(
        @Email @NotBlank String email,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Le code doit contenir exactement 6 chiffres") String code
) {}
