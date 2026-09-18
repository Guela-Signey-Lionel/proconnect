package com.entreprise.proconnect.messaging;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "messages", indexes = @Index(name = "idx_message_conversation_created", columnList = "conversation_id, createdAt"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Message extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(length = 5000)
    private String content;

    private String attachmentUrl;

    /** IMAGE, VIDEO, AUDIO ou FILE (tout autre format). */
    @Column(name = "attachment_type", length = 20)
    private String attachmentType;

    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    /** Taille en octets. */
    @Column(name = "attachment_size")
    private Long attachmentSize;

    /** Le message a été modifié par son auteur. */
    @Column(name = "is_edited", nullable = false)
    @lombok.Builder.Default
    private boolean isEdited = false;

    /** Instant de la dernière modification (null si jamais modifié). */
    private java.time.Instant editedAt;

    /** Suppression douce : le contenu est effacé mais la ligne reste (trace dans le fil). */
    @Column(name = "is_deleted", nullable = false)
    @lombok.Builder.Default
    private boolean isDeleted = false;
}
