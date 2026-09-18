package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Certification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record CertificationDto(
        UUID id,
        @NotBlank String name,
        @NotBlank String issuer,
        @NotNull LocalDate issuedDate,
        LocalDate expiryDate
) {
    public static CertificationDto from(Certification c) {
        return new CertificationDto(c.getId(), c.getName(), c.getIssuer(), c.getIssuedDate(), c.getExpiryDate());
    }
}
