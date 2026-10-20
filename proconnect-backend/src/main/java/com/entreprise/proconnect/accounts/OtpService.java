package com.entreprise.proconnect.accounts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cycle de vie du code OTP email : génération (hachée HMAC-SHA256), cooldown
 * anti-spam, vérification avec compteur de tentatives, purge des codes périmés.
 *
 * La vérification renvoie un booléen (pas d'exception) pour que le compteur
 * d'essais incrémenté soit bien persisté par la transaction.
 */
@Service
public class OtpService {

    private static final java.security.SecureRandom RNG = new java.security.SecureRandom();
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final EmailOtpRepository repository;
    private final OtpMailService mailService;

    @Value("${proconnect.otp.secret}")
    private String secret;

    public OtpService(EmailOtpRepository repository, OtpMailService mailService) {
        this.repository = repository;
        this.mailService = mailService;
    }

    /** Normalise l'email de la même façon que le reste de l'application. */
    private String normalize(String rawEmail) {
        return rawEmail == null ? "" : rawEmail.trim().toLowerCase();
    }

    /**
     * Génère et envoie un nouveau code. Anti-spam : si un code a déjà été envoyé
     * il y a moins de 60 s, on ignore la demande (réponse identique côté HTTP).
     */
    @Transactional
    public void request(String rawEmail) {
        String email = normalize(rawEmail);

        // Cooldown : pas plus d'un code par email et par minute.
        Optional<EmailOtp> last = repository.findTopByEmailOrderByCreatedAtDesc(email);
        if (last.isPresent()
                && last.get().getCreatedAt() != null
                && last.get().getCreatedAt().isAfter(Instant.now().minus(RESEND_COOLDOWN))) {
            return;
        }

        // Un seul code actif à la fois : les codes précédents deviennent inutilisables.
        repository.invalidateAll(email);

        String code = String.format("%06d", RNG.nextInt(1_000_000));
        EmailOtp otp = new EmailOtp();
        otp.setEmail(email);
        otp.setCodeHash(hash(code));
        otp.setExpiresAt(Instant.now().plus(TTL));
        otp.setAttempts(0);
        otp.setConsumed(false);
        repository.save(otp);

        // Envoi asynchrone ; le code n'est jamais loggé, même en debug.
        mailService.sendOtp(email, code);
    }

    /**
     * Vérifie le code et le consomme s'il est correct. Incrémente le compteur
     * d'essais à chaque tentative (force brute bloquée après MAX_ATTEMPTS).
     */
    @Transactional
    public boolean verify(String rawEmail, String code) {
        String email = normalize(rawEmail);

        Optional<EmailOtp> opt = repository.findTopByEmailOrderByCreatedAtDesc(email);
        if (opt.isEmpty()) {
            return false;
        }
        EmailOtp otp = opt.get();
        if (otp.isConsumed()
                || otp.getExpiresAt() == null
                || otp.getExpiresAt().isBefore(Instant.now())
                || otp.getAttempts() >= MAX_ATTEMPTS) {
            return false;
        }

        otp.setAttempts(otp.getAttempts() + 1);
        boolean ok = MessageDigest.isEqual(
                hash(code.trim()).getBytes(StandardCharsets.UTF_8),
                otp.getCodeHash().getBytes(StandardCharsets.UTF_8));
        if (ok) {
            otp.setConsumed(true);
        }
        // L'entité est dirty : la transaction committe le compteur / la consommation.
        return ok;
    }

    private String hash(String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(code.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de hacher le code OTP.", e);
        }
    }

    /** Nettoyage horaire des codes expirés depuis plus de 24 h. */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanup() {
        repository.deleteExpired(Instant.now().minus(Duration.ofDays(1)));
    }
}
