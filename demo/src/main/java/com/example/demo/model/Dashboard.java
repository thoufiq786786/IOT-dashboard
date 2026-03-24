package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class Dashboard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false, unique = true)
    private String alias;

    private String ownerUsername;

    private Boolean isDefault = false;
    private Boolean isPublic = false;
    private Boolean isPublished = false;

    @Lob
    private String layoutJson;

    public Dashboard() {}

    public Dashboard(String name, String alias) {
        this.name = name;
        this.alias = alias;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAlias() {
        return alias;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public Boolean getIsPublic() {
        return isPublic;
    }

    public Boolean getIsPublished() {
        return isPublished;
    }

    public String getLayoutJson() {
        return layoutJson;
    }

    public String getOwnerUsername() {
        return ownerUsername;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public void setIsPublished(Boolean isPublished) {
        this.isPublished = isPublished;
    }

    public void setLayoutJson(String layoutJson) {
        this.layoutJson = layoutJson;
    }

    public void setOwnerUsername(String ownerUsername) {
        this.ownerUsername = ownerUsername;
    }
}
