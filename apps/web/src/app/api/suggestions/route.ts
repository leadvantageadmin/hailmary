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
    // Use search to get matching documents and extract unique values
    const searchParams = {
      index: process.env.OPENSEARCH_INDEX || 'customers',
      body: {
        size: 100, // Get more results to find unique values
        query: {
          match: {
            [field]: {
              query: query,
              operator: "and"
            }
          }
        }
      }
    };

    const result = await client.search(searchParams as any);
    console.log('🔍 OpenSearch result total:', result.body.hits?.total);
    console.log('🔍 OpenSearch result hits:', result.body.hits?.hits?.length);
    
    const allValues = result.body.hits?.hits?.map((hit: any) => hit._source[field]).filter((value: any) => value && value.trim() !== '') || [];
    console.log('📋 All values found:', allValues);
    
    // Get unique values and sort them
    const uniqueValues = [...new Set(allValues)].sort().slice(0, limit);
    const suggestions = uniqueValues;
    console.log('✅ Final suggestions:', suggestions);
    
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
