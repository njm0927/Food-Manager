const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:8080';

async function request(label, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  const okMark = response.ok ? 'OK' : 'FAIL';
  console.log(`\n[${okMark}] ${label}`);
  console.log(`status: ${response.status}`);
  console.log(JSON.stringify(body, null, 2));

  return { response, body };
}

const uniqueId = `smoke${Date.now().toString().slice(-8)}`;

console.log(`Food Manager smoke test: ${baseUrl}`);

await request('DB health check', '/api/health');

const signup = await request('consumer signup', '/api/auth/signup/consumer', {
  method: 'POST',
  body: JSON.stringify({
    userId: uniqueId,
    password: '1234567',
    name: '스모크테스트',
    phone: '01012345678',
    email: `${uniqueId}@example.com`,
    postcode: '04524',
    address: '서울 중구 세종대로 110',
    detailAddress: '테스트 1층',
    latitude: 37.5665,
    longitude: 126.978,
  }),
});

const token = signup.body?.token;

await request('demo consumer login', '/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ userId: 'consumer', password: '1234567' }),
});

if (token) {
  await request('new user profile', '/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

await request('nearby discounts', '/api/discounts/nearby?latitude=37.5665&longitude=126.978');
await request('recipe API proxy', '/api/recipes?query=%EA%B9%80%EC%B9%98');
