package com.foodmanager.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Seller extends User {
    private final String businessName;
    private final String businessOwnerName;
    private final String businessNumber;
    private final String businessCategory;
    private final List<Sale> saleInfos = new ArrayList<>();

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

    public String getBusinessName() {
        return businessName;
    }

    public String businessOwnerName() {
        return businessOwnerName;
    }

    public String getBusinessOwnerName() {
        return businessOwnerName;
    }

    public String businessNumber() {
        return businessNumber;
    }

    public String getBusinessNumber() {
        return businessNumber;
    }

    public String businessCategory() {
        return businessCategory;
    }

    public String getBusinessCategory() {
        return businessCategory;
    }

    public void registerSaleInfo(Sale sale) {
        if (sale != null) {
            saleInfos.add(sale);
        }
    }

    public List<Sale> getSaleInfos() {
        return Collections.unmodifiableList(saleInfos);
    }

    public boolean canRegisterSaleInfo() {
        return true;
    }
}
