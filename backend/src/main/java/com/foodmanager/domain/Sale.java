package com.foodmanager.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class Sale {
    private final Long id;
    private final Long foodId;
    private final Long marketId;
    private final BigDecimal originalPrice;
    private final BigDecimal salePrice;
    private final Integer discountRate;
    private final LocalDateTime startsAt;
    private final LocalDateTime endsAt;

    public Sale(Long id, Long foodId, Long marketId, BigDecimal originalPrice, BigDecimal salePrice, Integer discountRate, LocalDateTime startsAt, LocalDateTime endsAt) {
        this.id = id;
        this.foodId = foodId;
        this.marketId = marketId;
        this.originalPrice = originalPrice;
        this.salePrice = salePrice;
        this.discountRate = discountRate;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }
}
