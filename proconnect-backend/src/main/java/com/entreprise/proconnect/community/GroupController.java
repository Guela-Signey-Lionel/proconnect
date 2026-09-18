package com.entreprise.proconnect.community;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.community.dto.GroupResponse;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups")
@Tag(name = "Groupes")
public class GroupController {

    private final GroupRepository groupRepository;
    private final GroupPostRepository groupPostRepository;
    private final com.entreprise.proconnect.feed.PostRepository postRepository;

    public GroupController(
            GroupRepository groupRepository,
            GroupPostRepository groupPostRepository,
            com.entreprise.proconnect.feed.PostRepository postRepository
    ) {
        this.groupRepository = groupRepository;
        this.groupPostRepository = groupPostRepository;
        this.postRepository = postRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Lister tous les groupes de la communauté")
    public java.util.List<GroupResponse> list(@AuthenticationPrincipal User user) {
        return groupRepository.findAll().stream().map(g -> GroupResponse.from(g, user)).toList();
    }

    @GetMapping("/{id}/")
    @Operation(summary = "Détail d'un groupe")
    public GroupResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return GroupResponse.from(getGroup(id), user);
    }

    @PostMapping("/")
    @Operation(summary = "Créer un groupe (type : public ou private)")
    public ResponseEntity<GroupResponse> create(@AuthenticationPrincipal User user, @RequestBody GroupResponse request) {
        Group group = Group.builder()
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .visibility("private".equalsIgnoreCase(request.type()) ? "PRIVATE" : "PUBLIC")
                .owner(user)
                .build();
        group.getMembers().add(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(GroupResponse.from(groupRepository.save(group), user));
    }

    @PostMapping("/{id}/join/")
    @Operation(summary = "Rejoindre un groupe")
    public GroupResponse join(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Group group = getGroup(id);
        boolean already = group.getMembers().stream().anyMatch(m -> m.getId().equals(user.getId()));
        if (!already) {
            group.getMembers().add(user);
            groupRepository.save(group);
        }
        return GroupResponse.from(group, user);
    }

    @PostMapping("/{id}/leave/")
    @Operation(summary = "Quitter un groupe (interdit au propriétaire)")
    public GroupResponse leave(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        Group group = getGroup(id);
        if (user.getId().equals(group.getOwner() == null ? null : group.getOwner().getId())) {
            throw new BusinessRuleException("Le propriétaire ne peut pas quitter son propre groupe.");
        }
        group.getMembers().removeIf(m -> m.getId().equals(user.getId()));
        groupRepository.save(group);
        return GroupResponse.from(group, user);
    }

    @PostMapping("/{id}/posts/")
    @Operation(summary = "Publier une publication dans un groupe (membres uniquement)")
    public ResponseEntity<GroupResponse> publishInGroup(
            @AuthenticationPrincipal User user, @PathVariable UUID id,
            @RequestBody com.entreprise.proconnect.feed.dto.PostCreateRequest request
    ) {
        Group group = getGroup(id);
        boolean member = group.getMembers().stream().anyMatch(m -> m.getId().equals(user.getId()));
        if (!member) {
            throw new BusinessRuleException("Vous devez être membre du groupe pour y publier.");
        }
        com.entreprise.proconnect.feed.Post post = com.entreprise.proconnect.feed.Post.builder()
                .author(user)
                .content(request.content())
                .build();
        post = postRepository.save(post);
        groupPostRepository.save(GroupPost.builder().group(group).post(post).build());
        return ResponseEntity.status(HttpStatus.CREATED).body(GroupResponse.from(group, user));
    }

    private Group getGroup(UUID id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Groupe introuvable."));
    }
}
