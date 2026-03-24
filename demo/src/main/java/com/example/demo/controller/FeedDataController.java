package com.example.demo.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Feed;
import com.example.demo.model.FeedData;
import com.example.demo.repository.FeedDataRepository;
import com.example.demo.repository.FeedRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/feeddata")
@CrossOrigin(origins = "http://localhost:5173")
public class FeedDataController {

    private final FeedDataRepository feedDataRepository;
    private final FeedRepository feedRepository;
    private final AuthSessionService authSessionService;

    public FeedDataController(FeedDataRepository feedDataRepository,
                              FeedRepository feedRepository,
                              AuthSessionService authSessionService) {
        this.feedDataRepository = feedDataRepository;
        this.feedRepository = feedRepository;
        this.authSessionService = authSessionService;
    }

    // Get feed data (either date-bounded or top 100 fallback)
    @GetMapping("/{feedId}")
    public List<FeedData> getFeedData(@RequestHeader(value = "Authorization", required = false) String authorization,
                                      @PathVariable Long feedId,
                                      @RequestParam(required = false) String start_date,
                                      @RequestParam(required = false) String end_date) {
        String owner = requireUser(authorization);
        Optional<Feed> feed = isAdmin(owner)
                ? feedRepository.findByIdAndOwnerUsernameIsNull(feedId)
                : feedRepository.findByIdAndOwnerUsername(feedId, owner);
        if (feed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feed not found");
        }

        // If date boundaries are provided, use them instead of fixing to 100 rows
        if (start_date != null && end_date != null) {
            LocalDateTime start = parseDateTime(start_date, true);
            LocalDateTime end = parseDateTime(end_date, false);
            return feedDataRepository.findByFeedIdAndTimestampBetweenOrderByTimestampDesc(feedId, start, end);
        }

        return feedDataRepository
                .findTop100ByFeedIdOrderByTimestampDesc(feedId);
    }

    // Get latest value for all feeds
    @GetMapping("/latest")
    public List<FeedData> getLatestForAllFeeds(@RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);

        List<FeedData> latestData = new ArrayList<>();

        List<Feed> feeds = isAdmin(owner) ? feedRepository.findByOwnerUsernameIsNull() : feedRepository.findByOwnerUsername(owner);

        for (Feed feed : feeds) {

            FeedData latest = feedDataRepository
                    .findTopByFeedIdOrderByTimestampDesc(feed.getId());

            if (latest != null) {
                latestData.add(latest);
            }
        }

        return latestData;
    }

    private final DateTimeFormatter DATA_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private List<Object[]> formatFeedData(List<FeedData> data) {
        return data.stream()
                .map(fd -> new Object[]{
                        fd.getTimestamp() != null ? fd.getTimestamp().format(DATA_FORMATTER) : "",
                        fd.getValue()
                })
                .collect(Collectors.toList());
    }

    // Get all feed data for a specific device ID (No UI, just returns JSON)
    @GetMapping("/device/{deviceId}")
    public List<Object[]> getAllDataByDevice(
            @PathVariable Long deviceId,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date) {
        
        List<FeedData> results;
        if (start_date != null && end_date != null) {
            LocalDateTime start = parseDateTime(start_date, true);
            LocalDateTime end = parseDateTime(end_date, false);
            results = feedDataRepository.findByFeedInputDeviceIdAndTimestampBetweenOrderByTimestampDesc(deviceId, start, end);
        } else {
            results = feedDataRepository.findByFeedInputDeviceIdOrderByTimestampDesc(deviceId);
        }
        return formatFeedData(results);
    }

    // Get all feed data for specific input IDs (No UI, just returns JSON)
    @GetMapping("/input/{inputIds}")
    public List<Object[]> getAllDataByInputs(
            @PathVariable List<Long> inputIds,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date) {
        
        List<FeedData> results;
        if (start_date != null && end_date != null) {
            LocalDateTime start = parseDateTime(start_date, true);
            LocalDateTime end = parseDateTime(end_date, false);
            results = feedDataRepository.findByFeedInputIdInAndTimestampBetweenOrderByTimestampDesc(inputIds, start, end);
        } else {
            results = feedDataRepository.findByFeedInputIdInOrderByTimestampDesc(inputIds);
        }
        return formatFeedData(results);
    }

    private LocalDateTime parseDateTime(String dateStr, boolean isStart) {
        try {
            // Remove any trailing timezone information (like Z or +05:30)
            if (dateStr.contains("+") && !dateStr.startsWith("+")) {
                dateStr = dateStr.substring(0, dateStr.lastIndexOf("+"));
            }
            if (dateStr.endsWith("Z")) {
                dateStr = dateStr.substring(0, dateStr.length() - 1);
            }
            
            // Normalize space to T
            dateStr = dateStr.replace(" ", "T");

            if (dateStr.contains("T")) {
                // If it has a T but no seconds, append :00
                if (dateStr.split(":").length == 2) {
                    dateStr += ":00";
                }
                return LocalDateTime.parse(dateStr);
            } else {
                LocalDate date = LocalDate.parse(dateStr);
                return isStart ? date.atStartOfDay() : date.atTime(23, 59, 59);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date format. Use yyyy-MM-dd or yyyy-MM-dd'T'HH:mm:ss");
        }
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
