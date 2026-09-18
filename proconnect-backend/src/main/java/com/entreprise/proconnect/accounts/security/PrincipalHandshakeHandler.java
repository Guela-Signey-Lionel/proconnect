package com.entreprise.proconnect.accounts.security;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

/** Promotes the Principal stashed in the handshake attributes by JwtHandshakeInterceptor
 *  to the actual WebSocket session Principal, so convertAndSendToUser(email, ...) works. */
public class PrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        Object principal = attributes.get("principal");
        if (principal instanceof Principal p) {
            return p;
        }
        return super.determineUser(request, wsHandler, attributes);
    }
}
