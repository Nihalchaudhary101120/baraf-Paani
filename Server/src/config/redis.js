import IORedis from "ioredis";

const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

redisConnection.on("connect", () => {
  console.log("Redis Connected");
});

redisConnection.on("error", (err) => {
  console.error("Redis Error:", err);
});

export default redisConnection;