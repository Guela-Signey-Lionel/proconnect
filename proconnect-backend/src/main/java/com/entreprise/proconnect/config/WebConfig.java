package com.entreprise.proconnect.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Raccourcis de navigation :
 * - /api/docs  → interface Swagger (servie sur /api/swagger-ui/index.html)
 * - /api/docs/ → idem
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/api/docs", "/api/swagger-ui/index.html");
        registry.addRedirectViewController("/api/docs/", "/api/swagger-ui/index.html");
        registry.addRedirectViewController("/swagger-ui.html", "/api/swagger-ui/index.html");
    }
}
