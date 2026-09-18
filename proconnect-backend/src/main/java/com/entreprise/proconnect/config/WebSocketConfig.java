package com.entreprise.proconnect.config;

import com.entreprise.proconnect.accounts.security.JwtHandshakeInterceptor;
import com.entreprise.proconnect.accounts.security.JwtService;
import com.entreprise.proconnect.accounts.security.PrincipalHandshakeHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Spring WebSocket (STOMP) + Redis, per the cahier des charges section 14.
 * - /topic/conversations/{id}  — messages broadcast to every participant of a conversation
 * - /user/queue/notifications  — personal notification stream (see NotificationService)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;

    public WebSocketConfig(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/messaging")
                .addInterceptors(new JwtHandshakeInterceptor(jwtService))
                .setHandshakeHandler(new PrincipalHandshakeHandler())
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws/notifications")
                .addInterceptors(new JwtHandshakeInterceptor(jwtService))
                .setHandshakeHandler(new PrincipalHandshakeHandler())
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // In production, swap enableSimpleBroker for enableStompBrokerRelay(...) pointed
        // at a dedicated STOMP broker (e.g. RabbitMQ's STOMP plugin) so that message
        // fan-out works correctly across multiple Spring Boot instances behind a load
        // balancer. The simple in-memory broker below is sufficient for a single instance.
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
