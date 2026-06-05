# Food Manager Java Backend

Spring Boot 기반 Food Manager 백엔드입니다. 기존 React 프론트는 그대로 두고 `/api` 요청만 Java 서버로 연결합니다.

## 실행

```cmd
cd /d "C:\Users\njm09\OneDrive\Documents\Food Manager"
docker compose up -d
npm.cmd run db:schema
npm.cmd run db:seed
npm.cmd run db:java:migrate
cd backend
mvn spring-boot:run
```

프론트는 별도 터미널에서 실행합니다.

```cmd
cd /d "C:\Users\njm09\OneDrive\Documents\Food Manager"
npm.cmd run dev:client
```

## 환경값

기본값은 Docker Compose 설정과 맞춰져 있습니다.

- `JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/food_manager_db`
- `DB_USERNAME=fm_user`
- `DB_PASSWORD=fm_password`
- `JWT_SECRET=change-this-to-a-long-random-secret`
- `FOODSAFETY_API_KEY=84bfd51958a44907a079`

## 도메인 클래스 구성

Java 백엔드는 아래 10개 도메인 클래스를 중심으로 구성합니다.

- `User`
- `Consumer`
- `Seller`
- `Food`
- `Sale`
- `Notification`
- `Address`
- `Market`
- `Recipe`
- `Category`

Controller, Service, Repository는 이 도메인 클래스들을 사용해서 API, 비즈니스 로직, DB 접근을 나누는 보조 구조입니다.

`Consumer`와 `Seller`는 `User`를 상속합니다.

`User` 공통 기능:

- 식료품 추가
- 식료품 수정
- 식료품 삭제
- 식료품 조회
- 알림 설정
- 위치 등록

`Consumer` 추가 기능:

- 할인정보 이용
- 레시피 설정

`Seller` 추가 기능:

- 할인정보 등록
