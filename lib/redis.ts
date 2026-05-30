import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type Plan = 'free' | 'pro' | 'max';

export interface Subscription {
  plan: Plan;
  planCode: string;
  customerCode: string;
  subscriptionCode: string;
  email: string;
  createdAt: number;
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  return redis.get<Subscription>(`sub:${userId}`);
}

export async function setSubscription(userId: string, data: Subscription): Promise<void> {
  await redis.set(`sub:${userId}`, data);
}

export async function getSubscriptionByEmail(email: string): Promise<string | null> {
  return redis.get<string>(`email:${email}`);
}

export async function setEmailToUser(email: string, userId: string): Promise<void> {
  await redis.set(`email:${email}`, userId);
}

export async function followTrader(userId: string, address: string): Promise<void> {
  await redis.sadd(`following:${userId}`, address);
}

export async function unfollowTrader(userId: string, address: string): Promise<void> {
  await redis.srem(`following:${userId}`, address);
}

export async function isFollowing(userId: string, address: string): Promise<boolean> {
  const result = await redis.sismember(`following:${userId}`, address);
  return result === 1;
}

export async function getFollowing(userId: string): Promise<string[]> {
  return redis.smembers(`following:${userId}`);
}
