package com.foodmanager.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class User {
    private final Long id;
    private final String userId;
    private final String passwordHash;
    private final String name;
    private final String role;
    private final boolean notificationEnabled;
    private final List<Food> foods = new ArrayList<>();
    private final List<Notification> notifications = new ArrayList<>();
    private Address address;
    private NotificationSetting notificationSetting;

    public User(Long id, String userId, String passwordHash, String name, String role, boolean notificationEnabled) {
        this.id = id;
        this.userId = userId;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = role;
        this.notificationEnabled = notificationEnabled;
    }

    public Long getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getName() {
        return name;
    }

    public String getRole() {
        return role;
    }

    public boolean isNotificationEnabled() {
        return notificationEnabled;
    }

    public boolean isConsumer() {
        return "consumer".equals(role);
    }

    public boolean isSeller() {
        return "seller".equals(role);
    }

    public void addFood(Food food) {
        if (food != null) {
            foods.add(food);
        }
    }

    public void updateFood(Food food) {
        if (food == null || food.getId() == null) {
            return;
        }
        deleteFood(food.getId());
        foods.add(food);
    }

    public void deleteFood(Long foodId) {
        if (foodId != null) {
            foods.removeIf((food) -> foodId.equals(food.getId()));
        }
    }

    public List<Food> viewFoods() {
        return Collections.unmodifiableList(foods);
    }

    public void setNotification(NotificationSetting setting) {
        this.notificationSetting = setting;
    }

    public NotificationSetting getNotificationSetting() {
        return notificationSetting;
    }

    public void registerAddress(Address address) {
        this.address = address;
    }

    public void updateAddress(Address address) {
        this.address = address;
    }

    public Address getAddress() {
        return address;
    }

    public void receiveNotification(Notification notification) {
        if (notification != null) {
            notifications.add(notification);
        }
    }

    public List<Notification> getNotifications() {
        return Collections.unmodifiableList(notifications);
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


