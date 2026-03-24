package com.example.demo.controller;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.model.Dashboard;
import com.example.demo.repository.DashboardRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/dashboards")
@CrossOrigin(origins = "http://localhost:5173")
@Transactional
public class DashboardController {

    private final DashboardRepository dashboardRepository;
    private final AuthSessionService authSessionService;

    public DashboardController(DashboardRepository dashboardRepository, AuthSessionService authSessionService) {
        this.dashboardRepository = dashboardRepository;
        this.authSessionService = authSessionService;
    }

    @GetMapping
    public List<Dashboard> getAll(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);
        return isAdmin(owner)
                ? dashboardRepository.findByOwnerUsernameIsNullOrderByIdAsc()
                : dashboardRepository.findByOwnerUsernameOrderByIdAsc(owner);
    }

    @GetMapping("/menu")
    public List<Dashboard> getPublishedForMenu(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);
        return isAdmin(owner)
                ? dashboardRepository.findByOwnerUsernameIsNullAndIsPublishedTrueOrderByIdAsc()
                : dashboardRepository.findByOwnerUsernameAndIsPublishedTrueOrderByIdAsc(owner);
    }

    @GetMapping("/{id}")
    public Dashboard getById(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                             @PathVariable Long id) {
        return getScopedDashboard(authorization, id);
    }

    @PostMapping
    public Dashboard create(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                            @RequestBody(required = false) CreateDashboardRequest request) {
        String owner = requireUser(authorization);
        String requestedName = request != null ? request.name() : null;
        String requestedAlias = request != null ? request.alias() : null;

        String name = normalizeOrDefault(requestedName, "no name");
        String baseAlias = normalizeOrDefault(requestedAlias, toSlug(name + "-" + owner));
        String alias = ensureUniqueAlias(baseAlias, owner);

        Dashboard dashboard = new Dashboard(name, alias);
        dashboard.setOwnerUsername(isAdmin(owner) ? null : owner);
        dashboard.setIsDefault(false);
        dashboard.setIsPublic(false);
        dashboard.setIsPublished(false);
        dashboard.setLayoutJson("{}");
        return dashboardRepository.save(dashboard);
    }

    @PostMapping("/{id}/copy")
    public Dashboard copy(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                          @PathVariable Long id) {
        String owner = requireUser(authorization);
        Dashboard source = getScopedDashboard(authorization, id);

        String baseName = normalizeOrDefault(source.getName(), "no name") + " copy";
        String name = baseName;
        String alias = ensureUniqueAlias(toSlug(baseName + "-" + owner), owner);

        Dashboard copy = new Dashboard(name, alias);
        copy.setOwnerUsername(isAdmin(owner) ? null : owner);
        copy.setIsDefault(false);
        copy.setIsPublic(source.getIsPublic());
        copy.setIsPublished(source.getIsPublished());
        copy.setLayoutJson(source.getLayoutJson());
        return dashboardRepository.save(copy);
    }

    @PutMapping("/{id}")
    public Dashboard update(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                            @PathVariable Long id, @RequestBody UpdateDashboardRequest request) {
        String owner = requireUser(authorization);
        Dashboard dashboard = getScopedDashboard(authorization, id);

        String name = normalizeOrDefault(request.name(), "no name");
        String aliasRequested = normalizeOrDefault(request.alias(), toSlug(name));
        String alias = aliasRequested.equals(dashboard.getAlias()) ? aliasRequested : ensureUniqueAlias(aliasRequested, owner);

        dashboard.setName(name);
        dashboard.setAlias(alias);
        dashboard.setLayoutJson(request.layoutJson());
        return dashboardRepository.save(dashboard);
    }

    @PutMapping("/{id}/default")
    public Dashboard setDefault(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                                @PathVariable Long id, @RequestBody ToggleRequest request) {
        String owner = requireUser(authorization);
        Dashboard dashboard = getScopedDashboard(authorization, id);

        boolean enabled = request != null && request.enabled();
        if (enabled) {
            List<Dashboard> allDashboards = isAdmin(owner)
                    ? dashboardRepository.findByOwnerUsernameIsNullOrderByIdAsc()
                    : dashboardRepository.findByOwnerUsernameOrderByIdAsc(owner);
            for (Dashboard item : allDashboards) {
                if (Boolean.TRUE.equals(item.getIsDefault()) && !item.getId().equals(id)) {
                    item.setIsDefault(false);
                    dashboardRepository.save(item);
                }
            }
        }

        dashboard.setIsDefault(enabled);
        return dashboardRepository.save(dashboard);
    }

    @PutMapping("/{id}/public")
    public Dashboard setPublic(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                               @PathVariable Long id, @RequestBody ToggleRequest request) {
        Dashboard dashboard = getScopedDashboard(authorization, id);

        dashboard.setIsPublic(request != null && request.enabled());
        return dashboardRepository.save(dashboard);
    }

    @PutMapping("/{id}/published")
    public Dashboard setPublished(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                                  @PathVariable Long id, @RequestBody ToggleRequest request) {
        Dashboard dashboard = getScopedDashboard(authorization, id);

        dashboard.setIsPublished(request != null && request.enabled());
        return dashboardRepository.save(dashboard);
    }

    @DeleteMapping("/{id}")
    public void delete(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                       @PathVariable Long id) {
        Dashboard dashboard = getScopedDashboard(authorization, id);
        dashboardRepository.deleteById(dashboard.getId());
    }

    private String normalizeOrDefault(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? fallback : trimmed;
    }

    private String ensureUniqueAlias(String baseAlias, String owner) {
        String normalizedBase = normalizeOrDefault(baseAlias, "dashboard");
        String alias = normalizedBase;
        int suffix = 2;
        while (dashboardRepository.existsByAlias(alias)) {
            alias = normalizedBase + "-" + suffix;
            suffix++;
        }
        return alias;
    }

    private String toSlug(String value) {
        String slug = value.toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z0-9]+", "-");
        slug = slug.replaceAll("^-+|-+$", "");
        return slug.isEmpty() ? "dashboard" : slug;
    }

    private String requireUser(String authorization) {
        AuthSessionService.SessionUser session = authSessionService.getSessionUser(authorization);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return session.username();
    }

    private boolean isAdmin(String username) {
        return "ALSPU".equalsIgnoreCase(username);
    }

    private Dashboard getScopedDashboard(String authorization, Long id) {
        String owner = requireUser(authorization);
        Optional<Dashboard> dashboard = isAdmin(owner)
                ? dashboardRepository.findByIdAndOwnerUsernameIsNull(id)
                : dashboardRepository.findByIdAndOwnerUsername(id, owner);
        return dashboard.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Dashboard not found"));
    }

    public record CreateDashboardRequest(String name, String alias) {}
    public record UpdateDashboardRequest(String name, String alias, String layoutJson) {}
    public record ToggleRequest(boolean enabled) {}
}
