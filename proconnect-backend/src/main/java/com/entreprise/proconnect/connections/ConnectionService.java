package com.entreprise.proconnect.connections;

import com.entreprise.proconnect.accounts.User;
import com.entreprise.proconnect.common.exception.BusinessRuleException;
import com.entreprise.proconnect.common.exception.ResourceNotFoundException;
import com.entreprise.proconnect.notifications.NotificationService;
import com.entreprise.proconnect.notifications.NotificationType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business rules for the Connection module (cahier des charges, sections 9 and 40),
 * kept out of the controller — the Spring Boot equivalent of connections/services.py.
 */
@Service
public class ConnectionService {

    private final ConnectionRepository connectionRepository;
    private final BlockRepository blockRepository;
    private final NotificationService notificationService;

    public ConnectionService(
            ConnectionRepository connectionRepository,
            BlockRepository blockRepository,
            NotificationService notificationService
    ) {
        this.connectionRepository = connectionRepository;
        this.blockRepository = blockRepository;
        this.notificationService = notificationService;
    }

    public List<Connection> listForUser(User user, ConnectionStatus status) {
        return connectionRepository.findAllForUser(user, status);
    }

    public Connection getById(UUID id) {
        return connectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Connexion introuvable."));
    }

    @Transactional
    public Connection sendInvitation(User requester, User addressee) {
        if (requester.getId().equals(addressee.getId())) {
            throw new BusinessRuleException("Vous ne pouvez pas vous inviter vous-même.");
        }
        if (blockRepository.existsByBlockerAndBlocked(addressee, requester)) {
            throw new BusinessRuleException("Cet utilisateur ne peut pas être invité.");
        }
        if (connectionRepository.findActiveBetween(requester, addressee).isPresent()) {
            throw new BusinessRuleException("Une invitation ou connexion active existe déjà entre ces deux utilisateurs.");
        }

        // Si l'autre personne m'a déjà invité, on accepte directement son invitation
        // au lieu de créer un doublon en attente (évite le blocage mutuel).
        Connection existingReverse = connectionRepository.findPendingFromTo(addressee, requester).orElse(null);
        if (existingReverse != null) {
            existingReverse.setStatus(ConnectionStatus.ACCEPTED);
            existingReverse.setRespondedAt(Instant.now());
            Connection accepted = connectionRepository.save(existingReverse);
            notificationService.notify(
                    existingReverse.getRequester(), requester, NotificationType.CONNECTION_ACCEPTED, accepted.getId(),
                    requester.getFullName() + " a accepté votre invitation."
            );
            return accepted;
        }

        Connection connection = connectionRepository.save(
                Connection.builder().requester(requester).addressee(addressee).status(ConnectionStatus.PENDING).build()
        );

        notificationService.notify(
                addressee, requester, NotificationType.CONNECTION_REQUEST, connection.getId(),
                requester.getFullName() + " vous a envoyé une invitation de connexion."
        );
        return connection;
    }

    @Transactional
    public Connection accept(UUID connectionId, User user) {
        Connection connection = getById(connectionId);
        if (!connection.getAddressee().getId().equals(user.getId())) {
            throw new BusinessRuleException("Seul le destinataire peut accepter cette invitation.");
        }
        // Idempotent : si déjà acceptée (double-clic, retry réseau, autre onglet),
        // on renvoie l'état actuel au lieu d'une erreur 400 qui casse l'UI.
        if (connection.getStatus() == ConnectionStatus.ACCEPTED) {
            return connection;
        }
        if (connection.getStatus() != ConnectionStatus.PENDING) {
            throw new BusinessRuleException("Cette invitation n'est plus en attente.");
        }
        connection.setStatus(ConnectionStatus.ACCEPTED);
        connection.setRespondedAt(Instant.now());
        connectionRepository.save(connection);

        notificationService.notify(
                connection.getRequester(), user, NotificationType.CONNECTION_ACCEPTED, connection.getId(),
                user.getFullName() + " a accepté votre invitation."
        );
        return connection;
    }

    @Transactional
    public Connection reject(UUID connectionId, User user) {
        Connection connection = getById(connectionId);
        if (!connection.getAddressee().getId().equals(user.getId())) {
            throw new BusinessRuleException("Seul le destinataire peut refuser cette invitation.");
        }
        if (connection.getStatus() != ConnectionStatus.PENDING) {
            throw new BusinessRuleException("Cette invitation n'est plus en attente.");
        }
        connection.setStatus(ConnectionStatus.REJECTED);
        connection.setRespondedAt(Instant.now());
        return connectionRepository.save(connection);
    }

    @Transactional
    public Connection cancel(UUID connectionId, User user) {
        Connection connection = getById(connectionId);
        if (!connection.getRequester().getId().equals(user.getId())) {
            throw new BusinessRuleException("Seul l'émetteur peut annuler cette invitation.");
        }
        if (connection.getStatus() != ConnectionStatus.PENDING) {
            throw new BusinessRuleException("Cette invitation n'est plus en attente.");
        }
        connection.setStatus(ConnectionStatus.CANCELLED);
        connection.setRespondedAt(Instant.now());
        return connectionRepository.save(connection);
    }

    @Transactional
    public void remove(UUID connectionId, User user) {
        Connection connection = getById(connectionId);
        if (!connection.getRequester().getId().equals(user.getId()) && !connection.getAddressee().getId().equals(user.getId())) {
            throw new BusinessRuleException("Vous ne faites pas partie de cette connexion.");
        }
        connectionRepository.delete(connection);
    }

    @Transactional
    public Block block(User blocker, User blocked) {
        if (blockRepository.existsByBlockerAndBlocked(blocker, blocked)) {
            throw new BusinessRuleException("Cet utilisateur est déjà bloqué.");
        }
        return blockRepository.save(Block.builder().blocker(blocker).blocked(blocked).build());
    }

    public List<Block> listBlocks(User blocker) {
        return blockRepository.findByBlocker(blocker);
    }
}
