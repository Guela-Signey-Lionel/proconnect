-- V10__admin_backoffice.sql
-- Back-office d'administration :
--  - Suppression TOTALE du compte Superadmin préconfiguré (aucun compte par
--    défaut : les administrateurs sont créés depuis le back-office).
--  - Rôle MODERATOR (modération de contenu sans gestion des comptes).
--  - Journal des actions d'administration (qui a fait quoi, quand).
--  - Modération : masquage des commentaires (les posts ont déjà `hidden`).

-- 1. Suppression du compte Superadmin bootstrap ---------------------------
--    Le compte est supprimé physiquement : les FKs sensibles sont en
--    ON DELETE CASCADE (participants, connexions, likes, comments, messages,
--    notifications recipient) ou ON DELETE SET NULL (notifications.actor_id).
DELETE FROM users WHERE email = 'superadmin@proconnect.com';

-- 2. Rôle MODERATOR --------------------------------------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. Journal des actions d'administration ---------------------------------
CREATE TABLE IF NOT EXISTS admin_actions (
    id              UUID PRIMARY KEY,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type     VARCHAR(40) NOT NULL,
    object_id       UUID,
    description     VARCHAR(1000) NOT NULL,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor ON admin_actions(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type, created_at);

-- 4. Modération : masquage des commentaires -------------------------------
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_hidden ON comments(hidden);
