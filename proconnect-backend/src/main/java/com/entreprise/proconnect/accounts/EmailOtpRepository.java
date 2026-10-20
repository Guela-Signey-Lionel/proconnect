package com.entreprise.proconnect.accounts;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    /** Dernier code généré pour un email (cooldown anti-spam + vérification). */
    Optional<EmailOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    /** Invalide tous les codes encore valides d'un email (un seul code actif à la fois). */
    @Modifying
    @Query("update EmailOtp o set o.consumed = true where o.email = :email and o.consumed = false")
    void invalidateAll(@Param("email") String email);

    /** Purge des codes périmés (nettoyage planifié). */
    @Modifying
    @Query("delete from EmailOtp o where o.expiresAt < :limit")
    void deleteExpired(@Param("limit") Instant limit);
}
