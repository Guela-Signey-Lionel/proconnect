-- V3__admin_seed.sql
-- Compte administrateur préconfiguré : admin@proconnect.com / Admin@2026
-- Le mot de passe est stocké haché (BCrypt) — généré avec spring-security-crypto.

INSERT INTO users (id, email, password, first_name, last_name, role, active, staff, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@proconnect.com',
    '$2a$10$tFr/AlxYoeBxc..IuAryU.P2QACuiCvWOmddlARphtFFt7FG0yysW',
    'Admin',
    'ProConnect',
    'ADMIN',
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, user_id, job_title, department, bio, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Administrateur de la plateforme',
    'Direction Générale',
    'Compte administrateur de ProConnect.',
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO NOTHING;
