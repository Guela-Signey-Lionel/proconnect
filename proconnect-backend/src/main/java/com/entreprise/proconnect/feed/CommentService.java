package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.dto.CommentCreateRequest;
import com.entreprise.proconnect.notifications.NotificationService;
import com.entreprise.proconnect.notifications.NotificationType;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository, NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.notificationService = notificationService;
    }

    public Page<Comment> list(UUID postId, Pageable pageable) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId, pageable);
    }

    public long repliesCount(UUID commentId) {
        return commentRepository.countByParentId(commentId);
    }

    @Transactional
    public Comment create(UUID postId, User author, CommentCreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Publication introuvable."));

        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Commentaire parent introuvable."));
        }

        Comment comment = Comment.builder()
                .post(post).author(author).parent(parent)
                .content(request.content()).sticker(request.sticker())
                .build();
        comment = commentRepository.save(comment);

        if (!post.getAuthor().getId().equals(author.getId())) {
            notificationService.notify(
                    post.getAuthor(), author, NotificationType.POST_COMMENT, post.getId(),
                    author.getFullName() + " a commenté votre publication."
            );
        }
        return comment;
    }

    @Transactional
    public void delete(UUID commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Commentaire introuvable."));
        if (!comment.getAuthor().getId().equals(user.getId()) && !user.isAdmin()) {
            throw new BusinessRuleException("Seul l'auteur ou un administrateur peut supprimer ce commentaire.");
        }
        commentRepository.delete(comment);
    }
}
