package com.entreprise.proconnect.community;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupPostRepository extends JpaRepository<GroupPost, UUID> {

    java.util.List<GroupPost> findByGroupIdOrderByCreatedAtDesc(UUID groupId);
}
