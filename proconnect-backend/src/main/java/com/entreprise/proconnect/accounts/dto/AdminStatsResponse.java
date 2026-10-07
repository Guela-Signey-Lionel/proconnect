package com.entreprise.proconnect.accounts.dto;

/** Statistiques de l'espace d'administration (utilisateurs + modération). */
public record AdminStatsResponse(
        long totalUsers,
        long newToday,
        long newLast7Days,
        long newLast30Days,
        long suspendedAccounts,
        long bannedAccounts,
        long deletedAccounts,
        long onlineNow,
        long moderatorCount,
        long adminCount,
        long hiddenPosts,
        long hiddenComments
) {
}
