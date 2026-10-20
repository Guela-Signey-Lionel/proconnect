package com.entreprise.proconnect.accounts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Code à usage unique (OTP) envoyé par email : le code brut n'est JAMAIS stocké,
 * seulement son HMAC-SHA256. Voir OtpService pour le cycle de vie.
 */
@Entity
@Table(name = "email_otp")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class EmailOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Email normalisé (trim + lowercase) du destinataire. */
    @Column(nullable = false)
    private String email;

    /** HMAC-SHA256 hexadécimal du code à 6 chiffres. */
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Nombre de codes proposés (vérifications) — bloque la force brute au-delà de MAX_ATTEMPTS. */
    @Column(nullable = false)
    private int attempts = 0;

    @Column(nullable = false)
    private boolean consumed = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
