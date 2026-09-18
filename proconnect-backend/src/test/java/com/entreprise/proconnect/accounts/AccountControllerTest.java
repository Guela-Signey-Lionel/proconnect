package com.entreprise.proconnect.accounts;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerThenLogin() throws Exception {
        var registerPayload = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("email", "jane.doe@entreprise.com");
            put("firstName", "Jane");
            put("lastName", "Doe");
            put("password", "SuperMotDePasse123");
        }});

        mockMvc.perform(post("/api/v1/auth/register/")
                        .contentType("application/json")
                        .content(registerPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("jane.doe@entreprise.com"));

        var loginPayload = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("email", "jane.doe@entreprise.com");
            put("password", "SuperMotDePasse123");
        }});

        mockMvc.perform(post("/api/v1/auth/login/")
                        .contentType("application/json")
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }

    @Test
    void duplicateEmailRejected() throws Exception {
        var payload = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("email", "dup@entreprise.com");
            put("firstName", "A");
            put("lastName", "B");
            put("password", "SuperMotDePasse123");
        }});

        mockMvc.perform(post("/api/v1/auth/register/").contentType("application/json").content(payload))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/register/").contentType("application/json").content(payload))
                .andExpect(status().isBadRequest());
    }
}
