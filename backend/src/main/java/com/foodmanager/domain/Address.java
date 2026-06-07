package com.foodmanager.domain;

public class Address {
    private final Long id;
    private final Long userId;
    private final String postcode;
    private final String address;
    private String detailAddress;
    private final boolean defaultAddress;

    public Address(Long id, String postcode, String address, String detailAddress, boolean defaultAddress) {
        this(id, null, postcode, address, detailAddress, defaultAddress);
    }

    public Address(Long id, Long userId, String postcode, String address, String detailAddress, boolean defaultAddress) {
        this.id = id;
        this.userId = userId;
        this.postcode = postcode;
        this.address = address;
        this.detailAddress = detailAddress;
        this.defaultAddress = defaultAddress;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getPostcode() {
        return postcode;
    }

    public String getAddress() {
        return address;
    }

    public String getDetailAddress() {
        return detailAddress;
    }

    public boolean isDefaultAddress() {
        return defaultAddress;
    }

    public void changeDetailAddress(String detailAddress) {
        this.detailAddress = detailAddress;
    }

    public String extractRegion() {
        if (address == null || address.isBlank()) {
            return "";
        }
        String[] parts = address.trim().split("\\s+");
        if (parts.length == 0) {
            return "";
        }
        return parts[0];
    }
}
