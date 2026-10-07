package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Custom user entity — created from day one, per the cahier des charges (section 7).
 * Implements Spring Security's UserDetails directly.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @lombok.Builder.Default
    private Role role = Role.EMPLOYEE;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean staff = false;

    /**
     * Statut de vie du compte : la suppression est LOGIQUE (DELETED) — les messages
     * et publications déjà échangés sont conservés pour ne pas casser les
     * conversations des autres utilisateurs (les données personnelles sont
     * anonymisées). Voir AdminService.anonymizeAndMarkDeleted.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @lombok.Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    /** Mot de passe à changer à la prochaine connexion (posé par le bootstrap admin). */
    @Column(name = "must_change_password", nullable = false)
    @lombok.Builder.Default
    private boolean mustChangePassword = false;

    /** Dernière connexion réussie (alimentée par AccountService.authenticate). */
    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /**
     * Dernier « heartbeat » de présence reçu du client (voir PresenceService).
     * Null = jamais connecté (ou compte créé avant cette fonctionnalité).
     */
    private Instant lastSeenAt;

    /** Statut de présence dérivé de lastSeenAt (aucun état persisté à maintenir). */
    public boolean isOnline() {
        // Le client envoie un heartbeat toutes les 60 s ; marge à 2 minutes.
        return lastSeenAt != null && lastSeenAt.isAfter(Instant.now().minusSeconds(120));
    }

    public String getFullName() {
        return (firstName + " " + lastName).trim();
    }

    public boolean isAdmin() {
        return role == Role.ADMIN || role == Role.SUPERADMIN || staff;
    }

    // --- UserDetails ---------------------------------------------------

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        // mustChangePassword ne doit PAS bloquer l'authentification : le contrat
        // de /auth/login/ est d'aboutir et de renvoyer le flag au client, qui
        // force alors l'écran de changement de mot de passe (AccountService
        // .changePassword lève ensuite le flag). Renvoyer !mustChangePassword
        // ici provoquait une CredentialsExpiredException transformée en
        // « Identifiants invalides. » : auto-blocage du compte superadmin créé
        // par le bootstrap à sa première connexion.
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Un compte SUSPENDED / BANNED / DELETED ne peut plus se connecter,
        // mais ses données restent en base (suppression logique).
        return active && status == UserStatus.ACTIVE;
    }
}
