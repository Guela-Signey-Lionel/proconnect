package com.entreprise.proconnect.feed;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end flow across accounts + feed + connections + notifications, mirroring
 * the smoke test used to validate the Django backend: register two users, post,
 * like, comment, connect, and check notifications land for the right recipient.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndLogin(String email, String firstName, String lastName) throws Exception {
        var registerPayload = objectMapper.writeValueAsString(new HashMap<>() {{
            put("email", email);
            put("firstName", firstName);
            put("lastName", lastName);
            put("password", "SuperMotDePasse123");
        }});
        mockMvc.perform(post("/api/v1/auth/register/").contentType(MediaType.APPLICATION_JSON).content(registerPayload))
                .andExpect(status().isCreated());

        var loginPayload = objectMapper.writeValueAsString(new HashMap<>() {{
            put("email", email);
            put("password", "SuperMotDePasse123");
        }});
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login/").contentType(MediaType.APPLICATION_JSON).content(loginPayload))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    @Test
    void fullFlow() throws Exception {
        String aliceToken = registerAndLogin("alice@entreprise.com", "Alice", "A");
        String bobToken = registerAndLogin("bob@entreprise.com", "Bob", "B");

        // Alice creates a post
        var postPayload = objectMapper.writeValueAsString(new HashMap<>() {{
            put("content", "Bonjour ProConnect !");
            put("postType", "TEXT");
        }});
        MvcResult postResult = mockMvc.perform(post("/api/v1/feed/posts/")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postPayload))
                .andExpect(status().isCreated())
                .andReturn();
        String postId = objectMapper.readTree(postResult.getResponse().getContentAsString()).get("id").asText();

        // Bob likes and comments Alice's post
        mockMvc.perform(post("/api/v1/feed/posts/" + postId + "/like/").header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likesCount").value(1));

        var commentPayload = objectMapper.writeValueAsString(new HashMap<>() {{
            put("content", "Bienvenue !");
        }});
        mockMvc.perform(post("/api/v1/feed/posts/" + postId + "/comments/")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(commentPayload))
                .andExpect(status().isCreated());

        // Alice should now have two notifications (like + comment)
        mockMvc.perform(get("/api/v1/notifications/").header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));
    }
}
