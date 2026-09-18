package com.entreprise.proconnect.community.dto;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.community.Event;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record EventResponse(
        UUID id,
        String title,
        String description,
        LocalDate date,
        String time,
        String location,
        String type,
        String image,
        String organizerName,
        String organizerLogo,
        List<String> tags,
        int attendees,
        Integer maxAttendees,
        boolean isRegistered,
        String price
) {
    public static EventResponse from(Event e, User currentUser) {
        boolean registered = currentUser != null
                && e.getRegistrations().stream().anyMatch(r -> r.getUser().getId().equals(currentUser.getId()));
        List<String> tags = e.getTagsCsv() == null || e.getTagsCsv().isBlank()
                ? List.of()
                : Arrays.asList(e.getTagsCsv().split(","));
        return new EventResponse(
                e.getId(), e.getTitle(), e.getDescription(), e.getEventDate(), e.getTime(),
                e.getLocation(), e.getType(), e.getImageUrl(), e.getOrganizerName(), e.getOrganizerLogoUrl(),
                tags.stream().map(String::trim).toList(),
                e.attendeesCount(), e.getMaxAttendees() > 0 ? e.getMaxAttendees() : null,
                registered, "Gratuit"
        );
    }
}
