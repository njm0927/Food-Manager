package com.foodmanager.domain;

public class NotificationSetting {
    private boolean enabled;
    private boolean notify1day;
    private boolean notify3day;
    private boolean notify7day;
    private boolean discountEnabled;

    public NotificationSetting(boolean enabled, boolean notify1day, boolean notify3day, boolean notify7day, boolean discountEnabled) {
        this.enabled = enabled;
        this.notify1day = notify1day;
        this.notify3day = notify3day;
        this.notify7day = notify7day;
        this.discountEnabled = discountEnabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isNotify1day() {
        return notify1day;
    }

    public boolean isNotify3day() {
        return notify3day;
    }

    public boolean isNotify7day() {
        return notify7day;
    }

    public boolean isDiscountEnabled() {
        return discountEnabled;
    }

    public void enableNotification() {
        this.enabled = true;
    }

    public void disableNotification() {
        this.enabled = false;
    }

    public void changeExpiryDays(boolean notify1day, boolean notify3day, boolean notify7day) {
        this.notify1day = notify1day;
        this.notify3day = notify3day;
        this.notify7day = notify7day;
    }

    public void changeDiscountNotification(boolean discountEnabled) {
        this.discountEnabled = discountEnabled;
    }
}
