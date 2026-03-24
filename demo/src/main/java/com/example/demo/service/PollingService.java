package com.example.demo.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.demo.model.Feed;
import com.example.demo.model.FeedData;
import com.example.demo.repository.FeedDataRepository;
import com.example.demo.repository.FeedRepository;

@Service
public class PollingService {

    private final FeedRepository feedRepository;
    private final FeedDataRepository feedDataRepository;
    private final ModbusService modbusService;

    private final Map<Long, LocalDateTime> lastPolledAt = new ConcurrentHashMap<>();

    private volatile List<Feed> cachedFeeds = Collections.emptyList();
    private volatile LocalDateTime lastFeedRefreshAt = LocalDateTime.MIN;

    private static final long FEED_CACHE_SECONDS = 15;

    public PollingService(
            FeedRepository feedRepository,
            FeedDataRepository feedDataRepository,
            ModbusService modbusService
    ) {
        this.feedRepository = feedRepository;
        this.feedDataRepository = feedDataRepository;
        this.modbusService = modbusService;
    }

    // Poll every second
    @Scheduled(fixedRate = 1000)
    public void pollFeeds() {

        LocalDateTime now = LocalDateTime.now();
        List<Feed> feeds = getFeeds(now);

        if (feeds.isEmpty()) {
            return;
        }

        for (Feed feed : feeds) {

            if (feed.getInput() == null || feed.getInput().getDevice() == null) {
                continue;
            }

            if (!"Enable".equalsIgnoreCase(feed.getInput().getDevice().getStatus())) {
                continue;
            }

            int intervalSeconds =
                    feed.getIntervalSeconds() == null
                            ? 10
                            : Math.max(feed.getIntervalSeconds(), 1);

            LocalDateTime previousPoll = lastPolledAt.get(feed.getId());

            if (previousPoll != null &&
                    previousPoll.plusSeconds(intervalSeconds).isAfter(now)) {
                continue;
            }

            try {

                Double value = modbusService.readInputValue(feed.getInput());

                if (value == null) {
                    continue;
                }

                FeedData feedData = new FeedData(
                        value,
                        now,
                        feed
                );

                feedDataRepository.save(feedData);

            } catch (Exception e) {

                System.out.println(
                        "Feed polling error for feed "
                                + feed.getId()
                                + ": "
                                + e.getMessage()
                );

            } finally {

                lastPolledAt.put(feed.getId(), now);
            }
        }
    }

    private List<Feed> getFeeds(LocalDateTime now) {

        if (ChronoUnit.SECONDS.between(lastFeedRefreshAt, now) >= FEED_CACHE_SECONDS
                || cachedFeeds.isEmpty()) {

            synchronized (this) {

                if (ChronoUnit.SECONDS.between(lastFeedRefreshAt, now) >= FEED_CACHE_SECONDS
                        || cachedFeeds.isEmpty()) {

                    cachedFeeds = feedRepository.findAllWithInputAndDevice();
                    lastFeedRefreshAt = now;

                }
            }
        }

        return cachedFeeds;
    }
}