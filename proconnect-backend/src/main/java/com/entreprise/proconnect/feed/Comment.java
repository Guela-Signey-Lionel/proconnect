package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Comment extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @Column(length = 5000)
    private String content;

    private String sticker;

    /**
     * Modération : commentaire masqué du fil (cahier des charges — section
     * modération). Les données sont conservées pour l'historique et le
     * déréférencement est réversible (voir AdminModerationService).
     */
    @Column(nullable = false)
    @lombok.Builder.Default
    private boolean hidden = false;
}
