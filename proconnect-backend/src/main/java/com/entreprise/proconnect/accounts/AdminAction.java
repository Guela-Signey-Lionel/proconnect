package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * Journal des actions d'administration (cahier des charges — Logs & Sécurité) :
 * chaque action sensible du back-office est historisée avec son auteur, sa cible,
 * son type et sa description. Consultable dans l'onglet « Journal » de l'espace
 * d'administration (qui a fait quoi, quand).
 */
@Entity
@Table(name = "admin_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AdminAction extends BaseEntity {

    /** Administrateur à l'origine de l'action (null si son compte est supprimé). */
    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    /** Compte ciblé par l'action, s'il y en a un (null pour une action sur du contenu). */
    @ManyToOne
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    /** Type d'action : WARN, SUSPEND, REACTIVATE, BAN, SOFT_DELETE, ROLE_CHANGE, PASSWORD_RESET, HIDE_POST, UNHIDE_POST, DELETE_POST, HIDE_COMMENT, DELETE_COMMENT. */
    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 40)
    private AdminActionType actionType;

    /** Id de l'objet concerné (post, commentaire…) pour les actions de modération. */
    @Column(name = "object_id")
    private UUID objectId;

    /** Détail lisible : motif, ancien/nouveau rôle, etc. */
    @Column(nullable = false, length = 1000)
    private String description;
}
