package com.entreprise.proconnect.feed;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.PageResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.feed.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Mirrors apps/feed/urls.py — mounted under /api/v1/feed/.
 *
 * @Transactional requis sur les méthodes qui sérialisent des entités :
 * open-in-view est désactivé, donc les collections LAZY (pièces jointes des
 * publications) doivent être initialisées dans une session Hibernate ouverte —
 * sinon LazyInitializationException et un fil d'actualité qui ne s'affiche plus.
 */
@RestController
@RequestMapping("/api/v1/feed")
@Tag(name = "Fil d'actualité")
public class FeedController {

    private final PostService postService;
    private final CommentService commentService;
    private final BookmarkRepository bookmarkRepository;

    public FeedController(PostService postService, CommentService commentService, BookmarkRepository bookmarkRepository) {
        this.postService = postService;
        this.commentService = commentService;
        this.bookmarkRepository = bookmarkRepository;
    }

    @GetMapping("/posts/")
    @Transactional(readOnly = true)
    @Operation(summary = "Fil d'actualité paginé (auteur optionnel : ?author=UUID)")
    public PageResponse<PostResponse> list(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID author,
            Pageable pageable
    ) {
        Page<Post> page = author != null ? postService.listByAuthor(author, pageable) : postService.listFeed(pageable);
        return PageResponse.from(page.map(post -> toResponse(post, user)));
    }

    @PostMapping("/posts/")
    @Transactional
    @Operation(summary = "Créer une publication (texte, visibilité optionnelle)")
    public ResponseEntity<PostResponse> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody PostCreateRequest request
    ) {
        Post post = postService.create(user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(post, user));
    }

    @GetMapping("/posts/{id}/")
    @Transactional(readOnly = true)
    @Operation(summary = "Détail d'une publication")
    public PostResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return toResponse(postService.getById(id), user);
    }

    @PatchMapping("/posts/{id}/")
    @Transactional
    @Operation(summary = "Modifier sa propre publication")
    public PostResponse update(
            @AuthenticationPrincipal User user, @PathVariable UUID id, @Valid @RequestBody PostUpdateRequest request
    ) {
        return toResponse(postService.update(id, user, request), user);
    }

    @DeleteMapping("/posts/{id}/")
    @Operation(summary = "Supprimer sa propre publication")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        postService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/like/")
    @Operation(summary = "Aimer une publication")
    public LikeResponse like(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        long count = postService.like(id, user);
        return new LikeResponse(true, count);
    }

    @PostMapping("/posts/{id}/unlike/")
    @Operation(summary = "Ne plus aimer une publication")
    public LikeResponse unlike(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        long count = postService.unlike(id, user);
        return new LikeResponse(false, count);
    }

    @PostMapping(value = "/posts/{id}/attachments/", consumes = "multipart/form-data")
    @Operation(summary = "Joindre un fichier (image, document ou vidéo) à une publication")
    public ResponseEntity<PostAttachmentResponse> addAttachment(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(name = "attachment_type", defaultValue = "DOCUMENT") AttachmentType attachmentType
    ) {
        PostAttachment attachment = postService.addAttachment(id, user, file, attachmentType);
        return ResponseEntity.status(HttpStatus.CREATED).body(PostAttachmentResponse.from(attachment));
    }

    @GetMapping("/posts/{postId}/comments/")
    @Operation(summary = "Lister les commentaires d'une publication (paginé)")
    public PageResponse<CommentResponse> listComments(@PathVariable UUID postId, Pageable pageable) {
        return PageResponse.from(
                commentService.list(postId, pageable)
                        .map(comment -> CommentResponse.from(comment, commentService.repliesCount(comment.getId())))
        );
    }

    @PostMapping("/posts/{postId}/comments/")
    @Operation(summary = "Commenter une publication (texte ou sticker)")
    public ResponseEntity<CommentResponse> createComment(
            @AuthenticationPrincipal User user, @PathVariable UUID postId, @RequestBody CommentCreateRequest request
    ) {
        if ((request.content() == null || request.content().isBlank()) && (request.sticker() == null || request.sticker().isBlank())) {
            throw new BusinessRuleException("Un commentaire doit contenir du texte ou un sticker.");
        }
        Comment comment = commentService.create(postId, user, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(CommentResponse.from(comment, 0));
    }

    @DeleteMapping("/comments/{id}/")
    @Operation(summary = "Supprimer son propre commentaire")
    public ResponseEntity<Void> deleteComment(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        commentService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    // --- Bookmarks ("Enregistré") ---------------------------------------

    @PostMapping("/posts/{id}/bookmark/")
    @Operation(summary = "Enregistrer une publication dans mes favoris")
    public ResponseEntity<Void> bookmark(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Post post = postService.getById(id);
        if (!bookmarkRepository.existsByUserIdAndPostId(user.getId(), post.getId())) {
            bookmarkRepository.save(Bookmark.builder().user(user).post(post).build());
        }
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/posts/{id}/bookmark/")
    @Operation(summary = "Retirer une publication de mes favoris")
    public ResponseEntity<Void> unbookmark(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        bookmarkRepository.deleteByUserIdAndPostId(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookmarks/")
    @Transactional(readOnly = true)
    @Operation(summary = "Lister mes publications enregistrées (paginé)")
    public PageResponse<PostResponse> listBookmarks(@AuthenticationPrincipal User user, Pageable pageable) {
        org.springframework.data.domain.Page<Bookmark> page =
                bookmarkRepository.findByUser(user, pageable);
        return PageResponse.from(page.map(b -> toResponse(b.getPost(), user)));
    }

    private PostResponse toResponse(Post post, User currentUser) {
        return PostResponse.from(
                post,
                postService.likesCount(post),
                postService.commentsCount(post),
                postService.isLikedByUser(post.getId(), currentUser)
        );
    }
}
