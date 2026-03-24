package com.example.demo.service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.example.demo.model.UserAccount;

@Service
public class AuthSessionService {

    private final Map<String, SessionUser> tokens = new ConcurrentHashMap<>();

    public String createToken(UserAccount user) {
        String token = UUID.randomUUID().toString();
        tokens.put(token, new SessionUser(user.getId(), user.getUsername(), user.getRole()));
        return token;
    }

    public SessionUser getSessionUser(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        return token != null ? tokens.get(token) : null;
    }

    public void invalidate(String authorizationHeader) {
        String token = extractToken(authorizationHeader);
        if (token != null) {
            tokens.remove(token);
        }
    }

    private String extractToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }
        String prefix = "Bearer ";
        return authorizationHeader.startsWith(prefix) ? authorizationHeader.substring(prefix.length()) : authorizationHeader;
    }

    public record SessionUser(Long userId, String username, String role) {}
}
