package com.foodmanager.controller;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<Map<String, Object>> duplicateKey(DuplicateKeyException error) {
        String detail = error.getMostSpecificCause().getMessage();
        String message = "이미 등록된 정보입니다.";
        if (detail != null && detail.contains("business_number")) {
            message = "이미 등록된 사업자번호입니다. 다른 사업자번호를 입력해 주세요.";
        } else if (detail != null && (detail.contains("user_login_id") || detail.contains("user_id"))) {
            message = "이미 사용 중인 아이디입니다.";
        }
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<Map<String, Object>> database(DataAccessException error) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "PostgreSQL 요청 처리 중 문제가 생겼습니다.", "detail", error.getMostSpecificCause().getMessage()));
    }
}
