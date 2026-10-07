package com.entreprise.proconnect.accounts;

/**
 * Rôles des comptes :
 * - EMPLOYEE  : compte standard (aucun accès au back-office).
 * - MODERATOR : accès au back-office limité à la modération de contenu
 *               (masquage/suppression de publications et commentaires).
 * - ADMIN     : gestion complète des utilisateurs + modération.
 *
 * Il n'existe plus de compte « superadmin » préconfiguré : l'administration
 * s'appuie uniquement sur des comptes ADMIN/MODERATOR créés et gérés depuis
 * le back-office (aucun identifiant par défaut dans le code ni dans Git).
 */
public enum Role {
    EMPLOYEE,
    MODERATOR,
    ADMIN
}
