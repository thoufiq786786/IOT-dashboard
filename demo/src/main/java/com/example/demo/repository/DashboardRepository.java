package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.model.Dashboard;

public interface DashboardRepository extends JpaRepository<Dashboard, Long> {
    boolean existsByAlias(String alias);
    boolean existsByAliasAndOwnerUsername(String alias, String ownerUsername);
    java.util.List<Dashboard> findByIsPublishedTrueOrderByIdAsc();
    java.util.List<Dashboard> findByOwnerUsernameOrderByIdAsc(String ownerUsername);
    java.util.List<Dashboard> findByOwnerUsernameIsNullOrderByIdAsc();
    java.util.List<Dashboard> findByOwnerUsernameAndIsPublishedTrueOrderByIdAsc(String ownerUsername);
    java.util.List<Dashboard> findByOwnerUsernameIsNullAndIsPublishedTrueOrderByIdAsc();
    java.util.Optional<Dashboard> findByIdAndOwnerUsername(Long id, String ownerUsername);
    java.util.Optional<Dashboard> findByIdAndOwnerUsernameIsNull(Long id);
}
