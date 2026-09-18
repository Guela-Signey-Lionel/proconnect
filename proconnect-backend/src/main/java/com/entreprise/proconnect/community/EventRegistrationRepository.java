package com.entreprise.proconnect.community;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, UUID> {

    Optional<EventRegistration> findByUserIdAndEventId(UUID userId, UUID eventId);

    boolean existsByUserIdAndEventId(UUID userId, UUID eventId);

    void deleteByUserIdAndEventId(UUID userId, UUID eventId);
}
