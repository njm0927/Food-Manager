package com.foodmanager.domain;

public class Market {
    private final Long id;
    private final Long sellerId;
    private final String name;
    private final String businessNumber;
    private final Address address;

    public Market(Long id, Long sellerId, String name, String businessNumber, Address address) {
        this.id = id;
        this.sellerId = sellerId;
        this.name = name;
        this.businessNumber = businessNumber;
        this.address = address;
    }
}