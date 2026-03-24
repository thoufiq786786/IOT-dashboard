package com.example.demo.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.UserAccount;
import com.example.demo.repository.UserAccountRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final UserAccountRepository userAccountRepository;
    private final AuthSessionService authSessionService;

    public AuthController(UserAccountRepository userAccountRepository, AuthSessionService authSessionService) {
        this.userAccountRepository = userAccountRepository;
        this.authSessionService = authSessionService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        UserAccount user = userAccountRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (!Boolean.TRUE.equals(user.getActive()) || !user.getPasswordHash().equals(sha256(request.password()))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        String token = authSessionService.createToken(user);
        return new LoginResponse(token, new UserSummary(user.getId(), user.getUsername(), user.getRole()));
    }

    @GetMapping("/me")
    public UserSummary me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthSessionService.SessionUser sessionUser = authSessionService.getSessionUser(authorization);
        if (sessionUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return new UserSummary(sessionUser.userId(), sessionUser.username(), sessionUser.role());
    }

    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authSessionService.invalidate(authorization);
    }

    public record LoginRequest(String username, String password) {}
    public record LoginResponse(String token, UserSummary user) {}
    public record UserSummary(Long id, String username, String role) {}

    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
