package com.example.demo.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.demo.model.Input;
import com.example.demo.model.MeterReading;
import com.example.demo.repository.InputRepository;
import com.example.demo.repository.MeterReadingRepository;

@Service
public class MeterPollingService {

    private final ModbusService modbusService;
    private final MeterReadingRepository meterRepository;
    private final InputRepository inputRepository;

    public MeterPollingService(
            ModbusService modbusService,
            MeterReadingRepository meterRepository,
            InputRepository inputRepository
    ) {
        this.modbusService = modbusService;
        this.meterRepository = meterRepository;
        this.inputRepository = inputRepository;
    }

    // Poll every 30 seconds
    @Scheduled(fixedRate = 30000)
    public void pollMeter() {

        List<Input> inputs = inputRepository.findAll();

        if (inputs.isEmpty()) {
            return;
        }

        for (Input input : inputs) {

            try {

                Double value = modbusService.readInputValue(input);

                if (value == null) {
                    continue;
                }

                MeterReading reading = new MeterReading(
                        value.floatValue(),
                        LocalDateTime.now()
                );

                meterRepository.save(reading);

                System.out.println(
                        "Saved meter reading -> Input: "
                                + input.getName()
                                + " Value: "
                                + BigDecimal.valueOf(value).toPlainString()
                );

            } catch (Exception e) {

                System.out.println(
                        "Meter polling error for input "
                                + input.getName()
                                + ": "
                                + e.getMessage()
                );
            }
        }
    }
}
