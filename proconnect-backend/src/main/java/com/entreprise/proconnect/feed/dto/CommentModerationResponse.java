package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.Comment;
import java.time.Instant;
import java.util.UUID;

/** Commentaire vu côté modération : statut de masquage + publication parente. */
public record CommentModerationResponse(
        UUID id,
        UUID postId,
        UUID postAuthorId,
        UUID parentId,
        AuthorResponse author,
        String content,
        String sticker,
        boolean hidden,
        Instant createdAt
) {
    public static CommentModerationResponse from(Comment c) {
        return new CommentModerationResponse(
                c.getId(),
                c.getPost().getId(),
                c.getPost().getAuthor().getId(),
                c.getParent() != null ? c.getParent().getId() : null,
                AuthorResponse.from(c.getAuthor()),
                c.getContent(),
                c.getSticker(),
                c.isHidden(),
                c.getCreatedAt()
        );
    }
}
