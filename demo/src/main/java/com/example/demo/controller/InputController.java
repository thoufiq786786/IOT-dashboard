package com.example.demo.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Device;
import com.example.demo.model.Feed;
import com.example.demo.model.FeedData;
import com.example.demo.model.Input;
import com.example.demo.repository.DeviceRepository;
import com.example.demo.repository.FeedDataRepository;
import com.example.demo.repository.FeedRepository;
import com.example.demo.repository.InputRepository;
import com.example.demo.service.AuthSessionService;
import com.example.demo.service.ModbusService;

@RestController
@RequestMapping("/api/inputs")
@CrossOrigin(origins = "http://localhost:5173")
public class InputController {

    private final InputRepository inputRepository;
    private final DeviceRepository deviceRepository;
    private final FeedRepository feedRepository;
    private final FeedDataRepository feedDataRepository;
    private final ModbusService modbusService;
    private final AuthSessionService authSessionService;

    public InputController(InputRepository inputRepository,
                           DeviceRepository deviceRepository,
                           FeedRepository feedRepository,
                           FeedDataRepository feedDataRepository,
                           ModbusService modbusService,
                           AuthSessionService authSessionService) {
        this.inputRepository = inputRepository;
        this.deviceRepository = deviceRepository;
        this.feedRepository = feedRepository;
        this.feedDataRepository = feedDataRepository;
        this.modbusService = modbusService;
        this.authSessionService = authSessionService;
    }

    @GetMapping
    public List<Input> getAll(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization) {
        String owner = requireUser(authorization);
        return isAdmin(owner) ? inputRepository.findByOwnerUsernameIsNull() : inputRepository.findByOwnerUsername(owner);
    }

    @GetMapping("/device/{deviceId}")
    public List<Input> getByDevice(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                                   @PathVariable Long deviceId) {
        String owner = requireUser(authorization);
        return isAdmin(owner)
                ? inputRepository.findByDeviceId(deviceId).stream().filter(i -> i.getOwnerUsername() == null).toList()
                : inputRepository.findByDeviceIdAndOwnerUsername(deviceId, owner);
    }

    @GetMapping("/live/device/{deviceId}")
    public List<InputLiveResponse> getLiveByDevice(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                                                   @PathVariable Long deviceId) {
        String owner = requireUser(authorization);
        List<Input> inputs = isAdmin(owner)
                ? inputRepository.findByDeviceId(deviceId).stream().filter(i -> i.getOwnerUsername() == null).toList()
                : inputRepository.findByDeviceIdAndOwnerUsername(deviceId, owner);
        List<InputLiveResponse> live = new ArrayList<>();

        Map<Long, FeedData> latestByInputId = new HashMap<>();
        for (Input input : inputs) {
            List<Feed> feeds = isAdmin(owner)
                    ? feedRepository.findByInputId(input.getId()).stream().filter(f -> f.getOwnerUsername() == null).toList()
                    : feedRepository.findByInputIdAndOwnerUsername(input.getId(), owner);
            FeedData newest = feeds.stream()
                    .map(f -> feedDataRepository.findTopByFeedIdOrderByTimestampDesc(f.getId()))
                    .filter(fd -> fd != null && fd.getTimestamp() != null)
                    .max(Comparator.comparing(FeedData::getTimestamp))
                    .orElse(null);

            if (newest != null) {
                latestByInputId.put(input.getId(), newest);
            }
        }

        for (Input input : inputs) {
            FeedData latest = latestByInputId.get(input.getId());
            Double value = latest != null ? latest.getValue() : null;
            LocalDateTime timestamp = latest != null ? latest.getTimestamp() : null;

            if (value == null) {
                value = modbusService.readInputValue(input);
                if (value != null) {
                    timestamp = LocalDateTime.now();
                }
            }

            live.add(new InputLiveResponse(
                    input.getId(),
                    input.getName(),
                    input.getRegisterAddress(),
                    value,
                    timestamp
            ));
        }
        return live;
    }

    @PostMapping("/{deviceId}")
    public Input create(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                        @PathVariable Long deviceId,
                        @RequestBody Input input) {
        String owner = requireUser(authorization);

        Optional<Device> deviceOpt = isAdmin(owner)
                ? deviceRepository.findByIdAndOwnerUsernameIsNull(deviceId)
                : deviceRepository.findByIdAndOwnerUsername(deviceId, owner);
        Device device = deviceOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found"));

        input.setDevice(device);
        input.setOwnerUsername(isAdmin(owner) ? null : owner);

        return inputRepository.save(input);
    }

    @Transactional
    @DeleteMapping("/{id}")
    public void delete(@org.springframework.web.bind.annotation.RequestHeader(value = "Authorization", required = false) String authorization,
                       @PathVariable Long id) {
        String owner = requireUser(authorization);
        Optional<Input> inputOpt = isAdmin(owner)
                ? inputRepository.findByIdAndOwnerUsernameIsNull(id)
                : inputRepository.findByIdAndOwnerUsername(id, owner);
        Input input = inputOpt.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Input not found"));

        List<Feed> feeds = isAdmin(owner)
                ? feedRepository.findByInputId(input.getId()).stream().filter(f -> f.getOwnerUsername() == null).toList()
                : feedRepository.findByInputIdAndOwnerUsername(input.getId(), owner);
        List<Long> feedIds = feeds.stream().map(Feed::getId).toList();

        if (!feedIds.isEmpty()) {
            feedDataRepository.deleteByFeedIdIn(feedIds);
            feedRepository.deleteAllById(feedIds);
        }

        inputRepository.deleteById(input.getId());
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

    public record InputLiveResponse(
            Long inputId,
            String inputName,
            String registerAddress,
            Double value,
            LocalDateTime timestamp
    ) {}
}
