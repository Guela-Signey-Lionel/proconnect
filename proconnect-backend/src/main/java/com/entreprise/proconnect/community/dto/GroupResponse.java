package com.entreprise.proconnect.community.dto;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.community.Group;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record GroupResponse(
        UUID id,
        String name,
        String description,
        String coverImage,
        String avatar,
        String category,
        String type,
        int members,
        int posts,
        boolean isMember,
        boolean isAdmin,
        List<String> rules
) {
    public static GroupResponse from(Group g, User currentUser) {
        boolean isMember = currentUser != null
                && g.getMembers().stream().anyMatch(m -> m.getId().equals(currentUser.getId()));
        boolean isAdmin = currentUser != null
                && g.getOwner() != null && g.getOwner().getId().equals(currentUser.getId());
        List<String> rules = g.getRulesText() == null || g.getRulesText().isBlank()
                ? List.of()
                : Arrays.asList(g.getRulesText().split("\\n"));
        return new GroupResponse(
                g.getId(), g.getName(), g.getDescription(), g.getCoverImageUrl(), g.getAvatarUrl(),
                g.getCategory(),
                "PRIVATE".equalsIgnoreCase(g.getVisibility()) ? "private" : "public",
                g.getMembers().size(), 0,
                isMember, isAdmin,
                rules.stream().map(String::trim).toList()
        );
    }
}
