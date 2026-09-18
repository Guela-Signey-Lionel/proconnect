package com.entreprise.proconnect.profiles.dto;

public record ProfileUpdateRequest(
        String jobTitle,
        String department,
        String bio,
        String location,
        String phone
) {
}
