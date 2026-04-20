import { lpushMessage } from "@/lib/redis";

export interface PushToRedisInput {
  phone: string;
  clientId: string;
  content: string;
  timestamp: string;
}

export const pushToRedis = async (input: PushToRedisInput): Promise<number> => {
  try {
    const { phone, clientId, content, timestamp } = input;
    const key = `messages:${clientId}:${phone}`;
    const value = JSON.stringify({ content, timestamp });

    return await lpushMessage(key, value);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to push message to Redis: ${errorMessage}`);
  }
};
