import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis(process.env.REDIS_URL || 'localhost');

type RateLimitConfig = {
  interval: number;
  limit: number;
};

export async function rateLimiter(req: NextRequest, config: RateLimitConfig) {
  const ip = req.ip ?? '127.0.0.1';
  const key = `rate_limit:${ip}`;

  const [[, count]] = (await redis
    .multi()
    .incr(key)
    .expire(key, config.interval)
    .exec()) as [null | Error, number][];

  if (typeof count !== 'number') {
    console.error('Unexpected response from Redis');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  const totalHits = count;

  if (totalHits > config.limit) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + config.interval * 1000).toString(),
        },
      }
    );
  }

  return null;
}