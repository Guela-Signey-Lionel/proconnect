package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.FileValidationUtils;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.feed.dto.PostCreateRequest;
import com.entreprise.proconnect.feed.dto.PostUpdateRequest;
import com.entreprise.proconnect.notifications.NotificationService;
import com.entreprise.proconnect.notifications.NotificationType;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final PostAttachmentRepository attachmentRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;
    private final MediaStorageService mediaStorageService;
    private final NotificationService notificationService;

    @Value("${proconnect.uploads.max-image-mb:5}")
    private int maxImageMb;
    @Value("${proconnect.uploads.max-document-mb:20}")
    private int maxDocumentMb;
    @Value("${proconnect.uploads.max-video-mb:100}")
    private int maxVideoMb;

    private static final List<String> IMAGE_EXTENSIONS = List.of("jpg", "jpeg", "png", "gif", "webp");
    private static final List<String> DOCUMENT_EXTENSIONS = List.of("pdf", "docx", "xlsx", "pptx", "txt");
    private static final List<String> VIDEO_EXTENSIONS = List.of("mp4", "mov", "webm");

    public PostService(
            PostRepository postRepository,
            PostAttachmentRepository attachmentRepository,
            LikeRepository likeRepository,
            CommentRepository commentRepository,
            MediaStorageService mediaStorageService,
            NotificationService notificationService
    ) {
        this.postRepository = postRepository;
        this.attachmentRepository = attachmentRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.mediaStorageService = mediaStorageService;
        this.notificationService = notificationService;
    }

    public Page<Post> listFeed(Pageable pageable) {
        return postRepository.findByHiddenFalseOrderByCreatedAtDesc(pageable);
    }

    public Page<Post> listByAuthor(UUID authorId, Pageable pageable) {
        return postRepository.findByAuthorIdAndHiddenFalseOrderByCreatedAtDesc(authorId, pageable);
    }

    public Post getById(UUID id) {
        return postRepository.findById(id).filter(p -> !p.isHidden())
                .orElseThrow(() -> new ResourceNotFoundException("Publication introuvable."));
    }

    @Transactional
    public Post create(User author, PostCreateRequest request) {
        Post post = Post.builder()
                .author(author)
                .content(request.content())
                .postType(request.postType() != null ? request.postType() : PostType.TEXT)
                .visibility(request.visibility() != null ? request.visibility() : PostVisibility.EVERYONE)
                .hidden(false)
                .build();
        return postRepository.save(post);
    }

    @Transactional
    public Post update(UUID postId, User user, PostUpdateRequest request) {
        Post post = getById(postId);
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new BusinessRuleException("Seul le propriétaire peut modifier cette publication.");
        }
        if (request.content() != null) {
            post.setContent(request.content());
        }
        // Retrait des pièces jointes demandées (édition d'une publication déjà publiée).
        if (request.removeAttachmentIds() != null && !request.removeAttachmentIds().isEmpty()) {
            post.getAttachments().removeIf(
                    a -> request.removeAttachmentIds().contains(a.getId())
            );
        }
        // Le type de la publication suit toujours ses pièces jointes réelles.
        post.setPostType(derivePostType(post));
        return postRepository.save(post);
    }

    /**
     * Recalcule le type d'une publication d'après ses pièces jointes :
     * IMAGE / VIDEO / DOCUMENT si un seul type, MIXED si plusieurs, TEXT sinon.
     */
    public static PostType derivePostType(Post post) {
        List<AttachmentType> types = post.getAttachments().stream()
                .map(PostAttachment::getAttachmentType)
                .distinct()
                .toList();
        if (types.isEmpty()) {
            return PostType.TEXT;
        }
        if (types.size() > 1) {
            return PostType.MIXED;
        }
        return switch (types.get(0)) {
            case IMAGE -> PostType.IMAGE;
            case VIDEO -> PostType.VIDEO;
            case DOCUMENT -> PostType.DOCUMENT;
        };
    }

    /** Recalcule le type et synchronise l'entité (appelé après chaque ajout de pièce jointe). */
    private void refreshPostType(Post post) {
        post.setPostType(derivePostType(post));
        postRepository.save(post);
    }

    @Transactional
    public void delete(UUID postId, User user) {
        Post post = getById(postId);
        if (!post.getAuthor().getId().equals(user.getId()) && !user.isAdmin()) {
            throw new BusinessRuleException("Seul le propriétaire ou un administrateur peut supprimer cette publication.");
        }
        postRepository.delete(post);
    }

    @Transactional
    public long like(UUID postId, User user) {
        Post post = getById(postId);
        boolean alreadyLiked = likeRepository.existsByPostAndUser(post, user);
        if (!alreadyLiked) {
            likeRepository.save(Like.builder().post(post).user(user).build());
            if (!post.getAuthor().getId().equals(user.getId())) {
                notificationService.notify(
                        post.getAuthor(), user, NotificationType.POST_LIKE, post.getId(),
                        user.getFullName() + " a aimé votre publication."
                );
            }
        }
        return likeRepository.countByPost(post);
    }

    @Transactional
    public long unlike(UUID postId, User user) {
        Post post = getById(postId);
        likeRepository.findByPostAndUser(post, user).ifPresent(likeRepository::delete);
        return likeRepository.countByPost(post);
    }

    public boolean isLikedByUser(UUID postId, User user) {
        return likeRepository.existsByPostAndUser(getById(postId), user);
    }

    public long likesCount(Post post) {
        return likeRepository.countByPost(post);
    }

    public long commentsCount(Post post) {
        return commentRepository.countByPostId(post.getId());
    }

    @Transactional
    public PostAttachment addAttachment(UUID postId, User user, MultipartFile file, AttachmentType type) {
        Post post = getById(postId);
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new BusinessRuleException("Seul l'auteur peut ajouter une pièce jointe.");
        }

        switch (type) {
            case IMAGE -> {
                FileValidationUtils.validateExtension(file, IMAGE_EXTENSIONS);
                FileValidationUtils.validateSize(file, maxImageMb);
            }
            case VIDEO -> {
                FileValidationUtils.validateExtension(file, VIDEO_EXTENSIONS);
                FileValidationUtils.validateSize(file, maxVideoMb);
            }
            default -> {
                FileValidationUtils.validateExtension(file, DOCUMENT_EXTENSIONS);
                FileValidationUtils.validateSize(file, maxDocumentMb);
            }
        }

        String url = mediaStorageService.upload(file, "posts/" + postId);
        PostAttachment attachment = PostAttachment.builder()
                .post(post)
                .fileUrl(url)
                .fileName(file.getOriginalFilename())
                .attachmentType(type)
                .sizeBytes(file.getSize())
                .build();
        attachment = attachmentRepository.save(attachment);
        refreshPostType(post);
        return attachment;
    }
}
