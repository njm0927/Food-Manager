package com.foodmanager.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodmanager.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class JwtService {
    private static final ObjectMapper mapper = new ObjectMapper();
    private final byte[] secret;

    public JwtService(@Value("${app.jwt.secret}") String secret) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String createToken(User user) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", user.getId());
            payload.put("userId", user.getUserId());
            payload.put("role", user.getRole());
            payload.put("exp", Instant.now().plusSeconds(60L * 60L * 24L * 7L).getEpochSecond());

            String encodedHeader = encodeJson(header);
            String encodedPayload = encodeJson(payload);
            String signature = sign(encodedHeader + "." + encodedPayload);
            return encodedHeader + "." + encodedPayload + "." + signature;
        } catch (Exception error) {
            throw new IllegalStateException("JWT 생성에 실패했습니다.", error);
        }
    }

    public Long requireUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }

        String token = authorizationHeader.substring("Bearer ".length());
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("토큰 형식이 올바르지 않습니다.");
        }

        String expectedSignature = sign(parts[0] + "." + parts[1]);
        if (!MessageDigestSafe.equals(expectedSignature, parts[2])) {
            throw new IllegalArgumentException("토큰 서명이 올바르지 않습니다.");
        }

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            Map<?, ?> payload = mapper.readValue(payloadBytes, Map.class);
            Number exp = (Number) payload.get("exp");
            if (exp == null || exp.longValue() < Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException("토큰이 만료되었습니다.");
            }
            return ((Number) payload.get("sub")).longValue();
        } catch (IllegalArgumentException error) {
            throw error;
        } catch (Exception error) {
            throw new IllegalArgumentException("토큰을 읽을 수 없습니다.", error);
        }
    }

    private String encodeJson(Map<String, Object> value) throws Exception {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mapper.writeValueAsBytes(value));
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException("토큰 서명에 실패했습니다.", error);
        }
    }

    private static final class MessageDigestSafe {
        static boolean equals(String left, String right) {
            return java.security.MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
        }
    }
}

