package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Avertissement officiel envoyé par un administrateur à un utilisateur.
 * Conservé dans l'historique (visible dans le détail du compte côté admin).
 */
@Entity
@Table(name = "admin_warnings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AdminWarning extends BaseEntity {

    /** Utilisateur averti. */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Administrateur à l'origine de l'avertissement (null si compte admin supprimé). */
    @ManyToOne
    @JoinColumn(name = "issued_by")
    private User issuedBy;

    @Column(nullable = false, length = 1000)
    private String reason;

    /** Message officiel transmis (notification et/ou email). */
    @Column(length = 4000)
    private String message;
}
