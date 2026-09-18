package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Experience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record ExperienceDto(
        UUID id,
        @NotBlank String title,
        @NotBlank String company,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        String description
) {
    public static ExperienceDto from(Experience e) {
        return new ExperienceDto(e.getId(), e.getTitle(), e.getCompany(), e.getStartDate(), e.getEndDate(), e.getDescription());
    }
}
