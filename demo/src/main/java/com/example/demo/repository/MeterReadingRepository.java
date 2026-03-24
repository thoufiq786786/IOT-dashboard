package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.model.MeterReading;

@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {

    List<MeterReading> findTop100ByOrderByTimestampDesc();
}