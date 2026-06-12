const memoryCache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute cache duration

export const getCache = (key) => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    memoryCache.delete(key);
    return null;
  }
  return cached.data;
};

export const setCache = (key, data) => {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

export const clearCache = () => {
  memoryCache.clear();
};
