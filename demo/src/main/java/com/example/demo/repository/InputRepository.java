package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Input;
import java.util.Optional;

public interface InputRepository extends JpaRepository<Input, Long> {

    List<Input> findByDeviceId(Long deviceId);
    List<Input> findByDeviceIdAndOwnerUsername(Long deviceId, String ownerUsername);
    List<Input> findByOwnerUsername(String ownerUsername);
    List<Input> findByOwnerUsernameIsNull();
    Optional<Input> findByIdAndOwnerUsername(Long id, String ownerUsername);
    Optional<Input> findByIdAndOwnerUsernameIsNull(Long id);

    void deleteByDeviceId(Long deviceId);
}
