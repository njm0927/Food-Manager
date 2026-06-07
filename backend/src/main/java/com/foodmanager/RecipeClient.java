package com.foodmanager;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class RecipeClient {
    private final RestClient restClient;
    private final String apiKey;

    public RecipeClient(@Value("${app.food-safety-api-key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://openapi.foodsafetykorea.go.kr")
                .build();
    }

    public Map<?, ?> search(String query) {
        String keyword = query == null ? "" : query;
        return restClient.get()
                .uri(builder -> builder.path("/api/{apiKey}/COOKRCP01/json/1/10/RCP_NM={keyword}")
                        .build(apiKey, keyword))
                .retrieve()
                .body(Map.class);
    }
}
