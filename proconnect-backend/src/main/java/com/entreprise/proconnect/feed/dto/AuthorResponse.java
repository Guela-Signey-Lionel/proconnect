package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.accounts.User;
import java.util.UUID;

public record AuthorResponse(UUID id, String fullName, String email) {
    public static AuthorResponse from(User user) {
        return new AuthorResponse(user.getId(), user.getFullName(), user.getEmail());
    }
}
