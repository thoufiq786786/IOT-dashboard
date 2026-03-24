package com.example.demo.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Input {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String registerAddress;

    @ManyToOne
    @JoinColumn(name = "device_id")
    private Device device;

    private String ownerUsername;

    public Input() {}

    public Input(String name, String registerAddress, Device device) {
        this.name = name;
        this.registerAddress = registerAddress;
        this.device = device;
    }

    public Long getId() { return id; }

    public String getName() { return name; }

    public String getRegisterAddress() { return registerAddress; }

    public Device getDevice() { return device; }

    public String getOwnerUsername() { return ownerUsername; }

    public void setName(String name) { this.name = name; }

    public void setRegisterAddress(String registerAddress) {
        this.registerAddress = registerAddress;
    }

    public void setDevice(Device device) { this.device = device; }

    public void setOwnerUsername(String ownerUsername) { this.ownerUsername = ownerUsername; }
}
