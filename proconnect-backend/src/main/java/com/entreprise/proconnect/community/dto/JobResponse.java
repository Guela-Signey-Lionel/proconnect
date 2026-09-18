package com.entreprise.proconnect.community.dto;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.community.Job;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record JobResponse(
        UUID id,
        String title,
        String company,
        String companyLogo,
        String location,
        String type,
        String salary,
        String description,
        List<String> requirements,
        List<String> skills,
        String category,
        long applicants,
        boolean isApplied,
        boolean isSaved,
        String postedAt
) {
    public static JobResponse from(Job j, User currentUser) {
        boolean applied = currentUser != null
                && j.getApplications().stream().anyMatch(a -> a.getUser().getId().equals(currentUser.getId()));
        List<String> requirements = j.getRequirementsText() == null || j.getRequirementsText().isBlank()
                ? List.of()
                : Arrays.asList(j.getRequirementsText().split("\\n"));
        List<String> skills = j.getSkillsCsv() == null || j.getSkillsCsv().isBlank()
                ? List.of()
                : Arrays.asList(j.getSkillsCsv().split(","));
        return new JobResponse(
                j.getId(), j.getTitle(), j.getCompany(), j.getCompanyLogoUrl(),
                j.getLocation(), j.getContractType(), j.getSalary(), j.getDescription(),
                requirements.stream().map(String::trim).toList(),
                skills.stream().map(String::trim).toList(),
                j.getCategory(),
                j.getApplications().size(),
                applied,
                false, // isSaved n'est plus géré côté serveur (page Sauvegardés limitée aux posts/événements)
                relativeDate(j.getCreatedAt())
        );
    }

    private static String relativeDate(java.time.Instant instant) {
        long days = java.time.Duration.between(instant, java.time.Instant.now()).toDays();
        if (days <= 0) return "Aujourd'hui";
        if (days == 1) return "Il y a 1 jour";
        if (days < 7) return "Il y a " + days + " jours";
        if (days < 14) return "Il y a 1 semaine";
        if (days < 30) return "Il y a " + (days / 7) + " semaines";
        return "Il y a " + (days / 30) + " mois";
    }
}
