package com.example.demo.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "meter_readings")
public class MeterReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Float value;

    private LocalDateTime timestamp;

    public MeterReading() {}

    public MeterReading(Float value, LocalDateTime timestamp) {
        this.value = value;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }

    public Float getValue() { return value; }

    public void setValue(Float value) { this.value = value; }

    public LocalDateTime getTimestamp() { return timestamp; }

    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}