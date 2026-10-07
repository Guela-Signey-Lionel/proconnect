-- V8__user_last_seen.sql
-- Suivi de présence : date du dernier « heartbeat » envoyé par le frontend.
-- Un utilisateur est considéré EN LIGNE si last_seen_at est postérieur
-- à (now - 2 minutes) — seuil côté application (User#isOnline).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Les requêtes de présence filtrent sur cette colonne à chaque heartbeat.
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);
