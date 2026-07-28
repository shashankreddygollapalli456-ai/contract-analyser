// Thin wrapper around amqplib used only for the AI-analysis pipeline (queue-based).
// Every other inter-service call in the platform goes over REST.
const amqp = require("amqplib");
const axios = require("axios");

const AI_ANALYSIS_QUEUE = "ai_analysis_queue";
const AI_RESULT_QUEUE = "ai_result_queue";

// If RABBITMQ_URL is not set (e.g. running locally on Windows without Docker),
// we retry only 1 time and fall back to REST.
const isLocal = !process.env.RABBITMQ_URL;
const MAX_RETRIES = isLocal ? 1 : 10;
const RETRY_DELAY_MS = 1000;

let channelPromise = null;
let useLocalFallback = false;

async function connectWithRetry(retries = 0) {
  try {
    const url = process.env.RABBITMQ_URL || "amqp://localhost:5672"; // try localhost locally instead of docker host 'rabbitmq'
    const conn = await amqp.connect(url);

    // Reset on connection error/close so the next call triggers a fresh reconnect
    conn.on("error", (err) => {
      console.error("[rabbitmq] Connection error:", err.message);
      channelPromise = null;
    });
    conn.on("close", () => {
      console.warn("[rabbitmq] Connection closed — will reconnect on next request");
      channelPromise = null;
    });

    const channel = await conn.createChannel();
    await channel.assertQueue(AI_ANALYSIS_QUEUE, { durable: true });
    await channel.assertQueue(AI_RESULT_QUEUE, { durable: true });
    console.log("[rabbitmq] Connected and queues asserted");
    return channel;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, Math.min(retries, 4));
      console.warn(`[rabbitmq] Connection attempt ${retries + 1} failed (${err.message}). Retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
      return connectWithRetry(retries + 1);
    }
    throw new Error(`[rabbitmq] Could not connect after ${MAX_RETRIES} attempts: ${err.message}`);
  }
}

async function getChannel() {
  if (useLocalFallback) {
    return null;
  }
  if (!channelPromise) {
    channelPromise = connectWithRetry().catch((err) => {
      console.warn("[rabbitmq] Connection to RabbitMQ failed. Activating REST fallback mode:", err.message);
      useLocalFallback = true;
      channelPromise = null;
      return null;
    });
  }
  return channelPromise;
}

async function publish(queue, message) {
  const channel = await getChannel();
  if (useLocalFallback || !channel) {
    console.log("[rabbitmq] [REST Fallback] Forwarding message to AI service via HTTP POST...");
    // Local URL replaces docker DNS hostname "ai-service" with "localhost"
    const rawAiUrl = process.env.AI_SERVICE_URL || "http://localhost:4003";
    const aiUrl = rawAiUrl.replace("ai-service", "localhost");
    try {
      await axios.post(`${aiUrl}/api/ai/internal/analyze`, message);
      console.log("[rabbitmq] [REST Fallback] Successfully triggered analysis job via REST");
    } catch (err) {
      console.error("[rabbitmq] [REST Fallback] Failed to trigger analysis via REST:", err.message);
      throw err;
    }
  } else {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  }
}

async function consume(queue, handler) {
  const channel = await getChannel();
  if (useLocalFallback || !channel) {
    console.log("[rabbitmq] [REST Fallback] RabbitMQ consume is a no-op. Listening via HTTP endpoint instead.");
    return;
  }
  await channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`Error processing message from ${queue}:`, err.message);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = { publish, consume, AI_ANALYSIS_QUEUE, AI_RESULT_QUEUE };
