package com.foodmanager.domain;

import java.time.LocalDateTime;

public class Notification {
    private final Long id;
    private final Long userId;
    private final String title;
    private final String message;
    private final boolean read;
    private final LocalDateTime createdAt;

    public Notification(Long id, Long userId, String title, String message, boolean read, LocalDateTime createdAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.read = read;
        this.createdAt = createdAt;
    }
}
