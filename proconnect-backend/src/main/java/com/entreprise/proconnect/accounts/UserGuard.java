package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.exception.BusinessRuleException;

/**
 * Verrou technique appliqué à toute interaction productrice de contenu
 * (publications, commentaires, messages) : un compte SUSPENDED ou BANNED ne
 * peut plus agir sur la plateforme, même s'il disposait encore d'un JWT valide.
 * La connexion elle-même est déjà bloquée (User#isEnabled).
 */
public final class UserGuard {

    private UserGuard() {
    }

    public static void assertCanInteract(User user) {
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new BusinessRuleException("Votre compte est suspendu : cette action est impossible.");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new BusinessRuleException("Votre compte est banni : cette action est impossible.");
        }
    }
}
