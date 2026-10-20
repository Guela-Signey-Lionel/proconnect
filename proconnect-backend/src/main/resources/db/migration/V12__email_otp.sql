-- Authentification par OTP email : codes à 6 chiffres hachés (HMAC-SHA256),
-- avec expiration, compteur de tentatives et flag de consommation.
CREATE TABLE email_otp (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    code_hash   VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0,
    consumed    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Recherche du dernier code pour un email (cooldown anti-spam + vérification).
CREATE INDEX idx_email_otp_email_created ON email_otp (email, created_at DESC);
-- Nettoyage horaire des codes périmés.
CREATE INDEX idx_email_otp_expires_at ON email_otp (expires_at);
