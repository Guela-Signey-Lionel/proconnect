-- Rattrapage : crée un profil pour chaque utilisateur actif sans profil,
-- afin que tous les comptes soient visibles dans /api/v1/profiles
-- (recherche, suggestions, réseau) pour les autres utilisateurs.
-- UUID généré via md5() : aucune extension requise.
INSERT INTO profiles (id, user_id, created_at, updated_at)
SELECT md5(random()::text || clock_timestamp()::text)::uuid, u.id, now(), now()
FROM users u
WHERE u.active = true
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id);
