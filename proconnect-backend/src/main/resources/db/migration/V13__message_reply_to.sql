-- Réponse liée à un message : référence structurelle (clé vers le message visé)
-- au lieu d'une citation copiée dans le texte.
ALTER TABLE messages
    ADD COLUMN reply_to_id UUID NULL REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX idx_message_reply_to ON messages(reply_to_id);
