-- Pièces jointes de la messagerie (images, vidéos, audio/vocal, documents — tout format).
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_size BIGINT;
