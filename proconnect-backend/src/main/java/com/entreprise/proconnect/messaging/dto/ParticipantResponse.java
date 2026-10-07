package com.entreprise.proconnect.messaging.dto;

import com.entreprise.proconnect.accounts.User;
import java.util.UUID;

public record ParticipantResponse(
        UUID id, String email, String firstName, String lastName, String avatarUrl, String phone,
        boolean online
) {

    public static ParticipantResponse from(User user) {
        return from(user, null, null);
    }

    public static ParticipantResponse from(User user, String avatarUrl) {
        return from(user, avatarUrl, null);
    }

    public static ParticipantResponse from(User user, String avatarUrl, String phone) {
        return from(user, avatarUrl, phone, user != null && user.isOnline());
    }

    public static ParticipantResponse from(User user, String avatarUrl, String phone, boolean online) {
        return new ParticipantResponse(
                user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), avatarUrl, phone, online
        );
    }
}
