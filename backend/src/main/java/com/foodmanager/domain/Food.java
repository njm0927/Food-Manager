package com.foodmanager.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public class Food {
    private final Long id;
    private final Long sellerId;
    private final String itemName;
    private final Category category;
    private final String subcategory;
    private final String emoji;
    private Integer quantity;
    private final String unit;
    private final BigDecimal price;
    private LocalDate expiryDate;

    public Food(Long id, String itemName, String category, String subcategory, Integer quantity, String unit, LocalDate expiryDate) {
        this(id, null, itemName, Category.fromLabel(category), subcategory, null, quantity, unit, BigDecimal.ZERO, expiryDate);
    }

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
        this.category = category == null ? Category.ETC : category;
        this.subcategory = subcategory;
        this.emoji = emoji;
        this.quantity = quantity;
        this.unit = unit;
        this.price = price == null ? BigDecimal.ZERO : price;
        this.expiryDate = expiryDate;
    }

    public Long id() {
        return id;
    }

    public Long getId() {
        return id;
    }

    public Long sellerId() {
        return sellerId;
    }

    public Long getSellerId() {
        return sellerId;
    }

    public String itemName() {
        return itemName;
    }

    public String getItemName() {
        return itemName;
    }

    public Category category() {
        return category;
    }

    public String getCategory() {
        return category.label();
    }

    public String subcategory() {
        return subcategory;
    }

    public String getSubcategory() {
        return subcategory;
    }

    public String emoji() {
        return emoji;
    }

    public String getEmoji() {
        return emoji;
    }

    public Integer quantity() {
        return quantity;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public String unit() {
        return unit;
    }

    public String getUnit() {
        return unit;
    }

    public BigDecimal price() {
        return price;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public LocalDate expiryDate() {
        return expiryDate;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void updateQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public void updateExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public Integer calculateDaysUntilExpiry(LocalDate today) {
        if (today == null || expiryDate == null) {
            return null;
        }
        return Math.toIntExact(ChronoUnit.DAYS.between(today, expiryDate));
    }

    public Integer calculateDaysUntillExpiry(LocalDate today) {
        return calculateDaysUntilExpiry(today);
    }

    public boolean isExpired(LocalDate today) {
        return today != null && expiryDate != null && expiryDate.isBefore(today);
    }
}
