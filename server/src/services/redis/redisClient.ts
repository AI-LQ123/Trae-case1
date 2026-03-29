import Redis from 'ioredis';

class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.isConnected = false;
    });
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async set(key: string, value: string | number, expiration?: number): Promise<boolean> {
    try {
      if (expiration) {
        await this.client.set(key, value, 'EX', expiration);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  async sadd(key: string, value: string): Promise<boolean> {
    try {
      await this.client.sadd(key, value);
      return true;
    } catch (error) {
      console.error('Redis sadd error:', error);
      return false;
    }
  }

  async srem(key: string, value: string): Promise<boolean> {
    try {
      await this.client.srem(key, value);
      return true;
    } catch (error) {
      console.error('Redis srem error:', error);
      return false;
    }
  }

  async sismember(key: string, value: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, value);
      return result === 1;
    } catch (error) {
      console.error('Redis sismember error:', error);
      return false;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error('Redis smembers error:', error);
      return [];
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis hset error:', error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error('Redis hget error:', error);
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<boolean> {
    try {
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      console.error('Redis hdel error:', error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      console.error('Redis hgetall error:', error);
      return {};
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -1;
    }
  }

  close(): void {
    this.client.quit();
  }
}

export default new RedisClient();
