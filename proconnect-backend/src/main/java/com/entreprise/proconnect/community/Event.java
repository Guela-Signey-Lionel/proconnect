package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Événement interne (meetup, conférence, formation…). Couvre les données
 * affichées par la page Événements du frontend : titre, description, date,
 * lieu, type, image, organisateur, nombre de participants.
 */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Event extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 3000)
    private String description;

    @Column(nullable = false)
    private LocalDate eventDate;

    /** Ex. "18:30 - 22:00" */
    @Column(length = 50)
    private String time;

    @Column(nullable = false, length = 200)
    private String location;

    /** Networking, Conférence, Workshop… */
    @Column(length = 50)
    private String type;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 150)
    private String organizerName;

    @Column(length = 500)
    private String organizerLogoUrl;

    @Column(length = 500)
    private String tagsCsv;

    private int maxAttendees;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    public int attendeesCount() {
        return registrations.size();
    }

    // Populated via reverse mapping below to keep the entity simple.
    @jakarta.persistence.OneToMany(mappedBy = "event", fetch = jakarta.persistence.FetchType.LAZY)
    @lombok.Builder.Default
    private java.util.List<EventRegistration> registrations = new java.util.ArrayList<>();
}
