package com.foodmanager.domain;

import java.util.List;

public class Consumer extends User {
    public Consumer(Long id, String userId, String passwordHash, String name, boolean notificationEnabled) {
        super(id, userId, passwordHash, name, "consumer", notificationEnabled);
    }

    public List<Sale> viewSaleInfo(List<Sale> sales) {
        return sales == null ? List.of() : List.copyOf(sales);
    }

    public List<Recipe> recommendRecipe(List<Food> foods) {
        return List.of();
    }

    public boolean canUseSaleInfo() {
        return true;
    }

    public boolean canSetRecipe() {
        return true;
    }
}
