package com.entreprise.proconnect.accounts;

import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.Comment;
import com.entreprise.proconnect.feed.CommentRepository;
import com.entreprise.proconnect.feed.Post;
import com.entreprise.proconnect.feed.PostRepository;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Modération de contenu (cahier des charges, section 2) : listing des publications
 * et commentaires (visibles et masqués, filtrables), masquage réversible,
 * restauration et suppression définitive. Chaque action est historisée dans le
 * journal d'administration (AdminAction).
 */
@Service
@Slf4j
public class AdminModerationService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final AdminActionRepository actionRepository;

    public AdminModerationService(
            PostRepository postRepository,
            CommentRepository commentRepository,
            AdminActionRepository actionRepository
    ) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.actionRepository = actionRepository;
    }

    /* ------------------------------- Listing ------------------------------- */

    /** Liste les publications pour modération : filtres texte et visibilité. */
    @Transactional(readOnly = true)
    public Page<Post> listPosts(String search, Boolean hidden, Pageable pageable) {
        Specification<Post> spec = Specification.where(null);
        if (search != null) {
            spec = spec.and((root, query, cb) -> cb.like(
                    cb.lower(root.get("content")), "%" + search.toLowerCase() + "%"));
        }
        if (hidden != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("hidden"), hidden));
        }
        return postRepository.findAll(spec, pageable);
    }

    /** Liste les commentaires pour modération : filtres texte, publication, visibilité. */
    @Transactional(readOnly = true)
    public Page<Comment> listComments(String search, UUID postId, Boolean hidden, Pageable pageable) {
        Specification<Comment> spec = Specification.where(null);
        if (search != null) {
            spec = spec.and((root, query, cb) -> cb.like(
                    cb.lower(root.get("content")), "%" + search.toLowerCase() + "%"));
        }
        if (postId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("post").get("id"), postId));
        }
        if (hidden != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("hidden"), hidden));
        }
        return commentRepository.findAll(spec, pageable);
    }

    /* ------------------------------ Posts ---------------------------------- */

    /** Masque une publication du fil (réversible) et journalise l'action. */
    @Transactional
    public void hidePost(User admin, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publication introuvable."));
        post.setHidden(true);
        postRepository.save(post);
        logAction(admin, AdminActionType.HIDE_POST, post.getAuthor(), postId, "Publication masquée du fil");
    }

    /** Restaure (affiche à nouveau) une publication masquée. */
    @Transactional
    public void unhidePost(User admin, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publication introuvable."));
        post.setHidden(false);
        postRepository.save(post);
        logAction(admin, AdminActionType.UNHIDE_POST, post.getAuthor(), postId, "Publication restaurée dans le fil");
    }

    /** Supprime DÉFINITIVEMENT une publication (et ses pièces jointes, likes, commentaires). */
    @Transactional
    public void deletePost(User admin, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publication introuvable."));
        postRepository.delete(post);
        logAction(admin, AdminActionType.DELETE_POST, post.getAuthor(), postId,
                "Publication supprimée définitivement — contenu : " + excerpt(post.getContent()));
    }

    /* ---------------------------- Commentaires ----------------------------- */

    /** Masque un commentaire (réversible) et journalise l'action. */
    @Transactional
    public void hideComment(User admin, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire introuvable."));
        comment.setHidden(true);
        commentRepository.save(comment);
        logAction(admin, AdminActionType.HIDE_COMMENT, comment.getAuthor(), commentId,
                "Commentaire masqué — contenu : " + excerpt(comment.getContent()));
    }

    /** Restaure (affiche à nouveau) un commentaire masqué. */
    @Transactional
    public void unhideComment(User admin, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire introuvable."));
        comment.setHidden(false);
        commentRepository.save(comment);
        logAction(admin, AdminActionType.UNHIDE_COMMENT, comment.getAuthor(), commentId,
                "Commentaire restauré");
    }

    /** Supprime DÉFINITIVEMENT un commentaire (et ses réponses). */
    @Transactional
    public void deleteComment(User admin, UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire introuvable."));
        commentRepository.delete(comment);
        logAction(admin, AdminActionType.DELETE_COMMENT, comment.getAuthor(), commentId,
                "Commentaire supprimé définitivement — contenu : " + excerpt(comment.getContent()));
    }

    /* ---------------------------- Utilitaires ------------------------------ */

    private static String excerpt(String content) {
        if (content == null) return "(vide)";
        String trimmed = content.trim();
        return trimmed.length() > 200 ? trimmed.substring(0, 200) + "…" : trimmed;
    }

    private void logAction(User admin, AdminActionType type, User target, UUID objectId, String description) {
        try {
            actionRepository.save(AdminAction.builder()
                    .actor(admin)
                    .targetUser(target)
                    .actionType(type)
                    .objectId(objectId)
                    .description(description != null && description.length() > 1000
                            ? description.substring(0, 1000)
                            : description)
                    .build());
        } catch (Exception ex) {
            log.warn("Impossible d'enregistrer l'action de modération {} dans le journal", type, ex);
        }
    }
}
