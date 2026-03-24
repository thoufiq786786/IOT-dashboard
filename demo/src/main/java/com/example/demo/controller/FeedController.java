package com.example.demo.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Feed;
import com.example.demo.model.Input;
import com.example.demo.repository.FeedRepository;
import com.example.demo.repository.InputRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/feeds")
@CrossOrigin(origins = "http://localhost:5173")
public class FeedController {

    private final FeedRepository feedRepository;
    private final InputRepository inputRepository;
    private final AuthSessionService authSessionService;

    public FeedController(FeedRepository feedRepository,
                          InputRepository inputRepository,
                          AuthSessionService authSessionService) {
        this.feedRepository = feedRepository;
        this.inputRepository = inputRepository;
        this.authSessionService = authSessionService;
    }

    // Get all feeds
    @GetMapping
    public List<Feed> getAllFeeds(@RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);
        return isAdmin(owner) ? feedRepository.findByOwnerUsernameIsNull() : feedRepository.findByOwnerUsername(owner);
    }

    // Get feeds by input
    @GetMapping("/input/{inputId}")
    public List<Feed> getFeedsByInput(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @PathVariable Long inputId) {
        String owner = requireUser(authorization);
        return isAdmin(owner)
                ? feedRepository.findByInputId(inputId).stream().filter(f -> f.getOwnerUsername() == null).toList()
                : feedRepository.findByInputIdAndOwnerUsername(inputId, owner);
    }

    // Create new feed
    @PostMapping("/{inputId}")
    public Feed createFeed(@RequestHeader(value = "Authorization", required = false) String authorization,
                           @PathVariable Long inputId,
                           @RequestBody Feed feed) {
        String owner = requireUser(authorization);

        Optional<Input> inputOpt = isAdmin(owner)
                ? inputRepository.findByIdAndOwnerUsernameIsNull(inputId)
                : inputRepository.findByIdAndOwnerUsername(inputId, owner);

        Input input = inputOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Input not found with id: " + inputId));

        feed.setInput(input);
        feed.setOwnerUsername(isAdmin(owner) ? null : owner);

        return feedRepository.save(feed);
    }

    // Update feed details
    @PutMapping("/{id}")
    public Feed updateFeed(@RequestHeader(value = "Authorization", required = false) String authorization,
                           @PathVariable Long id,
                           @RequestBody Feed feed) {
        String owner = requireUser(authorization);
        Optional<Feed> existingOpt = isAdmin(owner)
                ? feedRepository.findByIdAndOwnerUsernameIsNull(id)
                : feedRepository.findByIdAndOwnerUsername(id, owner);
        Feed existing = existingOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feed not found with id: " + id));

        existing.setName(feed.getName());
        existing.setIntervalSeconds(feed.getIntervalSeconds());
        return feedRepository.save(existing);
    }

    // Delete feed
    @DeleteMapping("/{id}")
    public void deleteFeed(@RequestHeader(value = "Authorization", required = false) String authorization,
                           @PathVariable Long id) {
        String owner = requireUser(authorization);
        Optional<Feed> existingOpt = isAdmin(owner)
                ? feedRepository.findByIdAndOwnerUsernameIsNull(id)
                : feedRepository.findByIdAndOwnerUsername(id, owner);
        Feed existing = existingOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feed not found"));
        feedRepository.deleteById(existing.getId());
    }

    private String requireUser(String authorization) {
        AuthSessionService.SessionUser session = authSessionService.getSessionUser(authorization);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return session.username();
    }

    private boolean isAdmin(String username) {
        return "ALSPU".equalsIgnoreCase(username);
    }
}
