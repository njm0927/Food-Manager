package com.foodmanager;

import com.foodmanager.repository.UserRepository;
import com.foodmanager.security.JwtService;
import com.foodmanager.service.AuthService;
import com.foodmanager.service.FoodService;
import com.foodmanager.service.SaleService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final AuthService authService;
    private final FoodService foodService;
    private final RecipeClient recipeClient;
    private final SaleService saleService;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    public ApiController(AuthService authService, FoodService foodService, RecipeClient recipeClient, SaleService saleService, UserRepository userRepository, JwtService jwtService, JdbcTemplate jdbcTemplate) {
        this.authService = authService;
        this.foodService = foodService;
        this.recipeClient = recipeClient;
        this.saleService = saleService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Instant dbTime = jdbcTemplate.queryForObject("select now()", Instant.class);
        return Map.of("ok", true, "dbTime", dbTime);
    }

    @GetMapping("/auth/check-id")
    public AuthService.CheckIdResponse checkId(@RequestParam String userId) {
        return new AuthService.CheckIdResponse(!userRepository.existsByUserId(userId));
    }

    @PostMapping("/auth/login")
    public AuthService.AuthResponse login(@RequestBody AuthService.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/signup/consumer")
    public AuthService.AuthResponse signupConsumer(@RequestBody AuthService.SignupRequest request) {
        return authService.signup(request, "consumer");
    }

    @PostMapping("/auth/signup/seller")
    public AuthService.AuthResponse signupSeller(@RequestBody AuthService.SignupRequest request) {
        return authService.signup(request, "seller");
    }

    @GetMapping("/me")
    public AuthService.UserResponse me(@RequestHeader("Authorization") String authorization) {
        return authService.me(jwtService.requireUserId(authorization));
    }

    @GetMapping("/me/address")
    public AuthService.AddressResponse myAddress(@RequestHeader("Authorization") String authorization) {
        return authService.address(jwtService.requireUserId(authorization));
    }

    @PutMapping("/me/address")
    public AuthService.AddressResponse saveMyAddress(@RequestHeader("Authorization") String authorization, @RequestBody AuthService.AddressRequest request) {
        return authService.saveAddress(jwtService.requireUserId(authorization), request);
    }

    @DeleteMapping("/me/address")
    public Map<String, Object> deleteMyAddress(@RequestHeader("Authorization") String authorization) {
        authService.deleteAddress(jwtService.requireUserId(authorization));
        return Map.of("ok", true);
    }

    @GetMapping("/me/notification-settings")
    public AuthService.NotificationSettingsResponse notificationSettings(@RequestHeader("Authorization") String authorization) {
        return authService.notificationSettings(jwtService.requireUserId(authorization));
    }

    @PutMapping("/me/notification-settings")
    public AuthService.NotificationSettingsResponse saveNotificationSettings(@RequestHeader("Authorization") String authorization, @RequestBody AuthService.NotificationSettingsRequest request) {
        return authService.saveNotificationSettings(jwtService.requireUserId(authorization), request);
    }

    @GetMapping("/foods")
    public List<FoodService.FoodResponse> foods(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization == null || authorization.isBlank()) return List.of();
        return foodService.findAll(jwtService.requireUserId(authorization));
    }

    @PostMapping("/foods")
    public FoodService.FoodResponse createFood(@RequestHeader("Authorization") String authorization, @RequestBody FoodService.FoodCreateRequest request) {
        return foodService.create(jwtService.requireUserId(authorization), request);
    }

    @PutMapping("/foods/{id}")
    public FoodService.FoodResponse updateFood(@RequestHeader("Authorization") String authorization, @PathVariable Long id, @RequestBody FoodService.FoodCreateRequest request) {
        return foodService.update(id, jwtService.requireUserId(authorization), request);
    }

    @DeleteMapping("/foods/{id}")
    public Map<String, Object> deleteFood(@RequestHeader("Authorization") String authorization, @PathVariable Long id) {
        foodService.delete(id, jwtService.requireUserId(authorization));
        return Map.of("ok", true);
    }

    @GetMapping("/sales")
    public List<SaleService.SaleResponse> sales(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestParam(required = false) String region) {
        if (authorization == null || authorization.isBlank()) return List.of();
        Long userId = jwtService.requireUserId(authorization);
        String role = userRepository.findById(userId).map(user -> user.role()).orElse("");
        if ("seller".equals(role)) return saleService.findAll(userId);
        return saleService.findNearby(region);
    }

    @PostMapping("/sales")
    public SaleService.SaleResponse createSale(@RequestHeader("Authorization") String authorization, @RequestBody SaleService.SaleCreateRequest request) {
        return saleService.create(jwtService.requireUserId(authorization), request);
    }

    @DeleteMapping("/sales/{id}")
    public Map<String, Object> deleteSale(@RequestHeader("Authorization") String authorization, @PathVariable Long id) {
        saleService.delete(jwtService.requireUserId(authorization), id);
        return Map.of("ok", true);
    }

    @GetMapping("/notifications")
    public List<SaleService.NotificationResponse> notifications(@RequestHeader("Authorization") String authorization) {
        return saleService.findNotifications(jwtService.requireUserId(authorization));
    }

    @PostMapping("/notifications/expiry")
    public List<FoodService.NotificationResponse> createExpiryNotifications(@RequestHeader("Authorization") String authorization, @RequestBody FoodService.ExpiryNotificationRequest request) {
        return foodService.createExpiryNotifications(jwtService.requireUserId(authorization), request);
    }

    @PutMapping("/notifications/read")
    public Map<String, Object> markNotificationsRead(@RequestHeader("Authorization") String authorization) {
        saleService.markNotificationsRead(jwtService.requireUserId(authorization));
        return Map.of("ok", true);
    }

    @GetMapping("/discounts/nearby")
    public List<SaleService.SaleResponse> nearbyDiscounts(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestParam(required = false) String region) {
        if (authorization == null || authorization.isBlank()) return List.of();
        return saleService.findNearby(region);
    }

    @GetMapping("/recipes")
    public Map<?, ?> recipes(@RequestParam(required = false) String query) {
        return recipeClient.search(query);
    }
}
