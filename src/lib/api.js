export function getToken() {
  return localStorage.getItem('food-manager-token') || '';
}

export function readUser() {
  return null;
}

export function saveSession(data) {
  localStorage.setItem('food-manager-token', data.token);
}

export function clearSession() {
  localStorage.removeItem('food-manager-token');
}

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error('백엔드 서버가 실행 중이 아닙니다. docker compose up -d --build 후 다시 시도해 주세요.');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!response.ok) throw new Error(data?.detail ? `${data.message}: ${data.detail}` : data?.message || '요청에 실패했습니다.');
  return data;
}
