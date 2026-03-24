package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Device;
import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    List<Device> findByOwnerUsername(String ownerUsername);
    List<Device> findByOwnerUsernameIsNull();
    Optional<Device> findByIdAndOwnerUsername(Long id, String ownerUsername);
    Optional<Device> findByIdAndOwnerUsernameIsNull(Long id);
}
