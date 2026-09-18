package com.entreprise.proconnect.profiles.dto;

import com.entreprise.proconnect.profiles.Profile;
import java.util.UUID;

public record ProfileSummaryResponse(
        UUID id, UUID userId, String fullName, String email, String avatarUrl, String jobTitle, String department
) {
    public static ProfileSummaryResponse from(Profile p) {
        return new ProfileSummaryResponse(
                p.getId(), p.getUser().getId(), p.getUser().getFullName(), p.getUser().getEmail(),
                p.getAvatarUrl(), p.getJobTitle(), p.getDepartment()
        );
    }
}
