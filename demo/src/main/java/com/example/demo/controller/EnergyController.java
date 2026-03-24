package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.repository.MeterReadingRepository;

@RestController
@RequestMapping("/api")
public class EnergyController {

    private final MeterReadingRepository repository;

    public EnergyController(MeterReadingRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/history")
    public Object getHistory() {
        return repository.findTop100ByOrderByTimestampDesc();
    }
}