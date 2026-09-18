package com.entreprise.proconnect.connections.dto;

import com.entreprise.proconnect.connections.Connection;
import com.entreprise.proconnect.connections.ConnectionStatus;
import java.time.Instant;
import java.util.UUID;

public record ConnectionResponse(
        UUID id, UserLiteResponse requester, UserLiteResponse addressee,
        ConnectionStatus status, Instant createdAt, Instant respondedAt
) {
    public static ConnectionResponse from(Connection c) {
        return new ConnectionResponse(
                c.getId(), UserLiteResponse.from(c.getRequester()), UserLiteResponse.from(c.getAddressee()),
                c.getStatus(), c.getCreatedAt(), c.getRespondedAt()
        );
    }
}
