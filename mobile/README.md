# Food Manager Mobile

React Native/Expo version of Food Manager.

## Run

From the repository root:

```powershell
npm.cmd run docker:up
npm.cmd run mobile:start
```

For Android Emulator, the default API base URL is:

```text
http://10.0.2.2:8080
```

You can verify the backend from the Android Emulator browser:

```text
http://10.0.2.2:8080/api/health
```

If this does not return JSON, the mobile app cannot reach the backend yet. Check that Docker is running and the backend container is healthy.

You can also change the backend URL inside the mobile app:

1. Open `설정`.
2. In `백엔드 연결`, enter one of these URLs.
3. Press `주소 저장`, then `연결 테스트`.

```text
http://10.0.2.2:8080
http://127.0.0.1:8080
http://YOUR_PC_IP:8080
```

If `adb` is installed, this command lets the Android Emulator use `http://127.0.0.1:8080`:

```powershell
adb reverse tcp:8080 tcp:8080
```

For a physical phone, set the backend URL to your PC's LAN IP before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://YOUR_PC_IP:8080'
npm.cmd run mobile:start
```

## Implemented

- Native login and signup flow
- Consumer and seller tab layout
- Food create/delete
- Seller sale create/delete with duplicate item prevention from the backend
- Consumer nearby sale list
- Recipe recommendation from registered food names
- Address registration with Kakao postcode WebView and detail address input
- Consumer address delete, seller address change-only policy
- Local push notification test through Expo Notifications
- Notification history from the Spring Boot API

## Notes

The Spring Boot backend and PostgreSQL database remain the source of truth. The mobile app calls the same REST API as the web prototype.
