package com.example.demo.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class FeedData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double value;

    private LocalDateTime timestamp;

    @ManyToOne
    @JoinColumn(name = "feed_id")
    private Feed feed;

    public FeedData() {}

    public FeedData(Double value, LocalDateTime timestamp, Feed feed) {
        this.value = value;
        this.timestamp = timestamp;
        this.feed = feed;
    }

    public Long getId() { return id; }

    public Double getValue() { return value; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public Feed getFeed() { return feed; }

    public void setValue(Double value) { this.value = value; }

    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public void setFeed(Feed feed) { this.feed = feed; }
}