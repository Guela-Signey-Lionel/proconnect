package com.entreprise.proconnect.accounts;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Envoi asynchrone du code OTP par email. Comme pour PasswordResetService,
 * l'envoi tourne sur l'exécuteur @Async (AsyncConfig) pour ne pas bloquer la
 * requête HTTP. Le code lui-même n'est JAMAIS loggé.
 */
@Service
public class OtpMailService {

    private static final Logger log = LoggerFactory.getLogger(OtpMailService.class);

    private final JavaMailSender mailSender;

    @Value("${proconnect.otp.mail-from:${spring.mail.username:}}")
    private String from;

    public OtpMailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendOtp(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (from != null && !from.isBlank()) {
                message.setFrom(from);
            }
            message.setTo(to);
            message.setSubject("Votre code de connexion ProConnect");
            message.setText("""
                    Votre code de connexion est : %s

                    Il expire dans 10 minutes.
                    Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.
                    """.formatted(code));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Échec de l'envoi du code OTP à {}", to, ex);
        }
    }
}
