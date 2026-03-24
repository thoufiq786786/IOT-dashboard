package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String masterId;
    private String slaveId;
    private String ipAddress;
    private Integer port;
    private String endian;
    private String type;
    private String status;
    private String ownerUsername;

    public Device() {}

    public Device(String name, String masterId, String slaveId, String ipAddress,
                  Integer port, String endian, String type, String status) {
        this.name = name;
        this.masterId = masterId;
        this.slaveId = slaveId;
        this.ipAddress = ipAddress;
        this.port = port;
        this.endian = endian;
        this.type = type;
        this.status = status;
    }

    public Long getId() { return id; }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public String getMasterId() { return masterId; }

    public void setMasterId(String masterId) { this.masterId = masterId; }

    public String getSlaveId() { return slaveId; }

    public void setSlaveId(String slaveId) { this.slaveId = slaveId; }

    public String getIpAddress() { return ipAddress; }

    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public Integer getPort() { return port; }

    public void setPort(Integer port) { this.port = port; }

    public String getEndian() { return endian; }

    public void setEndian(String endian) { this.endian = endian; }

    public String getType() { return type; }

    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }

    public void setStatus(String status) { this.status = status; }

    public String getOwnerUsername() { return ownerUsername; }

    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }
}
