package com.entreprise.proconnect.feed.dto;

import com.entreprise.proconnect.feed.PostType;
import com.entreprise.proconnect.feed.PostVisibility;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @Size(max = 10000, message = "Le contenu dépasse la taille maximale autorisée.") String content,
        PostType postType,
        PostVisibility visibility
) {
}
