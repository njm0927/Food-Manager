package com.foodmanager.domain;

public enum Category {
    MEAT("육류"),
    SEAFOOD("생선/해산물"),
    VEGETABLE("채소"),
    FRUIT("과일"),
    DAIRY("유제품/기타"),
    GRAIN("곡류/면류"),
    SEASONING("양념/조미료"),
    ETC("기타");

    private final String label;

    Category(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Category fromLabel(String label) {
        if (label == null || label.isBlank()) {
            return ETC;
        }

        for (Category category : values()) {
            if (category.label.equals(label) || category.name().equalsIgnoreCase(label)) {
                return category;
            }
        }

        return ETC;
    }
}
