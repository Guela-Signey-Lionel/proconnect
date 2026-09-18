package com.entreprise.proconnect.community;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EventRepository extends JpaRepository<Event, UUID> {

    Page<Event> findAllByOrderByEventDateAsc(Pageable pageable);
}
