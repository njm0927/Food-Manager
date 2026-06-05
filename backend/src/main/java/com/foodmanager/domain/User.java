package com.foodmanager.domain;

public class User {
    private final Long id;
    private final String userId;
    private final String passwordHash;
    private final String name;
    private final String role;
    private final boolean notificationEnabled;

    public User(Long id, String userId, String passwordHash, String name, String role, boolean notificationEnabled) {
        this.id = id;
        this.userId = userId;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.notificationEnabled = notificationEnabled;
    }

    public Long id() {
        return id;
    }

    public String userId() {
        return userId;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public String name() {
        return name;
    }

    public String role() {
        return role;
    }

    public boolean notificationEnabled() {
        return notificationEnabled;
    }

    public boolean isConsumer() {
        return "consumer".equals(role);
    }

    public boolean isSeller() {
        return "seller".equals(role);
    }

    public boolean canReceiveNotification() {
        return notificationEnabled;
    }

    public boolean canAddFood() {
        return true;
    }

    public boolean canEditFood() {
        return true;
    }

    public boolean canDeleteFood() {
        return true;
    }

    public boolean canViewFood() {
        return true;
    }

    public boolean canSetNotification() {
        return true;
    }

    public boolean canRegisterLocation() {
        return true;
    }

    public String displayName() {
        return name == null || name.isBlank() ? userId : name;
    }
}
