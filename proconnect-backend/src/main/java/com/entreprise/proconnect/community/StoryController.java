package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.community.dto.StoryResponse;
import com.entreprise.proconnect.feed.MediaStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.UUID;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/stories")
@Tag(name = "Stories")
public class StoryController {

    private final StoryRepository storyRepository;
    private final MediaStorageService mediaStorageService;

    public StoryController(StoryRepository storyRepository, MediaStorageService mediaStorageService) {
        this.storyRepository = storyRepository;
        this.mediaStorageService = mediaStorageService;
    }

    @GetMapping("/")
    @Operation(summary = "Lister les stories actives (24h)")
    public List<StoryResponse> list(@AuthenticationPrincipal User user) {
        return storyRepository.findByExpiresAtAfterOrderByCreatedAtDesc(Instant.now()).stream()
                .map(StoryResponse::from)
                .toList();
    }

    @PostMapping(value = "/", consumes = "multipart/form-data")
    @Operation(summary = "Publier une story (image + légende optionnelle, expire après 24h)")
    public ResponseEntity<StoryResponse> create(
            @AuthenticationPrincipal User user,
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "caption", required = false) String caption
    ) {
        String url = mediaStorageService.upload(image, "stories");
        Story story = Story.builder()
                .author(user)
                .imageUrl(url)
                .caption(caption)
                .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(StoryResponse.from(storyRepository.save(story)));
    }

    @DeleteMapping("/{id}/")
    @Operation(summary = "Supprimer sa propre story")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Story story = storyRepository.findById(id)
                .orElseThrow(() -> new com.entreprise.proconnect.common.exception.ResourceNotFoundException("Story introuvable."));
        if (!story.getAuthor().getId().equals(user.getId()) && !user.isAdmin()) {
            throw new com.entreprise.proconnect.common.exception.BusinessRuleException(
                    "Seul l'auteur peut supprimer sa story.");
        }
        storyRepository.delete(story);
        return ResponseEntity.noContent().build();
    }
}
