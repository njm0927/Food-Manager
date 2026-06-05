package com.foodmanager.repository;

import com.foodmanager.domain.Category;
import com.foodmanager.domain.Food;
import com.foodmanager.service.FoodService.FoodCreateRequest;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class FoodRepository {
    private final JdbcTemplate jdbc;
    private final RowMapper<Food> mapper = this::mapFood;

    public FoodRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Food> findByOwner(Long ownerId) {
        return jdbc.query(
            """
            select id, seller_id, item_name, category, subcategory, emoji, quantity, unit, price, expiry_date
            from food_items
            where owner_id = ? or seller_id = ?
            order by id desc
            """,
            mapper,
            ownerId,
            ownerId
        );
    }

    public List<Food> findAll(Long ownerId) {
        return findByOwner(ownerId);
    }

    public List<Food> findByOwnerId(Long ownerId) {
        return findByOwner(ownerId);
    }

    public Food findOwned(Long ownerId, Long foodId) {
        return jdbc.queryForObject(
            """
            select id, seller_id, item_name, category, subcategory, emoji, quantity, unit, price, expiry_date
            from food_items
            where id = ? and (owner_id = ? or seller_id = ?)
            """,
            mapper,
            foodId,
            ownerId,
            ownerId
        );
    }

    public Food findById(Long ownerId, Long foodId) {
        return findOwned(ownerId, foodId);
    }

    public Food findOwnedById(Long ownerId, Long foodId) {
        return findOwned(ownerId, foodId);
    }

    public Food create(Long ownerId, FoodCreateRequest request) {
        String itemName = valueOr(request.itemName(), request.name());
        BigDecimal price = request.price() == null ? BigDecimal.ZERO : request.price();
        LocalDate expiryDate = request.expiryDate() == null ? request.expiresAt() : request.expiryDate();

        Long id = jdbc.queryForObject(
            """
            insert into food_items
                (owner_id, seller_id, food_name, item_name, category, subcategory, emoji, quantity, unit, price, expiry_date)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            returning id
            """,
            Long.class,
            ownerId,
            ownerId,
            itemName,
            itemName,
            request.category(),
            request.subcategory(),
            request.emoji(),
            request.quantity(),
            request.unit(),
            price,
            expiryDate
        );

        return findOwned(ownerId, id);
    }

    public Food update(Long ownerId, Long foodId, FoodCreateRequest request) {
        String itemName = valueOr(request.itemName(), request.name());
        BigDecimal price = request.price() == null ? BigDecimal.ZERO : request.price();
        LocalDate expiryDate = request.expiryDate() == null ? request.expiresAt() : request.expiryDate();

        jdbc.update(
            """
            update food_items
            set food_name = ?,
                item_name = ?,
                category = ?,
                subcategory = ?,
                emoji = ?,
                quantity = ?,
                unit = ?,
                price = ?,
                expiry_date = ?,
                updated_at = now()
            where id = ? and (owner_id = ? or seller_id = ?)
            """,
            itemName,
            itemName,
            request.category(),
            request.subcategory(),
            request.emoji(),
            request.quantity(),
            request.unit(),
            price,
            expiryDate,
            foodId,
            ownerId,
            ownerId
        );

        return findOwned(ownerId, foodId);
    }

    public void delete(Long ownerId, Long foodId) {
        jdbc.update(
            "delete from food_items where id = ? and (owner_id = ? or seller_id = ?)",
            foodId,
            ownerId,
            ownerId
        );
    }

    public void deleteById(Long ownerId, Long foodId) {
        delete(ownerId, foodId);
    }

    private Food mapFood(ResultSet rs, int rowNum) throws SQLException {
        return new Food(
            rs.getLong("id"),
            rs.getLong("seller_id"),
            rs.getString("item_name"),
            Category.fromLabel(rs.getString("category")),
            rs.getString("subcategory"),
            rs.getString("emoji"),
            rs.getObject("quantity", Integer.class),
            rs.getString("unit"),
            rs.getBigDecimal("price"),
            rs.getObject("expiry_date", LocalDate.class)
        );
    }

    private String valueOr(String primary, String fallback) {
        return primary == null || primary.isBlank() ? fallback : primary;
    }
}
