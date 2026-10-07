package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.Post;
import com.entreprise.proconnect.feed.PostType;
import com.entreprise.proconnect.feed.PostVisibility;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Publication vue côté modération : auteur enrichi + statut de masquage. */
public record PostModerationResponse(
        UUID id,
        AuthorResponse author,
        String content,
        PostType postType,
        PostVisibility visibility,
        boolean hidden,
        List<PostAttachmentResponse> attachments,
        long visibleCommentsCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostModerationResponse from(Post post, long visibleCommentsCount) {
        return new PostModerationResponse(
                post.getId(),
                AuthorResponse.from(post.getAuthor()),
                post.getContent(),
                post.getPostType(),
                post.getVisibility(),
                post.isHidden(),
                post.getAttachments().stream().map(PostAttachmentResponse::from).toList(),
                visibleCommentsCount,
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
