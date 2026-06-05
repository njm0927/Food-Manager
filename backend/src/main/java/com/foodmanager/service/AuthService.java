package com.foodmanager.service;

import com.foodmanager.domain.User;
import com.foodmanager.repository.UserRepository;
import com.foodmanager.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public record LoginRequest(String userId, String password) {
    }

    public record SignupRequest(
            String userId,
            String password,
            String name,
            String businessName,
            String businessOwnerName,
            String businessNumber,
            String businessCategory,
            String postcode,
            String address,
            String detailAddress,
            Double latitude,
            Double longitude
    ) {
    }

    public record UserResponse(Long id, String userId, String name, String role, boolean notificationEnabled) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record CheckIdResponse(boolean available) {
    }

    public record AddressRequest(String postcode, String address, String detailAddress, Double latitude, Double longitude) {
    }

    public record AddressResponse(String postcode, String address, String detailAddress, Double latitude, Double longitude) {
    }

    public record NotificationSettingsRequest(boolean enabled, boolean notify1day, boolean notify3day, boolean notify7day, boolean discountEnabled) {
    }

    public record NotificationSettingsResponse(boolean enabled, boolean notify1day, boolean notify3day, boolean notify7day, boolean discountEnabled) {
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUserId(request.userId())
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        return toAuthResponse(user);
    }

    @Transactional
    public AuthResponse signup(SignupRequest request, String role) {
        if (userRepository.existsByUserId(request.userId())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }
        if ("seller".equals(role) && userRepository.existsByBusinessNumber(request.businessNumber())) {
            throw new IllegalArgumentException("이미 등록된 사업자번호입니다. 다른 사업자번호를 입력해 주세요.");
        }

        User user = userRepository.createUser(request, role, passwordEncoder.encode(request.password()));
        if ("seller".equals(role)) {
            userRepository.createAddress(user.id(), request);
            userRepository.createSellerInfo(user.id(), request);
        }

        return toAuthResponse(user);
    }

    public UserResponse me(Long userId) {
        return userRepository.findById(userId).map(this::toUserResponse)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    }

    public AddressResponse address(Long userId) {
        return userRepository.findDefaultAddress(userId).orElse(null);
    }

    public NotificationSettingsResponse notificationSettings(Long userId) {
        return userRepository.findNotificationSettings(userId)
                .orElse(new NotificationSettingsResponse(true, true, true, true, true));
    }

    @Transactional
    public NotificationSettingsResponse saveNotificationSettings(Long userId, NotificationSettingsRequest request) {
        userRepository.saveNotificationSettings(userId, request);
        return notificationSettings(userId);
    }

    @Transactional
    public AddressResponse saveAddress(Long userId, AddressRequest request) {
        if (request.postcode() == null || request.postcode().isBlank()) {
            throw new IllegalArgumentException("우편번호를 입력해 주세요.");
        }
        if (request.address() == null || request.address().isBlank()) {
            throw new IllegalArgumentException("주소를 입력해 주세요.");
        }
        userRepository.saveDefaultAddress(userId, request);
        return address(userId);
    }

    @Transactional
    public void deleteAddress(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        if ("seller".equals(user.role())) {
            throw new IllegalArgumentException("판매자 계정은 위치 정보를 삭제할 수 없습니다. 위치 변경만 가능합니다.");
        }
        userRepository.deleteDefaultAddress(userId);
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(jwtService.createToken(user), toUserResponse(user));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.id(), user.userId(), user.name(), user.role(), user.notificationEnabled());
    }
}
