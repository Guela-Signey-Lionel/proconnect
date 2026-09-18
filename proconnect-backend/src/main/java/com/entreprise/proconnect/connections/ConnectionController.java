package com.entreprise.proconnect.connections;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.accounts.UserRepository;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.connections.dto.BlockRequest;
import com.entreprise.proconnect.connections.dto.BlockResponse;
import com.entreprise.proconnect.connections.dto.ConnectionCreateRequest;
import com.entreprise.proconnect.connections.dto.ConnectionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Mirrors apps/connections/urls.py — mounted under /api/v1/connections/. */
@RestController
@RequestMapping("/api/v1/connections")
@Tag(name = "Connexions")
public class ConnectionController {

    private final ConnectionService connectionService;
    private final UserRepository userRepository;

    public ConnectionController(ConnectionService connectionService, UserRepository userRepository) {
        this.connectionService = connectionService;
        this.userRepository = userRepository;
    }

    @GetMapping("/")
    @Operation(summary = "Lister mes connexions (statut optionnel : PENDING ou ACCEPTED)")
    public List<ConnectionResponse> list(
            @AuthenticationPrincipal User user, @RequestParam(required = false) ConnectionStatus status
    ) {
        return connectionService.listForUser(user, status).stream().map(ConnectionResponse::from).toList();
    }

    @PostMapping("/")
    @Operation(summary = "Envoyer une invitation de connexion à un utilisateur")
    public ResponseEntity<ConnectionResponse> create(
            @AuthenticationPrincipal User user, @Valid @RequestBody ConnectionCreateRequest request
    ) {
        User addressee = userRepository.findById(request.addresseeId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        Connection connection = connectionService.sendInvitation(user, addressee);
        return ResponseEntity.status(HttpStatus.CREATED).body(ConnectionResponse.from(connection));
    }

    @PostMapping("/{id}/accept/")
    @Operation(summary = "Accepter une invitation de connexion reçue")
    public ConnectionResponse accept(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return ConnectionResponse.from(connectionService.accept(id, user));
    }

    @PostMapping("/{id}/reject/")
    @Operation(summary = "Refuser une invitation de connexion reçue")
    public ConnectionResponse reject(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return ConnectionResponse.from(connectionService.reject(id, user));
    }

    @PostMapping("/{id}/cancel/")
    @Operation(summary = "Annuler une invitation de connexion envoyée")
    public ConnectionResponse cancel(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return ConnectionResponse.from(connectionService.cancel(id, user));
    }

    @DeleteMapping("/{id}/")
    @Operation(summary = "Supprimer une connexion de mon réseau")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        connectionService.remove(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/blocks/")
    @Operation(summary = "Bloquer un utilisateur")
    public ResponseEntity<Void> block(@AuthenticationPrincipal User user, @Valid @RequestBody BlockRequest request) {
        User blocked = userRepository.findById(request.blockedId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        connectionService.block(user, blocked);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/blocks/")
    @Operation(summary = "Lister les utilisateurs bloqués")
    public List<BlockResponse> listBlocks(@AuthenticationPrincipal User user) {
        return connectionService.listBlocks(user).stream().map(BlockResponse::from).toList();
    }
}
