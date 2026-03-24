package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Feed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer intervalSeconds;

    @ManyToOne
    @JoinColumn(name = "input_id")
    private Input input;

    private String ownerUsername;

    public Feed() {}

    public Feed(String name, Integer intervalSeconds, Input input) {
        this.name = name;
        this.intervalSeconds = intervalSeconds;
        this.input = input;
    }

    public Long getId() { return id; }

    public String getName() { return name; }

    public Integer getIntervalSeconds() { return intervalSeconds; }

    public Input getInput() { return input; }

    public String getOwnerUsername() { return ownerUsername; }

    public void setName(String name) { this.name = name; }

    public void setIntervalSeconds(Integer intervalSeconds) {
        this.intervalSeconds = intervalSeconds;
    }

    public void setInput(Input input) { this.input = input; }

    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }
}
