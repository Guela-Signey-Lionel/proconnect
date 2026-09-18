package com.entreprise.proconnect.feed.dto;

import java.util.UUID;

public record CommentCreateRequest(String content, String sticker, UUID parentId) {
}
