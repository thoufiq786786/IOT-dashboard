package com.example.demo.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Device;
import com.example.demo.model.Feed;
import com.example.demo.model.Input;
import com.example.demo.repository.DeviceRepository;
import com.example.demo.repository.FeedDataRepository;
import com.example.demo.repository.FeedRepository;
import com.example.demo.repository.InputRepository;
import com.example.demo.service.AuthSessionService;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "http://localhost:5173")
public class DeviceController {

    private final DeviceRepository repository;
    private final InputRepository inputRepository;
    private final FeedRepository feedRepository;
    private final FeedDataRepository feedDataRepository;
    private final AuthSessionService authSessionService;

    public DeviceController(DeviceRepository repository,
                            InputRepository inputRepository,
                            FeedRepository feedRepository,
                            FeedDataRepository feedDataRepository,
                            AuthSessionService authSessionService) {
        this.repository = repository;
        this.inputRepository = inputRepository;
        this.feedRepository = feedRepository;
        this.feedDataRepository = feedDataRepository;
        this.authSessionService = authSessionService;
    }

    @GetMapping
    public List<Device> getAll(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);
        return isAdmin(owner)
                ? repository.findByOwnerUsernameIsNull()
                : repository.findByOwnerUsername(owner);
    }

    @PostMapping
    public Device create(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                         @RequestBody Device device) {
        String owner = requireUser(authorization);
        device.setOwnerUsername(isAdmin(owner) ? null : owner);
        return repository.save(device);
    }

    @GetMapping("/{id}")
    public Device getById(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                          @PathVariable Long id) {
        return getScopedDevice(authorization, id);
    }

    @PutMapping("/{id}")
    public Device update(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                         @PathVariable Long id, @RequestBody Device payload) {
        Device device = getScopedDevice(authorization, id);
        device.setName(payload.getName());
        device.setMasterId(payload.getMasterId());
        device.setSlaveId(payload.getSlaveId());
        device.setIpAddress(payload.getIpAddress());
        device.setPort(payload.getPort());
        device.setEndian(payload.getEndian());
        device.setType(payload.getType());
        device.setStatus(payload.getStatus());
        return repository.save(device);
    }

    @Transactional
    @DeleteMapping("/{id}")
    public void delete(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                       @PathVariable Long id) {
        Device device = getScopedDevice(authorization, id);
        List<Input> inputs = inputRepository.findByDeviceId(device.getId());
        List<Long> inputIds = inputs.stream().map(Input::getId).toList();

        if (!inputIds.isEmpty()) {
            List<Feed> feeds = feedRepository.findByInputIdIn(inputIds);
            List<Long> feedIds = feeds.stream().map(Feed::getId).toList();

            if (!feedIds.isEmpty()) {
                feedDataRepository.deleteByFeedIdIn(feedIds);
                feedRepository.deleteAllById(feedIds);
            }

            inputRepository.deleteAllById(inputIds);
        }

        repository.deleteById(device.getId());
    }

    private String requireUser(String authorization) {
        AuthSessionService.SessionUser session = authSessionService.getSessionUser(authorization);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not logged in");
        }
        return session.username();
    }

    private Device getScopedDevice(String authorization, Long id) {
        String owner = requireUser(authorization);
        Optional<Device> device = "ALSPU".equalsIgnoreCase(owner)
                ? repository.findByIdAndOwnerUsernameIsNull(id)
                : repository.findByIdAndOwnerUsername(id, owner);
        return device.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));
    }

    private boolean isAdmin(String username) {
        return "ALSPU".equalsIgnoreCase(username);
    }
}
