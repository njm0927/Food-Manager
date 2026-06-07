# Food Manager

Food Manager는 Spring Boot 백엔드, PostgreSQL 데이터베이스, Expo/React Native 모바일 앱으로 구성된 식료품 관리 앱입니다. 현재 배포 대상은 모바일 앱과 백엔드 API입니다.

## 프로젝트 구조

```text
backend/   Spring Boot API 서버
mobile/    Expo React Native 앱
docker-compose.yml   PostgreSQL + 백엔드 실행 설정
```

## 백엔드 실행

EC2 또는 로컬 Docker 환경에서 다음 명령으로 PostgreSQL과 백엔드를 실행합니다.

```bash
docker compose up -d --build
```

백엔드 상태 확인:

```bash
curl http://localhost:8080/api/health
```

## 모바일 앱

모바일 앱은 `mobile/` 폴더에서 관리합니다.

```powershell
cd mobile
npm.cmd install
npm.cmd exec -- expo start
```

APK 빌드는 EAS preview 프로필을 사용합니다.

```powershell
cd mobile
eas build -p android --profile preview
```

## 환경 변수

배포 서버에서는 `.env` 파일에 PostgreSQL, JWT, 식품안전나라 API 키를 설정합니다. 예시는 `.env.example`을 참고합니다.
