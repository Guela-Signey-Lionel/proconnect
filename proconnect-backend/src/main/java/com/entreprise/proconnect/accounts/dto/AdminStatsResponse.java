package com.entreprise.proconnect.accounts.dto;

/** Statistiques de l'espace d'administration. */
public record AdminStatsResponse(
        long totalUsers,
        long newToday,
        long newLast7Days,
        long newLast30Days,
        long suspendedAccounts,
        long bannedAccounts,
        long deletedAccounts,
        long onlineNow
) {
}
