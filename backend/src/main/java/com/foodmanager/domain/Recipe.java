package com.foodmanager.domain;

public class Recipe {
    private final String id;
    private final String name;
    private final String category;
    private final String imageUrl;
    private final String ingredients;
    private final String instructions;

    public Recipe(String id, String name, String category, String imageUrl, String ingredients, String instructions) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.imageUrl = imageUrl;
        this.ingredients = ingredients;
        this.instructions = instructions;
    }

    public String getid() {
        return id;
    }

    public String getname() {
        return name;
    }

    public String getcategory() {
        return category;
    }

    public String getimageUrl() {
        return imageUrl;
    }

    public String getingredients() {
        return ingredients;
    }

    public String getinstructions() {
        return instructions;
    }
}
