package com.foodmanager.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class SaleService {
    private final JdbcTemplate jdbcTemplate;

    public SaleService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public record SaleCreateRequest(Long foodId, Integer quantity, BigDecimal originalPrice, BigDecimal salePrice, LocalDate startDate, LocalDate endDate) {
    }

    public record SaleResponse(Long id, Long foodId, String foodName, String category, Integer quantity, String unit, BigDecimal originalPrice, BigDecimal salePrice, Integer discountRate, LocalDate startDate, LocalDate endDate, String marketName, String marketAddress) {
    }

    public record NotificationResponse(Long id, String type, String title, String body, Long referenceId, boolean read) {
    }

    public List<SaleResponse> findAll(Long sellerId) {
        return jdbcTemplate.query("""
                select s.id, s.food_id, f.item_name, f.category, coalesce(s.quantity, f.quantity) as quantity, f.unit, s.original_price, s.sale_price, s.discount_rate, s.start_date, s.end_date,
                       null as market_name, null as market_address
                from sale_info s
                join food_items f on f.id = s.food_id
                where s.seller_id = ?
                  and s.sale_price < s.original_price
                  and s.end_date >= s.start_date
                  and s.end_date >= current_date
                order by s.id desc
                """, (rs, rowNum) -> new SaleResponse(
                rs.getLong("id"),
                rs.getLong("food_id"),
                rs.getString("item_name"),
                rs.getString("category"),
                rs.getInt("quantity"),
                rs.getString("unit"),
                rs.getBigDecimal("original_price"),
                rs.getBigDecimal("sale_price"),
                rs.getInt("discount_rate"),
                rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date").toLocalDate(),
                rs.getString("market_name"),
                rs.getString("market_address")
        ), sellerId);
    }

    public List<SaleResponse> findNearby(String region) {
        if (region == null || region.isBlank()) return List.of();
        String pattern = "%" + region.trim() + "%";
        return jdbcTemplate.query("""
                select s.id, s.food_id, f.item_name, f.category, coalesce(s.quantity, f.quantity) as quantity, f.unit, s.original_price, s.sale_price, s.discount_rate, s.start_date, s.end_date,
                       coalesce(si.business_name, u.name) as market_name,
                       a.address as market_address
                from sale_info s
                join food_items f on f.id = s.food_id
                join users u on u.id = s.seller_id
                left join seller_info si on si.user_id = s.seller_id
                left join addresses a on a.user_id = s.seller_id and a.is_default = true
                where u.role = 'seller'
                  and coalesce(a.address, '') ilike ?
                  and s.sale_price < s.original_price
                  and s.end_date >= s.start_date
                  and s.end_date >= current_date
                order by s.id desc
                """, (rs, rowNum) -> new SaleResponse(
                rs.getLong("id"),
                rs.getLong("food_id"),
                rs.getString("item_name"),
                rs.getString("category"),
                rs.getInt("quantity"),
                rs.getString("unit"),
                rs.getBigDecimal("original_price"),
                rs.getBigDecimal("sale_price"),
                rs.getInt("discount_rate"),
                rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date").toLocalDate(),
                rs.getString("market_name"),
                rs.getString("market_address")
        ), pattern);
    }

    public SaleResponse create(Long sellerId, SaleCreateRequest request) {
        validate(request);
        List<Integer> ownedQuantities = jdbcTemplate.query(
                "select coalesce(quantity, 0) from food_items where id = ? and (owner_id = ? or seller_id = ?)",
                (rs, rowNum) -> rs.getInt(1),
                request.foodId(), sellerId, sellerId
        );
        if (ownedQuantities.isEmpty()) throw new IllegalArgumentException("내 식료품만 할인 등록할 수 있습니다.");
        int foodQuantity = ownedQuantities.get(0);
        int saleQuantity = request.quantity() == null ? foodQuantity : request.quantity();
        if (saleQuantity < 0) throw new IllegalArgumentException("할인 등록 수량은 0개 이상이어야 합니다.");
        Integer activeSaleCount = jdbcTemplate.queryForObject("""
                select count(*)
                from sale_info
                where seller_id = ?
                  and food_id = ?
                  and end_date >= current_date
                """, Integer.class, sellerId, request.foodId());
        if (activeSaleCount != null && activeSaleCount > 0) {
            throw new IllegalArgumentException("이미 할인 등록된 품목입니다. 기존 할인 정보를 삭제한 뒤 다시 등록해 주세요.");
        }

        int discountRate = request.originalPrice().subtract(request.salePrice()).multiply(BigDecimal.valueOf(100)).divide(request.originalPrice(), 0, java.math.RoundingMode.HALF_UP).intValue();
        Long id = jdbcTemplate.queryForObject("""
                insert into sale_info (seller_id, food_id, quantity, original_price, sale_price, discount_rate, start_date, end_date)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                returning id
                """, Long.class, sellerId, request.foodId(), saleQuantity, request.originalPrice(), request.salePrice(), discountRate, request.startDate(), request.endDate());
        SaleResponse sale = findAll(sellerId).stream().filter((item) -> item.id().equals(id)).findFirst().orElseThrow();
        notifyNearbyConsumers(sellerId, sale);
        return sale;
    }

    public void delete(Long sellerId, Long id) {
        jdbcTemplate.update("delete from sale_info where id = ? and seller_id = ?", id, sellerId);
    }

    private void validate(SaleCreateRequest request) {
        if (request.foodId() == null) throw new IllegalArgumentException("할인 품목을 선택해 주세요.");
        if (request.quantity() != null && request.quantity() < 0) throw new IllegalArgumentException("할인 등록 수량은 0개 이상이어야 합니다.");
        if (request.originalPrice() == null || request.originalPrice().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("정가는 0보다 커야 합니다.");
        if (request.salePrice() == null || request.salePrice().compareTo(BigDecimal.ZERO) <= 0) throw new IllegalArgumentException("할인가는 0보다 커야 합니다.");
        if (request.salePrice().compareTo(request.originalPrice()) >= 0) throw new IllegalArgumentException("할인가는 정가보다 낮아야 합니다.");
        if (request.startDate() == null || request.endDate() == null) throw new IllegalArgumentException("할인 시작일과 종료일을 입력해 주세요.");
        LocalDate today = LocalDate.now();
        if (request.startDate().isBefore(today)) throw new IllegalArgumentException("할인 시작일은 오늘 이후여야 합니다.");
        if (request.endDate().isBefore(today)) throw new IllegalArgumentException("할인 종료일은 오늘 이후여야 합니다.");
        if (request.endDate().isBefore(request.startDate())) throw new IllegalArgumentException("할인 종료일은 시작일 이후여야 합니다.");
    }

    public List<NotificationResponse> findNotifications(Long userId) {
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

    public void markNotificationsRead(Long userId) {
        jdbcTemplate.update("update app_notifications set is_read = true where user_id = ?", userId);
    }

    private void notifyNearbyConsumers(Long sellerId, SaleResponse sale) {
        String sellerAddress = jdbcTemplate.query("""
                select coalesce(address, '')
                from addresses
                where user_id = ? and is_default = true
                order by id desc
                limit 1
                """, (rs, rowNum) -> rs.getString(1), sellerId).stream().findFirst().orElse("");
        String region = extractRegion(sellerAddress);
        if (region.isBlank()) return;

        String body = "%s에서 %s %d%% 할인을 등록했습니다.".formatted(
                sale.marketName() == null ? "주변 매장" : sale.marketName(),
                sale.foodName(),
                sale.discountRate()
        );
        String pattern = "%" + region + "%";
        jdbcTemplate.update("""
                insert into app_notifications (user_id, type, title, body, reference_id, is_read)
                select distinct u.id, 'discount', '주변 할인 정보', ?, ?, false
                from users u
                join addresses a on a.user_id = u.id and a.is_default = true
                where u.role = 'consumer'
                  and coalesce(a.address, '') ilike ?
                """, body, sale.id(), pattern);
    }

    private String extractRegion(String address) {
        if (address == null || address.isBlank()) return "";
        String[] tokens = address.trim().split("\\s+");
        for (String token : tokens) {
            if (token.endsWith("특별시") || token.endsWith("광역시") || token.endsWith("특별자치시") || token.endsWith("시")) return token;
        }
        return tokens.length == 0 ? "" : tokens[0];
    }
}
