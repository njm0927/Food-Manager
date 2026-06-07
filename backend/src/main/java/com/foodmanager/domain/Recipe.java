package com.foodmanager.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public class Recipe {
    private final String id;
    private final String name;
    private final String category;
    private final String imageUrl;
    private final List<String> ingredients;
    private final List<String> instructions;
    private final String difficulty;
    private final String cookingTime;

    public Recipe(String id, String name, String category, List<String> ingredients, List<String> instructions, String difficulty, String cookingTime) {
        this(id, name, category, null, ingredients, instructions, difficulty, cookingTime);
    }

    public Recipe(String id, String name, String category, String imageUrl, String ingredients, String instructions) {
        this(id, name, category, imageUrl, splitText(ingredients), splitText(instructions), "보통", "20~40분");
    }

    public Recipe(String id, String name, String category, String imageUrl, List<String> ingredients, List<String> instructions, String difficulty, String cookingTime) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.imageUrl = imageUrl;
        this.ingredients = ingredients == null ? List.of() : List.copyOf(ingredients);
        this.instructions = instructions == null ? List.of() : List.copyOf(instructions);
        this.difficulty = difficulty;
        this.cookingTime = cookingTime;
    }

    public String getId() {
        return id;
    }

    public String getid() {
        return getId();
    }

    public String getName() {
        return name;
    }

    public String getname() {
        return getName();
    }

    public String getCategory() {
        return category;
    }

    public String getcategory() {
        return getCategory();
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getimageUrl() {
        return getImageUrl();
    }

    public List<String> getIngredients() {
        return ingredients;
    }

    public String getingredients() {
        return String.join(", ", ingredients);
    }

    public List<String> getInstructions() {
        return instructions;
    }

    public String getinstructions() {
        return String.join("\n", instructions);
    }

    public String getDifficulty() {
        return difficulty;
    }

    public String getCookingTime() {
        return cookingTime;
    }

    public List<String> findMissingIngredients(List<Food> foods) {
        List<String> ownedNames = foods == null ? List.of() : foods.stream()
                .map(Food::getItemName)
                .filter(Objects::nonNull)
                .map((name) -> name.toLowerCase(Locale.KOREAN))
                .toList();

        return ingredients.stream()
                .filter((ingredient) -> ownedNames.stream().noneMatch((owned) -> ingredient.toLowerCase(Locale.KOREAN).contains(owned) || owned.contains(ingredient.toLowerCase(Locale.KOREAN))))
                .toList();
    }

    private static List<String> splitText(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return Arrays.stream(text.split("[,;\\n]"))
                .map(String::trim)
                .filter((value) -> !value.isBlank())
                .toList();
    }
}
