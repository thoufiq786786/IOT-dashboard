package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private Boolean active = true;

    private String email;
    private String rwApiKey;
    private String roApiKey;
    private String name;
    private String location;
    private String timezone = "Asia/Kolkata";
    private String language = "en";
    private String startingPage = "dashboard/view/operation-status";
    private String themeColour;
    private String sidebarColour;

    public UserAccount() {}

    public UserAccount(String username, String passwordHash, String role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public Boolean getActive() {
        return active;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRwApiKey() { return rwApiKey; }
    public void setRwApiKey(String rwApiKey) { this.rwApiKey = rwApiKey; }

    public String getRoApiKey() { return roApiKey; }
    public void setRoApiKey(String roApiKey) { this.roApiKey = roApiKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getStartingPage() { return startingPage; }
    public void setStartingPage(String startingPage) { this.startingPage = startingPage; }

    public String getThemeColour() { return themeColour; }
    public void setThemeColour(String themeColour) { this.themeColour = themeColour; }

    public String getSidebarColour() { return sidebarColour; }
    public void setSidebarColour(String sidebarColour) { this.sidebarColour = sidebarColour; }
}
