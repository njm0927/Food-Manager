const WORKER_PATH = '/food-manager-sw.js';

export async function registerNotificationWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(WORKER_PATH);
  } catch {
    return null;
  }
}

export async function showAppNotification(title, body) {
  if (!('Notification' in window)) {
    throw new Error('현재 브라우저는 알림을 지원하지 않습니다.');
  }

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;

  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 허용되지 않았습니다.');
  }

  const options = {
    body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'food-manager-expiry',
    renotify: true,
  };

  const registration = await registerNotificationWorker();
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }

  new Notification(title, options);
}

export function canUseNotification() {
  return 'Notification' in window;
}

export function hasNotificationPermission() {
  return canUseNotification() && Notification.permission === 'granted';
}
