package com.foodmanager.domain;

public class Address {
    private final Long id;
    private final Long userId;
    private final String postcode;
    private final String address;
    private final String detailAddress;
    private final boolean defaultAddress;

    public Address(Long id, Long userId, String postcode, String address, String detailAddress, boolean defaultAddress) {
        this.id = id;
        this.userId = userId;
        this.postcode = postcode;
        this.address = address;
        this.detailAddress = detailAddress;
        this.defaultAddress = defaultAddress;
    }
}
