export const DEFAULT_NOTIFICATION_SETTINGS = { enabled: true, days: [1, 3, 7], discountEnabled: true };

export function getExpiryTargets(foods, days) {
  const threshold = Math.max(...days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return foods
    .map((food) => {
      const expiry = new Date(food.expiryDate || food.expiry_date);
      if (Number.isNaN(expiry.getTime())) return null;
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expiry - today) / 86400000);
      return {
        name: food.itemName || food.name || food.item_name || '식료품',
        daysLeft,
      };
    })
    .filter(Boolean)
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= threshold)
    .slice(0, 5);
}

export function buildExpiryNotificationBody(targets, targetDays) {
  if (!targets.length) return `${targetDays.join(', ')}일 전 알림 기준 이내에 해당되는 식료품은 없습니다.`;
  return targets.map((item) => `${item.name} ${formatDaysLeft(item.daysLeft)}`).join(', ');
}

export function getAddressRegion(addressInfo) {
  const address = String(addressInfo?.address || '').trim();
  if (!address) return '';
  const tokens = address.split(/\s+/).filter(Boolean);
  const directCity = tokens.find((token) => /(특별시|광역시|특별자치시|시)$/.test(token));
  if (directCity) return directCity;
  return tokens[0] || '';
}

export function normalizeBusinessNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

export function isValidBusinessNumber(value) {
  const digits = normalizeBusinessNumber(value);
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0)
    + Math.floor((Number(digits[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[9]);
}

function formatDaysLeft(daysLeft) {
  if (daysLeft === 0) return '오늘까지';
  return `${daysLeft}일 남음`;
}
