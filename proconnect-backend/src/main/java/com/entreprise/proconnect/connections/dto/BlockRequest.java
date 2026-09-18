package com.entreprise.proconnect.connections.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record BlockRequest(@NotNull UUID blockedId) {
}
