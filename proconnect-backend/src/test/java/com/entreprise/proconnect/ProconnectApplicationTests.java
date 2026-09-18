package com.entreprise.proconnect;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Smoke test: verifies the whole Spring context (all 6 modules) wires up correctly. */
@SpringBootTest
@ActiveProfiles("test")
class ProconnectApplicationTests {

    @Test
    void contextLoads() {
    }
}
