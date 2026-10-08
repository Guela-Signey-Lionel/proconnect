-- V11__migrate_remaining_superadmin_roles.sql
--
-- Contexte : le rôle SUPERADMIN a été supprimé (V10 : retrait du compte
-- préconfiguré, de l'entrée d'enum Java et de la contrainte users_role_check).
-- Toutefois, d'autres comptes peuvent encore porter role = 'SUPERADMIN' en
-- base (comptes de test, données historiques). Hibernate échoue alors au
-- démarrage avec :
--   IllegalArgumentException: No enum constant ...accounts.Role.SUPERADMIN
--
-- Correctif : conversion des lignes restantes en ADMIN (droits préservés ;
-- ils restent ajustables depuis le back-office via PATCH /admin/{id}/role).

UPDATE users SET role = 'ADMIN' WHERE role = 'SUPERADMIN';
