package com.example.demo.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import com.example.demo.model.UserAccount;
import com.example.demo.repository.UserAccountRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserAccountRepository userAccountRepository;
    private final AuthSessionService authSessionService;

    public UserController(UserAccountRepository userAccountRepository, AuthSessionService authSessionService) {
        this.userAccountRepository = userAccountRepository;
        this.authSessionService = authSessionService;
    }

    @GetMapping
    public List<UserView> listUsers(@RequestHeader(value = "Authorization", required = false) String authorization) {
        requireAuthenticated(authorization);
        return userAccountRepository.findAll().stream()
                .map(user -> new UserView(user.getId(), user.getUsername(), user.getRole(), user.getActive()))
                .toList();
    }

    @PostMapping
    public UserView createUser(@RequestHeader(value = "Authorization", required = false) String authorization,
                               @RequestBody CreateUserRequest request) {
        requireAdmin(authorization);
        String username = request.username() != null ? request.username().trim() : "";
        String password = request.password() != null ? request.password().trim() : "";
        String role = request.role() != null ? request.role().trim().toUpperCase() : "USER";

        if (username.isEmpty() || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }
        if (!role.equals("ADMIN") && !role.equals("USER")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be ADMIN or USER");
        }
        if (userAccountRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        UserAccount user = new UserAccount(username, AuthController.sha256(password), role);
        user.setActive(true);
        UserAccount saved = userAccountRepository.save(user);
        return new UserView(saved.getId(), saved.getUsername(), saved.getRole(), saved.getActive());
    }

    @GetMapping("/profile")
    public UserProfileView getProfile(@RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthSessionService.SessionUser sessionUser = requireAuthenticated(authorization);
        UserAccount user = userAccountRepository.findById(sessionUser.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        // Generate keys if not present 
        boolean saveNeeded = false;
        if (user.getRwApiKey() == null) { user.setRwApiKey(UUID.randomUUID().toString().replace("-", "")); saveNeeded = true; }
        if (user.getRoApiKey() == null) { user.setRoApiKey(UUID.randomUUID().toString().replace("-", "")); saveNeeded = true; }
        if (saveNeeded) userAccountRepository.save(user);
        
        return new UserProfileView(user);
    }

    @PutMapping("/profile")
    public UserProfileView updateProfile(@RequestHeader(value = "Authorization", required = false) String authorization,
                                         @RequestBody UpdateProfileRequest request) {
        AuthSessionService.SessionUser sessionUser = requireAuthenticated(authorization);
        UserAccount user = userAccountRepository.findById(sessionUser.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (request.username() != null && !request.username().trim().isEmpty() && !user.getUsername().equals(request.username())) {
            // Check if username exists
            if (userAccountRepository.existsByUsername(request.username())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
            }
            user.setUsername(request.username().trim());
        }
        if (request.email() != null) user.setEmail(request.email());
        if (request.name() != null) user.setName(request.name());
        if (request.location() != null) user.setLocation(request.location());
        if (request.timezone() != null) user.setTimezone(request.timezone());
        if (request.language() != null) user.setLanguage(request.language());
        if (request.startingPage() != null) user.setStartingPage(request.startingPage());
        if (request.themeColour() != null) user.setThemeColour(request.themeColour());
        if (request.sidebarColour() != null) user.setSidebarColour(request.sidebarColour());
        
        if (request.password() != null && !request.password().trim().isEmpty()) {
            user.setPasswordHash(AuthController.sha256(request.password().trim()));
        }
        
        // Generate API keys if missing
        if (user.getRwApiKey() == null) user.setRwApiKey(UUID.randomUUID().toString().replace("-", ""));
        if (user.getRoApiKey() == null) user.setRoApiKey(UUID.randomUUID().toString().replace("-", ""));

        userAccountRepository.save(user);
        return new UserProfileView(user);
    }

    private void requireAdmin(String authorization) {
        AuthSessionService.SessionUser sessionUser = requireAuthenticated(authorization);
        if (sessionUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        if (!"ADMIN".equalsIgnoreCase(sessionUser.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private AuthSessionService.SessionUser requireAuthenticated(String authorization) {
        AuthSessionService.SessionUser sessionUser = authSessionService.getSessionUser(authorization);
        if (sessionUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return sessionUser;
    }

    public record CreateUserRequest(String username, String password, String role) {}
    public record UserView(Long id, String username, String role, Boolean active) {}

    public record UpdateProfileRequest(String username, String email, String password, String name, String location, String timezone, String language, String startingPage, String themeColour, String sidebarColour) {}
    public record UserProfileView(Long id, String username, String email, String rwApiKey, String roApiKey, String name, String location, String timezone, String language, String startingPage, String themeColour, String sidebarColour) {
        public UserProfileView(UserAccount user) {
            this(user.getId(), user.getUsername(), user.getEmail(), user.getRwApiKey(), user.getRoApiKey(), user.getName(), user.getLocation(), user.getTimezone(), user.getLanguage(), user.getStartingPage(), user.getThemeColour(), user.getSidebarColour());
        }
    }
}
