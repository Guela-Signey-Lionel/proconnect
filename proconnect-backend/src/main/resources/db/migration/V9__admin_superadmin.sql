-- V9__admin_superadmin.sql
-- Espace d'administration :
--  - Statut de vie du compte (ACTIVE / SUSPENDED / BANNED / DELETED) : la suppression
--    est LOGIQUE (données conservées pour ne pas casser les conversations existantes,
--    données personnelles anonymisées).
--  - Flag « mot de passe à changer » posé par le bootstrap du Superadmin.
--  - Date de dernière connexion (alimentée au login).
--  - Historique des avertissements envoyés par les administrateurs.

-- 1. Statut du compte + colonnes d'administration -------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. Historique des avertissements ----------------------------------------
CREATE TABLE IF NOT EXISTS admin_warnings (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issued_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    reason      VARCHAR(1000) NOT NULL,
    message     VARCHAR(4000),
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_warnings_user ON admin_warnings(user_id, created_at);
