package com.example.demo.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.demo.model.UserAccount;
import com.example.demo.repository.UserAccountRepository;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final UserAccountRepository userAccountRepository;

    public AdminInitializer(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    public void run(String... args) {
        UserAccount admin = userAccountRepository.findByUsername("ALSPU")
                .orElseGet(() -> new UserAccount("ALSPU", sha256("AL@SPU"), "ADMIN"));
        admin.setPasswordHash(sha256("AL@SPU"));
        admin.setRole("ADMIN");
        admin.setActive(true);
        userAccountRepository.save(admin);
    }

    private String sha256(String value) {
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
