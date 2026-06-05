const url = process.env.BACKEND_HEALTH_URL || 'http://127.0.0.1:8080/api/health';
const timeoutMs = Number(process.env.BACKEND_WAIT_TIMEOUT_MS || 60000);
const startedAt = Date.now();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

while (Date.now() - startedAt < timeoutMs) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Backend is ready: ${url}`);
      process.exit(0);
    }
  } catch {
    // Keep waiting until Docker finishes starting the Java backend.
  }

  await sleep(1500);
}

console.error(`Backend did not become ready within ${timeoutMs / 1000}s: ${url}`);
process.exit(1);
