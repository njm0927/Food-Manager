# Food Manager

React + Vite + Tailwind CSS 프론트엔드와 Node/Express + PostgreSQL 백엔드로 만든 Food Manager 프로토타입입니다.

## 실행 준비

```bash
npm install
copy .env.example .env
```

`.env`에서 PostgreSQL 접속 정보를 자신의 환경에 맞게 수정합니다.

```env
DATABASE_URL=postgres://fm_user:your_db_password@localhost:5432/food_manager_db
JWT_SECRET=change-this-to-a-long-random-secret
PORT=8080
FOODSAFETY_API_KEY=sample
```

## DB 생성

Docker로 테스트 DB를 실행할 수 있습니다.

```bash
docker compose up -d
```

그 다음 스키마와 데모 데이터를 넣습니다.

```bash
npm run db:schema
npm run db:seed
```

데모 계정:

- 소비자: `consumer` / `1234567`
- 판매자: `seller` / `1234567`

## 개발 서버

```bash
npm run dev
```

프론트엔드는 Vite로 열리고, `/api` 요청은 Express 서버(`http://127.0.0.1:8080`)로 프록시됩니다.

## 구현된 연동

- PostgreSQL 테이블: `users`, `seller_info`, `addresses`, `food_items`, `discount_info`, `notification_log`, `recipe_bookmarks`
- 로그인/회원가입 JWT 인증
- 식료품 CRUD
- 판매자 할인 등록/삭제, 소비자 주변 할인 조회
- 카카오 우편번호 서비스 주소 입력
- 식품안전나라 `COOKRCP01` 레시피 API 프록시
- Tailwind CSS 기반 UI
