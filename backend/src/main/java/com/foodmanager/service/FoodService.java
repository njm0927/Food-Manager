package com.foodmanager.service;

import com.foodmanager.domain.Food;
import com.foodmanager.repository.FoodRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class FoodService {
    private final FoodRepository foodRepository;
    private final JdbcTemplate jdbcTemplate;

    public FoodService(FoodRepository foodRepository, JdbcTemplate jdbcTemplate) {
        this.foodRepository = foodRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public record FoodCreateRequest(
            String itemName,
            String name,
        String category,
        String subcategory,
        String emoji,
            Integer quantity,
            String unit,
            BigDecimal price,
            LocalDate expiryDate,
            LocalDate expiresAt
    ) {
        public String resolvedName() {
            return itemName != null && !itemName.isBlank() ? itemName : name;
        }

        public LocalDate resolvedExpiryDate() {
            return expiryDate != null ? expiryDate : expiresAt;
        }
    }

    public record FoodResponse(
            Long id,
            String itemName,
            String name,
        String category,
        String subcategory,
        String emoji,
            Integer quantity,
            String unit,
            BigDecimal price,
            LocalDate expiryDate
    ) {
    }

    public record ExpiryNotificationRequest(List<Integer> days) {
    }

    public record NotificationResponse(Long id, String type, String title, String body, Long referenceId, boolean read) {
    }

    public List<FoodResponse> findAll(Long ownerId) {
        try {
            return foodRepository.findAll(ownerId).stream().map(this::toResponse).toList();
        } catch (RuntimeException error) {
            return List.of();
        }
    }

    public FoodResponse create(Long sellerId, FoodCreateRequest request) {
        return toResponse(foodRepository.create(sellerId, request));
    }

    public FoodResponse update(Long id, Long sellerId, FoodCreateRequest request) {
        return toResponse(foodRepository.update(sellerId, id, request));
    }

    public void delete(Long id, Long sellerId) {
        foodRepository.delete(sellerId, id);
    }

    public List<NotificationResponse> createExpiryNotifications(Long userId, ExpiryNotificationRequest request) {
        List<Integer> days = request.days() == null ? List.of() : request.days();
        int threshold = days.stream().mapToInt(Integer::intValue).max().orElse(0);
        if (threshold <= 0) return findNotifications(userId);

        boolean notify1Day = days.contains(1);
        boolean notify3Days = days.contains(3);
        boolean notify7Days = days.contains(7);

        jdbcTemplate.update("""
                insert into app_notifications (user_id, type, title, body, reference_id, is_read)
                select ?, 'expiry', '소비기한 알림',
                       food_name || ' 소비기한이 ' ||
                       case
                         when ? and (expiry_date - current_date) <= 1 then '1일이내입니다.'
                         when ? and (expiry_date - current_date) <= 3 then '3일이내입니다.'
                         when ? and (expiry_date - current_date) <= 7 then '7일이내입니다.'
                         else (expiry_date - current_date) || '일이내입니다.'
                       end,
                       id,
                       false
                from food_items f
                where (f.owner_id = ? or f.seller_id = ?)
                  and f.expiry_date is not null
                  and f.expiry_date >= current_date
                  and (f.expiry_date - current_date) <= ?
                  and not exists (
                    select 1
                    from app_notifications n
                    where n.user_id = ?
                      and n.type = 'expiry'
                      and n.reference_id = f.id
                      and n.created_at::date = current_date
                  )
                """, userId, notify1Day, notify3Days, notify7Days, userId, userId, threshold, userId);

        return findNotifications(userId);
    }

    private List<NotificationResponse> findNotifications(Long userId) {
        return jdbcTemplate.query("""
                select id, type, title, body, reference_id, is_read
                from app_notifications
                where user_id = ?
                order by id desc
                limit 20
                """, (rs, rowNum) -> new NotificationResponse(
                rs.getLong("id"),
                rs.getString("type"),
                rs.getString("title"),
                rs.getString("body"),
                rs.getObject("reference_id", Long.class),
                rs.getBoolean("is_read")
        ), userId);
    }

    private FoodResponse toResponse(Food item) {
        return new FoodResponse(
                item.id(),
                item.itemName(),
                item.itemName(),
            item.category().label(),
            item.subcategory(),
            item.emoji(),
                item.quantity(),
                item.unit(),
                item.price(),
                item.expiryDate()
        );
    }
}

