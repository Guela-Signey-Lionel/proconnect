package com.entreprise.proconnect.accounts.dto;

import com.entreprise.proconnect.accounts.Role;
import com.entreprise.proconnect.accounts.User;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        Role role,
        boolean active,
        Instant createdAt,
        String avatarUrl
) {
    public static UserResponse from(User user) {
        return from(user, null);
    }

    public static UserResponse from(User user, String avatarUrl) {
        return new UserResponse(
                user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getRole(), user.isActive(), user.getCreatedAt(), avatarUrl
        );
    }
}
