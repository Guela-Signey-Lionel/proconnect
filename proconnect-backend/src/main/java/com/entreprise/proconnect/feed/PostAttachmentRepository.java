package com.entreprise.proconnect.feed;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostAttachmentRepository extends JpaRepository<PostAttachment, UUID> {
}
