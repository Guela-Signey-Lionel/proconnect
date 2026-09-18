-- Photo de couverture du profil (comme la bannière LinkedIn).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url VARCHAR(1000);
