package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.demo.model.FeedData;

@Repository
public interface FeedDataRepository extends JpaRepository<FeedData, Long> {

    @Query(value = "SELECT fd.* FROM feed_data fd INNER JOIN (SELECT feed_id, MAX(timestamp) as max_ts FROM feed_data GROUP BY feed_id) max_fd ON fd.feed_id = max_fd.feed_id AND fd.timestamp = max_fd.max_ts", nativeQuery = true)
    List<FeedData> findLatestEntryPerFeed();

    List<FeedData> findTop100ByFeedIdOrderByTimestampDesc(Long feedId);
    
    // New endpoint requirement: get feed data by an individual feed id between dates
    List<FeedData> findByFeedIdAndTimestampBetweenOrderByTimestampDesc(Long feedId, java.time.LocalDateTime start, java.time.LocalDateTime end);

    
    // New endpoint requirement: get ALL feed data by a specific input device id
    List<FeedData> findByFeedInputDeviceIdOrderByTimestampDesc(Long deviceId);

    // New endpoint requirement: get feed data by a specific input device id between dates
    List<FeedData> findByFeedInputDeviceIdAndTimestampBetweenOrderByTimestampDesc(Long deviceId, java.time.LocalDateTime start, java.time.LocalDateTime end);

    // New endpoint requirement: get ALL feed data by a list of input ids
    List<FeedData> findByFeedInputIdInOrderByTimestampDesc(List<Long> inputIds);

    // New endpoint requirement: get feed data by a list of input ids between dates
    List<FeedData> findByFeedInputIdInAndTimestampBetweenOrderByTimestampDesc(List<Long> inputIds, java.time.LocalDateTime start, java.time.LocalDateTime end);

    FeedData findTopByFeedIdOrderByTimestampDesc(Long feedId);

    void deleteByFeedId(Long feedId);

    void deleteByFeedIdIn(List<Long> feedIds);
}
