package com.foodmanager.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Food {
    private final Long id;
    private final Long sellerId;
    private final String itemName;
    private final Category category;
    private final String subcategory;
    private final String emoji;
    private final Integer quantity;
    private final String unit;
    private final BigDecimal price;
    private final LocalDate expiryDate;

    public Food(
            Long id,
            Long sellerId,
            String itemName,
            Category category,
            String subcategory,
            String emoji,
            Integer quantity,
            String unit,
            BigDecimal price,
            LocalDate expiryDate
    ) {
        this.id = id;
        this.sellerId = sellerId;
        this.itemName = itemName;
        this.category = category;
        this.subcategory = subcategory;
        this.emoji = emoji;
        this.quantity = quantity;
        this.unit = unit;
        this.price = price;
        this.expiryDate = expiryDate;
    }

    public Long id() {
        return id;
    }

    public Long sellerId() {
        return sellerId;
    }

    public String itemName() {
        return itemName;
    }

    public Category category() {
        return category;
    }

    public String subcategory() {
        return subcategory;
    }

    public String emoji() {
        return emoji;
    }

    public Integer quantity() {
        return quantity;
    }

    public String unit() {
        return unit;
    }

    public BigDecimal price() {
        return price;
    }

    public LocalDate expiryDate() {
        return expiryDate;
    }
}
