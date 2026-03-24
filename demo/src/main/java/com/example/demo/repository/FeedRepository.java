package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.demo.model.Feed;
import java.util.Optional;

@Repository
public interface FeedRepository extends JpaRepository<Feed, Long> {

    // Get feeds by input
    List<Feed> findByInputId(Long inputId);
    List<Feed> findByInputIdAndOwnerUsername(Long inputId, String ownerUsername);
    List<Feed> findByOwnerUsername(String ownerUsername);
    List<Feed> findByOwnerUsernameIsNull();
    Optional<Feed> findByIdAndOwnerUsername(Long id, String ownerUsername);
    Optional<Feed> findByIdAndOwnerUsernameIsNull(Long id);

    List<Feed> findByInputIdIn(List<Long> inputIds);
    List<Feed> findByInputIdInAndOwnerUsername(List<Long> inputIds, String ownerUsername);

    // Load feeds with input and device (used by PollingService)
    @Query("""
        SELECT f
        FROM Feed f
        JOIN FETCH f.input i
        JOIN FETCH i.device
    """)
    List<Feed> findAllWithInputAndDevice();

    @Query("""
        SELECT f
        FROM Feed f
        JOIN FETCH f.input i
        JOIN FETCH i.device
        WHERE f.ownerUsername = ?1
    """)
    List<Feed> findAllWithInputAndDeviceByOwnerUsername(String ownerUsername);

    @Query("""
        SELECT f
        FROM Feed f
        JOIN FETCH f.input i
        JOIN FETCH i.device
        WHERE f.ownerUsername IS NULL
    """)
    List<Feed> findAllWithInputAndDeviceOwnerIsNull();

}
