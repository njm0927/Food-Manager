package com.foodmanager.repository;

import com.foodmanager.domain.Consumer;
import com.foodmanager.domain.Seller;
import com.foodmanager.domain.User;
import com.foodmanager.service.AuthService.AddressRequest;
import com.foodmanager.service.AuthService.AddressResponse;
import com.foodmanager.service.AuthService.NotificationSettingsRequest;
import com.foodmanager.service.AuthService.NotificationSettingsResponse;
import com.foodmanager.service.AuthService.SignupRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;

    private final RowMapper<User> userMapper = (rs, rowNum) -> {
        String role = rs.getString("role");
        if ("seller".equals(role)) {
            return new Seller(
                    rs.getLong("id"),
                    rs.getString("user_id"),
                    rs.getString("password_hash"),
                    rs.getString("name"),
                    rs.getBoolean("notify_enabled"),
                    null,
                    null,
                    null,
                    null
            );
        }

        return new Consumer(
                rs.getLong("id"),
                rs.getString("user_id"),
                rs.getString("password_hash"),
                rs.getString("name"),
                rs.getBoolean("notify_enabled")
        );
    };

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<User> findByUserId(String userId) {
        List<User> users = jdbcTemplate.query("""
                select id, user_id, password_hash, name, role, coalesce(notify_enabled, true) as notify_enabled
                from users
                where user_id = ? or user_login_id = ?
                """, userMapper, userId, userId);
        return users.stream().findFirst();
    }

    public Optional<User> findById(Long id) {
        List<User> users = jdbcTemplate.query("""
                select id, user_id, password_hash, name, role, coalesce(notify_enabled, true) as notify_enabled
                from users
                where id = ?
                """, userMapper, id);
        return users.stream().findFirst();
    }

    public boolean existsByUserId(String userId) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from users where user_id = ? or user_login_id = ?", Integer.class, userId, userId);
        return count != null && count > 0;
    }

    public boolean existsByBusinessNumber(String businessNumber) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from seller_info where business_number = ?", Integer.class, businessNumber);
        return count != null && count > 0;
    }

    public User createUser(SignupRequest request, String role, String passwordHash) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                    "insert into users (user_login_id, user_id, password_hash, name, role) values (?, ?, ?, ?, ?)",
                    new String[]{"id"}
            );
            statement.setString(1, request.userId());
            statement.setString(2, request.userId());
            statement.setString(3, passwordHash);
            statement.setString(4, request.name());
            statement.setString(5, role);
            return statement;
        }, keyHolder);

        Number id = keyHolder.getKey();
        return findById(id.longValue()).orElseThrow();
    }

    public void createAddress(Long userId, SignupRequest request) {
        saveAddressValues(userId, request.postcode(), request.address(), request.detailAddress(), request.latitude(), request.longitude());
    }

    public Optional<AddressResponse> findDefaultAddress(Long userId) {
        List<AddressResponse> addresses = jdbcTemplate.query("""
                select
                    coalesce(zipcode, postcode) as postcode,
                    address,
                    coalesce(address_detail, detail_address) as detail_address,
                    latitude,
                    longitude
                from addresses
                where user_id = ? and is_default = true
                order by id desc
                limit 1
                """, (rs, rowNum) -> new AddressResponse(
                rs.getString("postcode"),
                rs.getString("address"),
                rs.getString("detail_address"),
                rs.getObject("latitude", Double.class),
                rs.getObject("longitude", Double.class)
        ), userId);
        return addresses.stream().findFirst();
    }

    public Optional<NotificationSettingsResponse> findNotificationSettings(Long userId) {
        List<NotificationSettingsResponse> settings = jdbcTemplate.query("""
                select
                    coalesce(notify_enabled, true) as notify_enabled,
                    coalesce(notify_1day, true) as notify_1day,
                    coalesce(notify_3day, true) as notify_3day,
                    coalesce(notify_7day, true) as notify_7day,
                    coalesce(notify_discount, true) as notify_discount
                from users
                where id = ?
                """, (rs, rowNum) -> new NotificationSettingsResponse(
                rs.getBoolean("notify_enabled"),
                rs.getBoolean("notify_1day"),
                rs.getBoolean("notify_3day"),
                rs.getBoolean("notify_7day"),
                rs.getBoolean("notify_discount")
        ), userId);
        return settings.stream().findFirst();
    }

    public void saveNotificationSettings(Long userId, NotificationSettingsRequest request) {
        jdbcTemplate.update("""
                update users
                set notify_enabled = ?,
                    notify_1day = ?,
                    notify_3day = ?,
                    notify_7day = ?,
                    notify_discount = ?,
                    updated_at = now()
                where id = ?
                """,
                request.enabled(),
                request.notify1day(),
                request.notify3day(),
                request.notify7day(),
                request.discountEnabled(),
                userId
        );
    }

    public void saveDefaultAddress(Long userId, AddressRequest request) {
        jdbcTemplate.update("delete from addresses where user_id = ? and is_default = true", userId);
        saveAddressValues(userId, request.postcode(), request.address(), request.detailAddress(), request.latitude(), request.longitude());
    }

    public void deleteDefaultAddress(Long userId) {
        jdbcTemplate.update("delete from addresses where user_id = ? and is_default = true", userId);
    }

    private void saveAddressValues(Long userId, String postcode, String address, String detailAddress, Double latitude, Double longitude) {
        List<String> columns = new ArrayList<>(List.of(
                "user_id",
                "zipcode",
                "address",
                "address_detail",
                "latitude",
                "longitude",
                "is_default"
        ));
        List<Object> values = new ArrayList<>();
        values.add(userId);
        values.add(postcode);
        values.add(address);
        values.add(detailAddress);
        values.add(latitude);
        values.add(longitude);
        values.add(true);

        if (hasColumn("addresses", "postcode")) {
            columns.add("postcode");
            values.add(postcode);
        }
        if (hasColumn("addresses", "detail_address")) {
            columns.add("detail_address");
            values.add(detailAddress);
        }

        String placeholders = String.join(", ", Collections.nCopies(columns.size(), "?"));
        jdbcTemplate.update(
                "insert into addresses (" + String.join(", ", columns) + ") values (" + placeholders + ")",
                values.toArray()
        );
    }

    public void createSellerInfo(Long userId, SignupRequest request) {
        jdbcTemplate.update("""
                insert into seller_info (user_id, business_name, business_owner_name, business_number, business_category)
                values (?, ?, ?, ?, ?)
                """, userId, request.businessName(), request.businessOwnerName(), request.businessNumber(), request.businessCategory());
    }

    private boolean hasColumn(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = current_schema()
                  and table_name = ?
                  and column_name = ?
                """, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }
}
