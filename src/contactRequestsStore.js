const { Redis } = require("@upstash/redis");
const { seedContactRequests } = require("./data");

const CONTACT_REQUESTS_KEY = "localfinder:contact-requests";
const CONTACT_REQUEST_COUNTER_KEY = "localfinder:contact-requests:counter";

const memoryContactRequests = [...seedContactRequests];
let redisClient = null;
let redisSeedPromise = null;

function getStorageMode() {
  return hasUpstashEnv() ? "upstash-redis" : "memory";
}

async function listContactRequests() {
  if (!hasUpstashEnv()) {
    return [...memoryContactRequests];
  }

  await ensureRedisSeeded();
  const redis = getRedisClient();
  const items = await redis.lrange(CONTACT_REQUESTS_KEY, 0, -1);
  return items.map(normalizeStoredContactRequest).filter(Boolean);
}

async function createContactRequest(input) {
  const contactRequest = {
    id: await nextContactRequestId(),
    propertyId: input.propertyId,
    userName: input.userName,
    email: input.email,
    phone: input.phone || null,
    message: input.message,
    status: "SENT",
    createdAt: new Date().toISOString()
  };

  if (hasUpstashEnv()) {
    await ensureRedisSeeded();
    await getRedisClient().rpush(CONTACT_REQUESTS_KEY, contactRequest);
  } else {
    memoryContactRequests.push(contactRequest);
  }

  return contactRequest;
}

async function getStoreInfo() {
  const items = await listContactRequests();

  return {
    mode: getStorageMode(),
    contactRequestsCount: items.length,
    isPersistent: hasUpstashEnv()
  };
}

async function nextContactRequestId() {
  if (!hasUpstashEnv()) {
    return `contact_${String(memoryContactRequests.length + 1).padStart(3, "0")}`;
  }

  await ensureRedisSeeded();
  const value = await getRedisClient().incr(CONTACT_REQUEST_COUNTER_KEY);
  return `contact_${String(value).padStart(3, "0")}`;
}

async function ensureRedisSeeded() {
  if (!hasUpstashEnv()) return;

  if (!redisSeedPromise) {
    redisSeedPromise = seedRedis();
  }

  await redisSeedPromise;
}

async function seedRedis() {
  const redis = getRedisClient();
  const exists = await redis.exists(CONTACT_REQUESTS_KEY);

  if (exists) return;

  if (seedContactRequests.length > 0) {
    await redis.rpush(CONTACT_REQUESTS_KEY, ...seedContactRequests);
  }

  await redis.set(CONTACT_REQUEST_COUNTER_KEY, seedContactRequests.length);
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }

  return redisClient;
}

function hasUpstashEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function normalizeStoredContactRequest(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  return value;
}

module.exports = {
  createContactRequest,
  getStoreInfo,
  getStorageMode,
  listContactRequests
};
