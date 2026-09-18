package com.entreprise.proconnect.connections;

import com.entreprise.proconnect.accounts.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConnectionRepository extends JpaRepository<Connection, UUID> {

    @Query("""
            SELECT c FROM Connection c
            WHERE (c.requester = :user OR c.addressee = :user)
            AND (:status IS NULL OR c.status = :status)
            ORDER BY c.createdAt DESC
            """)
    List<Connection> findAllForUser(@Param("user") User user, @Param("status") ConnectionStatus status);

    @Query("""
            SELECT c FROM Connection c
            WHERE ((c.requester = :userA AND c.addressee = :userB) OR (c.requester = :userB AND c.addressee = :userA))
            AND c.status IN (com.entreprise.proconnect.connections.ConnectionStatus.PENDING, com.entreprise.proconnect.connections.ConnectionStatus.ACCEPTED)
            """)
    Optional<Connection> findActiveBetween(@Param("userA") User userA, @Param("userB") User userB);

    /** Invitation EN ATENTE envoyée de « from » vers « to » (sens unique précis). */
    @Query("""
            SELECT c FROM Connection c
            WHERE c.requester = :from AND c.addressee = :to
            AND c.status = com.entreprise.proconnect.connections.ConnectionStatus.PENDING
            """)
    Optional<Connection> findPendingFromTo(@Param("from") User from, @Param("to") User to);
}
