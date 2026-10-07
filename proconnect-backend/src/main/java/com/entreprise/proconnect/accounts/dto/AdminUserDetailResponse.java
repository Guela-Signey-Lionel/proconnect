package com.entreprise.proconnect.accounts.dto;

import com.entreprise.proconnect.accounts.AdminWarning;
import com.entreprise.proconnect.accounts.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Détail d'un compte côté administration : profil, activité, avertissements reçus. */
public record AdminUserDetailResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        String role,
        String status,
        boolean active,
        boolean mustChangePassword,
        Instant createdAt,
        Instant lastLoginAt,
        Instant lastSeenAt,
        // --- Profil ---
        String avatarUrl,
        String jobTitle,
        String department,
        String location,
        String phone,
        String bio,
        // --- Activité ---
        long postsCount,
        long commentsCount,
        long messagesCount,
        // --- Avertissements ---
        List<WarningResponse> warnings
) {
    public record WarningResponse(
            UUID id,
            String reason,
            String message,
            UUID issuedById,
            String issuedByName,
            Instant createdAt
    ) {
        public static WarningResponse from(AdminWarning w) {
            return new WarningResponse(
                    w.getId(), w.getReason(), w.getMessage(),
                    w.getIssuedBy() != null ? w.getIssuedBy().getId() : null,
                    w.getIssuedBy() != null ? w.getIssuedBy().getFullName() : null,
                    w.getCreatedAt()
            );
        }
    }

    public static AdminUserDetailResponse from(
            User user, com.entreprise.proconnect.profiles.Profile profile,
            List<AdminWarning> warnings, long posts, long comments, long messages
    ) {
        return new AdminUserDetailResponse(
                user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getFullName(), user.getRole().name(), user.getStatus().name(),
                user.isActive(), user.isMustChangePassword(),
                user.getCreatedAt(), user.getLastLoginAt(), user.getLastSeenAt(),
                profile != null ? profile.getAvatarUrl() : null,
                profile != null ? profile.getJobTitle() : null,
                profile != null ? profile.getDepartment() : null,
                profile != null ? profile.getLocation() : null,
                profile != null ? profile.getPhone() : null,
                profile != null ? profile.getBio() : null,
                posts, comments, messages,
                warnings.stream().map(WarningResponse::from).toList()
        );
    }
}
