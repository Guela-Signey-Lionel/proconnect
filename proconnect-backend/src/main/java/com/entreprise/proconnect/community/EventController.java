package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.community.dto.EventResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/events")
@Tag(name = "Événements")
public class EventController {

    private final EventRepository eventRepository;
    private final EventRegistrationRepository registrationRepository;

    public EventController(EventRepository eventRepository, EventRegistrationRepository registrationRepository) {
        this.eventRepository = eventRepository;
        this.registrationRepository = registrationRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Lister les événements à venir (paginé)")
    public PageResponse<EventResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String type,
            Pageable pageable
    ) {
        Page<Event> page = eventRepository.findAllByOrderByEventDateAsc(pageable);
        return PageResponse.from(page.map(e -> EventResponse.from(e, user)));
    }

    @GetMapping("/{id}/")
    @Operation(summary = "Détail d'un événement")
    public EventResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return EventResponse.from(getEvent(id), user);
    }

    @PostMapping("/{id}/register/")
    @Operation(summary = "S'inscrire à un événement")
    public ResponseEntity<EventResponse> register(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Event event = getEvent(id);
        if (!registrationRepository.existsByUserIdAndEventId(user.getId(), id)) {
            registrationRepository.save(EventRegistration.builder().user(user).event(event).build());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(EventResponse.from(event, user));
    }

    @PostMapping("/{id}/unregister/")
    @Operation(summary = "Annuler son inscription à un événement")
    public EventResponse unregister(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        registrationRepository.deleteByUserIdAndEventId(user.getId(), id);
        return EventResponse.from(getEvent(id), user);
    }

    private Event getEvent(UUID id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Événement introuvable."));
    }
}
