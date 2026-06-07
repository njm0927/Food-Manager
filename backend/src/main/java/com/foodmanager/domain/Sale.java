package com.foodmanager.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class Sale {
    private final Long id;
    private final Long foodId;
    private final Long marketId;
    private final BigDecimal originalPrice;
    private final BigDecimal salePrice;
    private final Integer discountRate;
    private final LocalDate startDate;
    private final LocalDate endDate;

    public Sale(Long id, BigDecimal originalPrice, BigDecimal salePrice, LocalDate startDate, LocalDate endDate) {
        this(id, null, null, originalPrice, salePrice, null, startDate, endDate);
    }

    public Sale(Long id, Long foodId, Long marketId, BigDecimal originalPrice, BigDecimal salePrice, Integer discountRate, LocalDateTime startsAt, LocalDateTime endsAt) {
        this(
            id,
            foodId,
            marketId,
            originalPrice,
            salePrice,
            discountRate,
            startsAt == null ? null : startsAt.toLocalDate(),
            endsAt == null ? null : endsAt.toLocalDate()
        );
    }

    public Sale(Long id, Long foodId, Long marketId, BigDecimal originalPrice, BigDecimal salePrice, Integer discountRate, LocalDate startDate, LocalDate endDate) {
        this.id = id;
        this.foodId = foodId;
        this.marketId = marketId;
        this.originalPrice = originalPrice;
        this.salePrice = salePrice;
        this.discountRate = discountRate;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long id() {
        return id;
    }

    public Long getId() {
        return id;
    }

    public Long foodId() {
        return foodId;
    }

    public Long getFoodId() {
        return foodId;
    }

    public Long marketId() {
        return marketId;
    }

    public Long getMarketId() {
        return marketId;
    }

    public BigDecimal originalPrice() {
        return originalPrice;
    }

    public BigDecimal getOriginalPrice() {
        return originalPrice;
    }

    public BigDecimal salePrice() {
        return salePrice;
    }

    public BigDecimal getSalePrice() {
        return salePrice;
    }

    public Integer discountRate() {
        return calculateDiscountRate();
    }

    public Integer getDiscountRate() {
        return calculateDiscountRate();
    }

    public LocalDate startDate() {
        return startDate;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate endDate() {
        return endDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public Integer calculateDiscountRate() {
        if (discountRate != null) {
            return discountRate;
        }
        if (originalPrice == null || salePrice == null || BigDecimal.ZERO.compareTo(originalPrice) == 0) {
            return 0;
        }
        BigDecimal discount = originalPrice.subtract(salePrice);
        return discount.multiply(BigDecimal.valueOf(100)).divide(originalPrice, 0, RoundingMode.HALF_UP).intValue();
    }

    public boolean isActive(LocalDate today) {
        if (today == null || startDate == null || endDate == null) {
            return false;
        }
        return !today.isBefore(startDate) && !today.isAfter(endDate);
    }
}
