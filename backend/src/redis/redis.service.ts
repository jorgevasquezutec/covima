import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private readonly subscriptions = new Map<
    string,
    Set<(message: any) => void>
  >();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis publisher: max retries reached');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis subscriber: max retries reached');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.publisher.on('connect', () => {
      this.logger.log('Redis publisher connected');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error:', err.message);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error:', err.message);
    });

    // Handle messages
    this.subscriber.on('message', (channel, message) => {
      const callbacks = this.subscriptions.get(channel);
      if (callbacks) {
        try {
          const parsed = JSON.parse(message);
          callbacks.forEach((callback) => {
            try {
              callback(parsed);
            } catch (err) {
              this.logger.error(
                `Error in subscription callback for ${channel}:`,
                err,
              );
            }
          });
        } catch (err) {
          this.logger.error(`Error parsing message from ${channel}:`, err);
        }
      }
    });
  }

  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (err) {
      this.logger.error(`Error publishing to ${channel}:`, err);
    }
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      await this.subscriber.subscribe(channel);
      this.logger.log(`Subscribed to channel: ${channel}`);
    }
    this.subscriptions.get(channel)!.add(callback);
  }

  async unsubscribe(
    channel: string,
    callback?: (message: any) => void,
  ): Promise<void> {
    const callbacks = this.subscriptions.get(channel);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(channel);
        await this.subscriber.unsubscribe(channel);
        this.logger.log(`Unsubscribed from channel: ${channel}`);
      }
    } else {
      this.subscriptions.delete(channel);
      await this.subscriber.unsubscribe(channel);
      this.logger.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  // Métodos para caché simple
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.publisher.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.publisher.setex(key, ttlSeconds, serialized);
    } else {
      await this.publisher.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.publisher.del(key);
  }

  onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber.disconnect();
    this.logger.log('Redis connections closed');
  }
}
