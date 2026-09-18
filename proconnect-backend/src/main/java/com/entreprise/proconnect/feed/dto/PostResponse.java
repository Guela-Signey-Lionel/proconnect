package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.Post;
import com.entreprise.proconnect.feed.PostType;
import com.entreprise.proconnect.feed.PostVisibility;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PostResponse(
        UUID id,
        AuthorResponse author,
        String content,
        PostType postType,
        PostVisibility visibility,
        List<PostAttachmentResponse> attachments,
        long likesCount,
        long commentsCount,
        boolean likedByMe,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostResponse from(Post post, long likesCount, long commentsCount, boolean likedByMe) {
        return new PostResponse(
                post.getId(), AuthorResponse.from(post.getAuthor()), post.getContent(),
                post.getPostType(), post.getVisibility(),
                post.getAttachments().stream().map(PostAttachmentResponse::from).toList(),
                likesCount, commentsCount, likedByMe, post.getCreatedAt(), post.getUpdatedAt()
        );
    }
}
