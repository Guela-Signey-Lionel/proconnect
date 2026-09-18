package com.entreprise.proconnect.community.dto;

import com.entreprise.proconnect.community.Story;
import java.time.Instant;
import java.util.UUID;

public record StoryResponse(
        UUID id,
        UUID userId,
        String userName,
        String userAvatar,
        String userTitle,
        String image,
        String caption,
        Instant createdAt,
        boolean viewed
) {
    public static StoryResponse from(Story s) {
        return new StoryResponse(
                s.getId(),
                s.getAuthor().getId(),
                s.getAuthor().getFullName(),
                null,
                null,
                s.getImageUrl(),
                s.getCaption(),
                s.getCreatedAt(),
                false
        );
    }
}
