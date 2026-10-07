package com.entreprise.proconnect.accounts.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        boolean mustChangePassword
) {
    public TokenResponse(String accessToken, String refreshToken) {
        this(accessToken, refreshToken, "Bearer", false);
    }

    public TokenResponse(String accessToken, String refreshToken, String tokenType) {
        this(accessToken, refreshToken, tokenType, false);
    }
}
