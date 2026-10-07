package com.entreprise.proconnect.accounts;

/**
 * Statut de vie d'un compte :
 * - ACTIVE    : utilisation normale.
 * - SUSPENDED : connexion bloquée, données conservées, réactivable.
 * - BANNED    : connexion bloquée définitivement, données conservées.
 * - DELETED   : suppression LOGIQUE — données personnelles anonymisées mais les
 *               lignes (posts, messages, pièces jointes) restent pour ne pas
 *               casser les conversations et publications des autres utilisateurs.
 */
public enum UserStatus {
    ACTIVE,
    SUSPENDED,
    BANNED,
    DELETED
}
