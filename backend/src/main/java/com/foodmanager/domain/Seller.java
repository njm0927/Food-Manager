package com.foodmanager.domain;

public class Seller extends User {
    private final String businessName;
    private final String businessOwnerName;
    private final String businessNumber;
    private final String businessCategory;

    public Seller(
            Long id,
            String userId,
            String passwordHash,
            String name,
            boolean notificationEnabled,
            String businessName,
            String businessOwnerName,
            String businessNumber,
            String businessCategory
    ) {
        super(id, userId, passwordHash, name, "seller", notificationEnabled);
        this.businessName = businessName;
        this.businessOwnerName = businessOwnerName;
        this.businessNumber = businessNumber;
        this.businessCategory = businessCategory;
    }

    public String businessName() {
        return businessName;
    }

    public String businessOwnerName() {
        return businessOwnerName;
    }

    public String businessNumber() {
        return businessNumber;
    }

    public String businessCategory() {
        return businessCategory;
    }

    public boolean canRegisterSaleInfo() {
        return true;
    }
}
