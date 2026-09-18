package com.entreprise.proconnect.connections.dto;

import com.entreprise.proconnect.accounts.User;
import java.util.UUID;

public record UserLiteResponse(UUID id, String email, String firstName, String lastName) {
    public static UserLiteResponse from(User user) {
        return new UserLiteResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName());
    }
}
