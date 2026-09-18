package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.AttachmentType;
import com.entreprise.proconnect.feed.PostAttachment;
import java.util.UUID;

public record PostAttachmentResponse(UUID id, String fileUrl, String fileName, AttachmentType attachmentType, long sizeBytes) {
    public static PostAttachmentResponse from(PostAttachment a) {
        return new PostAttachmentResponse(a.getId(), a.getFileUrl(), a.getFileName(), a.getAttachmentType(), a.getSizeBytes());
    }
}
