package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Profile;
import java.util.List;
import java.util.UUID;

public record ProfileResponse(
        UUID id,
        UUID userId,
        String fullName,
        String email,
        String avatarUrl,
        String coverUrl,
        String jobTitle,
        String department,
        String bio,
        String location,
        String phone,
        boolean online,
        List<SkillDto> skills,
        List<ExperienceDto> experiences,
        List<EducationDto> education,
        List<CertificationDto> certifications
) {
    public static ProfileResponse from(Profile p) {
        return new ProfileResponse(
                p.getId(), p.getUser().getId(), p.getUser().getFullName(), p.getUser().getEmail(),
                p.getAvatarUrl(), p.getCoverUrl(), p.getJobTitle(), p.getDepartment(), p.getBio(), p.getLocation(), p.getPhone(),
                p.getUser() != null && p.getUser().isOnline(),
                p.getSkills().stream().map(SkillDto::from).toList(),
                p.getExperiences().stream().map(ExperienceDto::from).toList(),
                p.getEducation().stream().map(EducationDto::from).toList(),
                p.getCertifications().stream().map(CertificationDto::from).toList()
        );
    }
}
