package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Education;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record EducationDto(
        UUID id,
        @NotBlank String school,
        @NotBlank String degree,
        @NotNull LocalDate startDate,
        LocalDate endDate
) {
    public static EducationDto from(Education e) {
        return new EducationDto(e.getId(), e.getSchool(), e.getDegree(), e.getStartDate(), e.getEndDate());
    }
}
