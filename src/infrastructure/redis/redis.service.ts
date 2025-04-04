import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    this.client = createClient({
      url: `redis://${password ? `:${password}@` : ''}${host}:${port}`,
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, { EX: ttl });
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Alias for del to match error references
  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  // Set key only if it doesn't exist
  async setIfNotExists(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<boolean> {
    let result: string | null;
    if (ttl) {
      result = await this.client.set(key, value, { NX: true, EX: ttl });
    } else {
      result = await this.client.set(key, value, { NX: true });
    }
    return result === 'OK';
  }

  // Get all keys matching a pattern
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, callback);
  }
}
