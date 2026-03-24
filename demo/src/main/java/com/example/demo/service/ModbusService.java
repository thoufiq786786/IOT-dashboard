package com.example.demo.service;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.example.demo.model.Device;
import com.example.demo.model.Input;
import com.intelligt.modbus.jlibmodbus.master.ModbusMaster;
import com.intelligt.modbus.jlibmodbus.master.ModbusMasterFactory;
import com.intelligt.modbus.jlibmodbus.tcp.TcpParameters;

@Service
public class ModbusService {

    private static final int DEFAULT_PORT = 502;
    private static final int DEFAULT_SLAVE_ID = 1;
    private static final int RESPONSE_TIMEOUT_MS = 3000;
    private static final int MAX_RETRIES = 3;

    private final Map<String, GatewaySession> sessions = new ConcurrentHashMap<>();

    public Double readInputValue(Input input) {

        if (input == null || input.getDevice() == null) {
            return null;
        }

        Device device = input.getDevice();

        if (!"Enable".equalsIgnoreCase(device.getStatus())) {
            return null;
        }

        if (!"TCP".equalsIgnoreCase(device.getType())) {
            return null;
        }

        if (device.getIpAddress() == null || device.getIpAddress().isBlank()) {
            return null;
        }

        if (input.getRegisterAddress() == null || input.getRegisterAddress().isBlank()) {
            return null;
        }

        String endpoint = buildEndpoint(device);
        GatewaySession session = sessions.computeIfAbsent(
                endpoint,
                key -> new GatewaySession(device.getIpAddress().trim(), getPort(device))
        );

        try {
            RegisterSpec spec = parseRegister(input.getRegisterAddress());
            List<Integer> slaveCandidates = getSlaveCandidates(device);
            return session.readWithRetry(slaveCandidates, spec, normalizeWordOrder(device.getEndian()));
        } catch (Exception e) {
            System.out.println("Modbus read error for input " + input.getName() + " (" + input.getRegisterAddress() + "): " + e.getMessage());
            return null;
        }
    }

    private String normalizeWordOrder(String endian) {
        if (endian == null || endian.isBlank()) {
            // Match Python decoder: byteorder=Big, wordorder=Little
            return "Little";
        }
        return endian;
    }

    private String buildEndpoint(Device device) {
        return (device.getIpAddress().trim() + ":" + getPort(device)).toLowerCase();
    }

    private int getPort(Device device) {
        return device.getPort() == null ? DEFAULT_PORT : device.getPort();
    }

    private List<Integer> getSlaveCandidates(Device device) {
        Set<Integer> candidates = new LinkedHashSet<>();

        Integer slave = parseUnitId(device.getSlaveId());
        if (slave != null) {
            candidates.add(slave);
        }

        Integer master = parseUnitId(device.getMasterId());
        if (master != null) {
            candidates.add(master);
        }

        // Your QModMaster working case uses unit-id 1.
        candidates.add(DEFAULT_SLAVE_ID);

        return new ArrayList<>(candidates);
    }

    private Integer parseUnitId(String raw) {
        try {
            if (raw == null || raw.isBlank()) {
                return null;
            }
            int id = Integer.parseInt(raw.trim());
            if (id < 1 || id > 247) {
                return null;
            }
            return id;
        } catch (Exception ignored) {
            return null;
        }
    }

    private RegisterSpec parseRegister(String registerAddress) {
        String[] parts = registerAddress.trim().split("_");
        String addressPart = parts[0].trim();

        if (!addressPart.matches("\\d+")) {
            throw new IllegalArgumentException("Invalid register address: " + registerAddress);
        }

        int registerNumber = Integer.parseInt(addressPart);
        String type = parts.length > 1 ? parts[1].trim().toUpperCase() : "U16";

        RegisterArea area;
        int primaryAddress;
        int alternateAddress;

        if (registerNumber >= 40001 && registerNumber <= 49999) {
            area = RegisterArea.HOLDING;
            primaryAddress = registerNumber - 40001;   // 40158 -> 157
            alternateAddress = registerNumber - 40000; // 40158 -> 158
        } else if (registerNumber >= 30001 && registerNumber <= 39999) {
            area = RegisterArea.INPUT;
            primaryAddress = registerNumber - 30001;
            alternateAddress = registerNumber - 30000;
        } else if (registerNumber >= 1 && registerNumber <= 65535) {
            // Raw addressing fallback: many tools use direct 0/1 based numbers
            area = RegisterArea.HOLDING;
            primaryAddress = registerNumber;
            alternateAddress = registerNumber - 1;
        } else {
            throw new IllegalArgumentException("Register out of range: " + registerAddress);
        }

        int wordCount = is32BitType(type) ? 2 : 1;
        return new RegisterSpec(area, primaryAddress, alternateAddress, type, wordCount);
    }

    private boolean is32BitType(String type) {
        return "F".equals(type)
                || "FLOAT".equals(type)
                || "L".equals(type)
                || "I32".equals(type)
                || "S32".equals(type)
                || "U32".equals(type);
    }

    private Double decodeValue(int[] words, String type, String endian) {
        if (words == null || words.length == 0) {
            return null;
        }

        if (words.length == 1) {
            int value = words[0] & 0xFFFF;
            if ("S16".equals(type)) {
                return (double) (short) value;
            }
            return (double) value;
        }

        int first = words[0] & 0xFFFF;
        int second = words[1] & 0xFFFF;
        boolean littleWordOrder = "Little".equalsIgnoreCase(endian);

        int highWord = littleWordOrder ? second : first;
        int lowWord = littleWordOrder ? first : second;
        int combined = (highWord << 16) | lowWord;

        if ("F".equals(type) || "FLOAT".equals(type)) {
            return (double) Float.intBitsToFloat(combined);
        }

        if ("U32".equals(type)) {
            return (double) Integer.toUnsignedLong(combined);
        }

        return (double) combined;
    }

    private enum RegisterArea {
        HOLDING,
        INPUT
    }

    private record ReadAttempt(RegisterArea area, int address) {
    }

    private record RegisterSpec(
            RegisterArea preferredArea,
            int primaryAddress,
            int alternateAddress,
            String type,
            int wordCount
    ) {
        List<ReadAttempt> attempts() {
            List<ReadAttempt> attempts = new ArrayList<>();

            if (isValid(primaryAddress, wordCount)) {
                attempts.add(new ReadAttempt(preferredArea, primaryAddress));
            }
            if (alternateAddress != primaryAddress && isValid(alternateAddress, wordCount)) {
                attempts.add(new ReadAttempt(preferredArea, alternateAddress));
            }

            // Last fallback: try opposite register area with same addresses.
            RegisterArea opposite = preferredArea == RegisterArea.HOLDING ? RegisterArea.INPUT : RegisterArea.HOLDING;
            if (isValid(primaryAddress, wordCount)) {
                attempts.add(new ReadAttempt(opposite, primaryAddress));
            }
            if (alternateAddress != primaryAddress && isValid(alternateAddress, wordCount)) {
                attempts.add(new ReadAttempt(opposite, alternateAddress));
            }

            return attempts;
        }

        private boolean isValid(int address, int wordCount) {
            return address >= 0 && address + wordCount <= 65536;
        }
    }

    private final class GatewaySession {
        private final String host;
        private final int port;
        private ModbusMaster master;

        private GatewaySession(String host, int port) {
            this.host = host;
            this.port = port;
        }

        private synchronized Double readWithRetry(List<Integer> slaveCandidates, RegisterSpec spec, String endian) {
            Exception lastError = null;

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                for (int slaveId : slaveCandidates) {
                    for (ReadAttempt readAttempt : spec.attempts()) {
                        try {
                            ensureConnected();

                            int[] words = readAttempt.area() == RegisterArea.INPUT
                                    ? master.readInputRegisters(slaveId, readAttempt.address(), spec.wordCount())
                                    : master.readHoldingRegisters(slaveId, readAttempt.address(), spec.wordCount());

                            if (words == null || words.length < spec.wordCount()) {
                                continue;
                            }

                            return decodeValue(words, spec.type(), endian);
                        } catch (Exception ex) {
                            lastError = ex;
                            resetConnection();
                        }
                    }
                }
            }

            System.out.println(
                    "Modbus read failed. host=" + host
                            + " port=" + port
                            + " slaveCandidates=" + slaveCandidates
                            + " registerType=" + spec.type()
                            + " primaryAddress=" + spec.primaryAddress()
                            + " alternateAddress=" + spec.alternateAddress()
                            + " error=" + (lastError == null ? "unknown" : lastError.getMessage())
            );
            return null;
        }

        private void ensureConnected() throws Exception {
            if (master != null && master.isConnected()) {
                return;
            }

            TcpParameters tcpParameters = new TcpParameters();
            tcpParameters.setHost(InetAddress.getByName(host));
            tcpParameters.setPort(port);
            tcpParameters.setKeepAlive(true);

            master = ModbusMasterFactory.createModbusMasterTCP(tcpParameters);
            master.setResponseTimeout(RESPONSE_TIMEOUT_MS);
            master.connect();
        }

        private void resetConnection() {
            if (master != null) {
                try {
                    if (master.isConnected()) {
                        master.disconnect();
                    }
                } catch (Exception ignored) {
                }
            }
            master = null;
        }
    }
}
