export function getSarvamKeyManager() {
  const keys = [
    process.env.SARVAM_API_KEY_1,
    process.env.SARVAM_API_KEY_2,
    process.env.SARVAM_API_KEY_3
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    // fallback if user didn't use 1, 2, 3 format
    if (process.env.SARVAM_API_KEY) {
      keys.push(process.env.SARVAM_API_KEY);
    } else {
      throw new Error('No SARVAM_API_KEY found in environment variables');
    }
  }

  let currentIndex = Math.floor(Math.random() * keys.length);

  return {
    keyCount: keys.length,
    getNextKey: () => {
      const key = keys[currentIndex];
      currentIndex = (currentIndex + 1) % keys.length;
      return key;
    },
    reportSuccess: (key: string) => {},
    reportRateLimit: (key: string, retryAfter?: number) => {},
    reportFailure: (key: string) => {}
  };
}
