import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenSearchClient, ensureIndex } from '@/lib/opensearch';
import { getRedis } from '@/lib/redis';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const SuggestionSchema = z.object({
  field: z.enum(['company', 'country', 'city', 'state', 'jobTitle', 'department', 'industry']),
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(20).default(10)
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
  }

  const { field, query, limit } = parsed.data;
  const cacheKey = `suggestions:${field}:${query.toLowerCase()}:${limit}`;

  const redis = getRedis();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const client = getOpenSearchClient();
  await ensureIndex(process.env.OPENSEARCH_INDEX || 'customers');

  try {
    // Use aggregation to get unique values for the field
    const searchParams = {
      index: process.env.OPENSEARCH_INDEX || 'customers',
      body: {
        size: 0,
        query: {
          wildcard: {
            [field]: {
              value: `*${query.toLowerCase()}*`,
              case_insensitive: true
            }
          }
        },
        aggs: {
          unique_values: {
            terms: {
              field: `${field}.keyword`,
              size: limit,
              order: { _key: 'asc' }
            }
          }
        }
      }
    };

    const result = await client.search(searchParams as any);
    const suggestions = result.body.aggregations?.unique_values?.buckets?.map((bucket: any) => bucket.key) || [];
    
    const response = { suggestions };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 300); // Cache for 5 minutes
    return NextResponse.json(response);
  } catch (e: any) {
    const message = e?.message || 'Suggestions failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const url = new URL(req.url);
  const field = url.searchParams.get('field') as any;
  const query = url.searchParams.get('query') || '';
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  const body = { field, query, limit };
  return POST(new NextRequest(req.url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
});
