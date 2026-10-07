package com.entreprise.proconnect.accounts;

/** Types d'actions historisées dans le journal d'administration (admin_actions). */
public enum AdminActionType {
    WARN,
    SUSPEND,
    REACTIVATE,
    BAN,
    SOFT_DELETE,
    ROLE_CHANGE,
    PASSWORD_RESET,
    HIDE_POST,
    UNHIDE_POST,
    DELETE_POST,
    HIDE_COMMENT,
    UNHIDE_COMMENT,
    DELETE_COMMENT
}
