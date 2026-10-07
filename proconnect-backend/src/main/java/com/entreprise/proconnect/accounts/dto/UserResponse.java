package com.entreprise.proconnect.accounts.dto;

import com.entreprise.proconnect.accounts.Role;
import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.accounts.UserStatus;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        Role role,
        boolean active,
        UserStatusResponse status,
        boolean mustChangePassword,
        Instant lastLoginAt,
        Instant createdAt,
        String avatarUrl
) {
    /** Statut exposé au frontend (évite l'import direct de l'enum interne). */
    public enum UserStatusResponse { ACTIVE, SUSPENDED, BANNED, DELETED }

    public static UserResponse from(User user) {
        return from(user, null);
    }

    public static UserResponse from(User user, String avatarUrl) {
        return new UserResponse(
                user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getRole(), user.isActive(),
                UserStatusResponse.valueOf(user.getStatus().name()),
                user.isMustChangePassword(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                avatarUrl
        );
    }
}
