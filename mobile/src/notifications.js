import { Alert, Platform } from 'react-native';

let notificationModulePromise;

async function loadNotifications() {
  if (Platform.OS === 'web') return null;
  if (!notificationModulePromise) {
    notificationModulePromise = import('expo-notifications')
      .then((module) => module)
      .catch(() => null);
  }
  return notificationModulePromise;
}

export async function requestNotificationPermission() {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  const finalStatus = current.status === 'granted'
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  return true;
}

export async function showAppNotification(title, body) {
  const safeTitle = title || 'Food Manager 알림';
  const safeBody = body || '새 알림이 도착했습니다.';

  const Notifications = await loadNotifications();
  if (Notifications && await requestNotificationPermission()) {
    await Notifications.scheduleNotificationAsync({
      content: { title: safeTitle, body: safeBody },
      trigger: null,
    });
    return true;
  }

  if (Platform.OS !== 'web') {
    Alert.alert(safeTitle, safeBody);
    return true;
  }

  return false;
}
