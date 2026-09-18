package com.entreprise.proconnect.connections.dto;

import com.entreprise.proconnect.connections.Block;
import java.time.Instant;
import java.util.UUID;

public record BlockResponse(UUID id, UserLiteResponse blocked, Instant createdAt) {
    public static BlockResponse from(Block block) {
        return new BlockResponse(block.getId(), UserLiteResponse.from(block.getBlocked()), block.getCreatedAt());
    }
}
