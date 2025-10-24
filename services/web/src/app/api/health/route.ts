import { NextResponse } from 'next/server';
import { getOpenSearchClient } from '@/lib/elasticsearch';
import { getRedis } from '@/lib/redis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    error: undefined as string | undefined,
    services: {
      web: { status: 'healthy' },
      postgres: { status: 'unknown' as string, error: undefined as string | undefined },
      elasticsearch: { status: 'unknown' as string, error: undefined as string | undefined },
      redis: { status: 'unknown' as string, error: undefined as string | undefined }
    }
  };

  try {
    // Check PostgreSQL connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.postgres.status = 'healthy';
    } catch (error) {
      health.services.postgres.status = 'unhealthy';
      health.services.postgres.error = String(error);
    }

    // Check Elasticsearch connection
    try {
      const client = getOpenSearchClient();
      await client.cluster.health();
      health.services.elasticsearch.status = 'healthy';
    } catch (error) {
      health.services.elasticsearch.status = 'unhealthy';
      health.services.elasticsearch.error = String(error);
    }

    // Check Redis connection
    try {
      const redis = getRedis();
      await redis.ping();
      health.services.redis.status = 'healthy';
    } catch (error) {
      health.services.redis.status = 'unhealthy';
      health.services.redis.error = String(error);
    }

    // Determine overall health
    const allHealthy = Object.values(health.services).every(service => service.status === 'healthy');
    health.status = allHealthy ? 'ok' : 'degraded';

    const statusCode = allHealthy ? 200 : 503;
    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    health.status = 'error';
    health.error = String(error);
    return NextResponse.json(health, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
