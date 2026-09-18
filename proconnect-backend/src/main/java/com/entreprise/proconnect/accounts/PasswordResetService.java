package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.exception.BusinessRuleException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles password reset token lifecycle. Email delivery runs on Spring's @Async
 * executor so it never blocks the HTTP request (cahier des charges, section 18).
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final PasswordResetTokenRepository tokenRepository;
    private final JavaMailSender mailSender;

    public PasswordResetService(PasswordResetTokenRepository tokenRepository, JavaMailSender mailSender) {
        this.tokenRepository = tokenRepository;
        this.mailSender = mailSender;
    }

    @Transactional
    public void sendResetEmail(User user) {
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .used(false)
                .build();
        tokenRepository.save(resetToken);
        dispatchEmail(user.getEmail(), user.getFirstName(), resetToken.getToken());
    }

    @Async
    public void dispatchEmail(String toEmail, String firstName, String token) {
        try {
            String resetLink = "https://proconnect.example.com/reset-password?token=" + token;
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Réinitialisation de votre mot de passe ProConnect");
            message.setText("Bonjour " + firstName + ",\n\nCliquez sur ce lien pour réinitialiser votre mot de passe : " + resetLink);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Échec de l'envoi de l'email de réinitialisation à {}", toEmail, ex);
        }
    }

    @Transactional
    public User consumeToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new BusinessRuleException("Lien de réinitialisation invalide."));

        if (resetToken.isUsed() || resetToken.isExpired()) {
            throw new BusinessRuleException("Lien de réinitialisation invalide ou expiré.");
        }

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        return resetToken.getUser();
    }
}
