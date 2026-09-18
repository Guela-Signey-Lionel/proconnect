package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.Comment;
import java.time.Instant;
import java.util.UUID;

public record CommentResponse(
        UUID id, UUID postId, AuthorResponse author, UUID parentId, String content, String sticker,
        long repliesCount, Instant createdAt
) {
    public static CommentResponse from(Comment c, long repliesCount) {
        return new CommentResponse(
                c.getId(), c.getPost().getId(), AuthorResponse.from(c.getAuthor()),
                c.getParent() != null ? c.getParent().getId() : null,
                c.getContent(), c.getSticker(), repliesCount, c.getCreatedAt()
        );
    }
}
