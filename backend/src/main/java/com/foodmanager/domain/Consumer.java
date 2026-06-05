package com.foodmanager.domain;

public class Consumer extends User {
    public Consumer(Long id, String userId, String passwordHash, String name, boolean notificationEnabled) {
        super(id, userId, passwordHash, name, "consumer", notificationEnabled);
    }

    public boolean canUseSaleInfo() {
        return true;
    }

    public boolean canSetRecipe() {
        return true;
    }
}
