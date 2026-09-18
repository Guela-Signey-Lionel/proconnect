package com.entreprise.proconnect.accounts.security;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

/**
 * Authenticates the STOMP/WebSocket handshake using a JWT passed as ?token=... in the
 * query string, then stores a Principal so @SendToUser / convertAndSendToUser can
 * target this specific user (cahier des charges, section 14).
 */
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;

    public JwtHandshakeInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Map<String, Object> attributes
    ) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (token == null) {
                return false;
            }
            try {
                String username = jwtService.extractUsername(token);
                UUID userId = jwtService.extractUserId(token);
                attributes.put("principal", (Principal) () -> username);
                attributes.put("userId", userId);
                return true;
            } catch (Exception ex) {
                return false;
            }
        }
        return false;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler, Exception exception
    ) {
        // no-op
    }
}
