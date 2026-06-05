package com.foodmanager;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    public DatabaseInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        ensureUsers();
        ensureAddresses();
        ensureSellerInfo();
        ensureFoodItems();
        ensureSales();
        ensureNotifications();
    }

    private void ensureUsers() {
        jdbc.execute(
            """
            create table if not exists users (
                id bigserial primary key,
                user_login_id text unique,
                user_id text,
                password_hash text not null,
                name text not null,
                role text not null,
                can_create_food boolean default true,
                can_update_food boolean default true,
                can_delete_food boolean default true,
                can_read_food boolean default true,
                can_manage_notification boolean default true,
                can_manage_address boolean default true,
                can_view_sale boolean default true,
                can_view_recipe boolean default true,
                notify_enabled boolean default true,
                notify_1day boolean default true,
                notify_3day boolean default true,
                notify_7day boolean default true,
                notify_discount boolean default true,
                business_number text,
                business_name text,
                representative_name text,
                business_category text,
                market_type text,
                address text,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table users add column if not exists user_login_id text");
        jdbc.execute("alter table users add column if not exists user_id text");
        jdbc.execute("alter table users add column if not exists password_hash text");
        jdbc.execute("alter table users add column if not exists name text");
        jdbc.execute("alter table users add column if not exists role text");
        jdbc.execute("alter table users add column if not exists can_create_food boolean default true");
        jdbc.execute("alter table users add column if not exists can_update_food boolean default true");
        jdbc.execute("alter table users add column if not exists can_delete_food boolean default true");
        jdbc.execute("alter table users add column if not exists can_read_food boolean default true");
        jdbc.execute("alter table users add column if not exists can_manage_notification boolean default true");
        jdbc.execute("alter table users add column if not exists can_manage_address boolean default true");
        jdbc.execute("alter table users add column if not exists can_view_sale boolean default true");
        jdbc.execute("alter table users add column if not exists can_view_recipe boolean default true");
        jdbc.execute("alter table users add column if not exists notify_enabled boolean default true");
        jdbc.execute("alter table users add column if not exists notify_1day boolean default true");
        jdbc.execute("alter table users add column if not exists notify_3day boolean default true");
        jdbc.execute("alter table users add column if not exists notify_7day boolean default true");
        jdbc.execute("alter table users add column if not exists notify_discount boolean default true");
        jdbc.execute("alter table users add column if not exists business_number text");
        jdbc.execute("alter table users add column if not exists business_name text");
        jdbc.execute("alter table users add column if not exists representative_name text");
        jdbc.execute("alter table users add column if not exists business_category text");
        jdbc.execute("alter table users add column if not exists market_type text");
        jdbc.execute("alter table users add column if not exists address text");
        jdbc.execute("alter table users add column if not exists created_at timestamptz default now()");
        jdbc.execute("alter table users add column if not exists updated_at timestamptz default now()");
        jdbc.execute("update users set user_login_id = user_id where user_login_id is null and user_id is not null");
        jdbc.execute("update users set user_id = user_login_id where user_id is null and user_login_id is not null");
    }

    private void ensureFoodItems() {
        jdbc.execute(
            """
            create table if not exists food_items (
                id bigserial primary key,
                owner_id bigint,
                seller_id bigint,
                food_name text,
                item_name text,
                category text,
                subcategory text,
                emoji text,
                quantity integer,
                unit text,
                price numeric(12, 2) default 0,
                expiry_date date,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table food_items add column if not exists owner_id bigint");
        jdbc.execute("alter table food_items add column if not exists seller_id bigint");
        jdbc.execute("alter table food_items add column if not exists food_name text");
        jdbc.execute("alter table food_items add column if not exists item_name text");
        jdbc.execute("alter table food_items add column if not exists category text");
        jdbc.execute("alter table food_items add column if not exists subcategory text");
        jdbc.execute("alter table food_items add column if not exists emoji text");
        jdbc.execute("alter table food_items add column if not exists quantity integer");
        jdbc.execute("alter table food_items add column if not exists unit text");
        jdbc.execute("alter table food_items add column if not exists price numeric(12, 2) default 0");
        jdbc.execute("alter table food_items add column if not exists expiry_date date");
        jdbc.execute("alter table food_items alter column expiry_date drop not null");
        jdbc.execute("alter table food_items add column if not exists created_at timestamptz default now()");
        jdbc.execute("alter table food_items add column if not exists updated_at timestamptz default now()");
        jdbc.execute("update food_items set owner_id = seller_id where owner_id is null and seller_id is not null");
        jdbc.execute("update food_items set seller_id = owner_id where seller_id is null and owner_id is not null");
        jdbc.execute("update food_items set food_name = item_name where food_name is null and item_name is not null");
        jdbc.execute("update food_items set item_name = food_name where item_name is null and food_name is not null");
    }

    private void ensureAddresses() {
        jdbc.execute(
            """
            create table if not exists addresses (
                id bigserial primary key,
                user_id bigint,
                postcode text,
                address text,
                detail_address text,
                latitude double precision,
                longitude double precision,
                is_default boolean default true,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table addresses add column if not exists user_id bigint");
        jdbc.execute("alter table addresses add column if not exists zipcode text");
        jdbc.execute("alter table addresses add column if not exists postcode text");
        jdbc.execute("alter table addresses add column if not exists address text");
        jdbc.execute("alter table addresses add column if not exists address_detail text");
        jdbc.execute("alter table addresses add column if not exists detail_address text");
        jdbc.execute("alter table addresses add column if not exists latitude double precision");
        jdbc.execute("alter table addresses add column if not exists longitude double precision");
        jdbc.execute("alter table addresses add column if not exists is_default boolean default true");
        jdbc.execute("alter table addresses add column if not exists created_at timestamptz default now()");
        jdbc.execute("alter table addresses add column if not exists updated_at timestamptz default now()");
        jdbc.execute("update addresses set zipcode = postcode where zipcode is null and postcode is not null");
        jdbc.execute("update addresses set postcode = zipcode where postcode is null and zipcode is not null");
        jdbc.execute("update addresses set address_detail = detail_address where address_detail is null and detail_address is not null");
        jdbc.execute("update addresses set detail_address = address_detail where detail_address is null and address_detail is not null");
    }

    private void ensureSellerInfo() {
        jdbc.execute(
            """
            create table if not exists seller_info (
                id bigserial primary key,
                user_id bigint,
                business_name text,
                business_owner_name text,
                business_number text,
                business_category text,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table seller_info add column if not exists user_id bigint");
        jdbc.execute("alter table seller_info add column if not exists business_name text");
        jdbc.execute("alter table seller_info add column if not exists business_owner_name text");
        jdbc.execute("alter table seller_info add column if not exists business_number text");
        jdbc.execute("alter table seller_info add column if not exists business_category text");
        jdbc.execute("alter table seller_info add column if not exists created_at timestamptz default now()");
        jdbc.execute("alter table seller_info add column if not exists updated_at timestamptz default now()");
    }

    private void ensureSales() {
        jdbc.execute(
            """
            create table if not exists sale_info (
                id bigserial primary key,
                seller_id bigint,
                food_id bigint,
                original_price numeric(12, 2),
                sale_price numeric(12, 2),
                discount_rate integer,
                start_date date,
                end_date date,
                created_at timestamptz default now(),
                updated_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table sale_info add column if not exists seller_id bigint");
        jdbc.execute("alter table sale_info add column if not exists food_id bigint");
        jdbc.execute("alter table sale_info add column if not exists original_price numeric(12, 2)");
        jdbc.execute("alter table sale_info add column if not exists sale_price numeric(12, 2)");
        jdbc.execute("alter table sale_info add column if not exists discount_rate integer");
        jdbc.execute("alter table sale_info add column if not exists start_date date");
        jdbc.execute("alter table sale_info add column if not exists end_date date");
        jdbc.execute("alter table sale_info add column if not exists created_at timestamptz default now()");
        jdbc.execute("alter table sale_info add column if not exists updated_at timestamptz default now()");
    }

    private void ensureNotifications() {
        jdbc.execute(
            """
            create table if not exists app_notifications (
                id bigserial primary key,
                user_id bigint,
                type text,
                title text,
                body text,
                reference_id bigint,
                is_read boolean default false,
                created_at timestamptz default now()
            )
            """
        );

        jdbc.execute("alter table app_notifications add column if not exists user_id bigint");
        jdbc.execute("alter table app_notifications add column if not exists type text");
        jdbc.execute("alter table app_notifications add column if not exists title text");
        jdbc.execute("alter table app_notifications add column if not exists body text");
        jdbc.execute("alter table app_notifications add column if not exists reference_id bigint");
        jdbc.execute("alter table app_notifications add column if not exists is_read boolean default false");
        jdbc.execute("alter table app_notifications add column if not exists created_at timestamptz default now()");
    }

}
