# Food Manager Mobile

Expo/React Native 기반 Food Manager 모바일 앱입니다. Spring Boot 백엔드와 PostgreSQL 데이터베이스를 REST API로 사용합니다.

## 로컬 실행

```powershell
cd mobile
npm.cmd install
npm.cmd exec -- expo start
```

Android Emulator에 직접 설치해서 테스트하려면 JDK 17 이상과 Android SDK가 필요합니다.

```powershell
cd mobile
npm.cmd exec -- expo run:android
```

## APK 빌드

```powershell
cd mobile
eas build -p android --profile preview
```

`eas.json`의 `EXPO_PUBLIC_API_BASE_URL` 값은 현재 EC2 백엔드 주소를 사용합니다.

## 포함 기능

- 로그인 및 소비자/판매자 회원가입
- 식료품 추가, 수정, 삭제, 조회, 검색
- 소비기한 알림 및 앱 푸시 알림
- 판매자 할인 정보 등록/삭제
- 소비자 주변 할인 조회
- 카카오 우편번호 기반 주소 등록
- 등록된 식료품 기반 레시피 추천
