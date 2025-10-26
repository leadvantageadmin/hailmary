import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenSearchClient, ensureIndex } from '@/lib/elasticsearch';
import { getRedis } from '@/lib/redis';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const SuggestionSchema = z.object({
  field: z.enum([
    'company', 'country', 'city', 'state', 'jobTitle', 'jobTitleLevel', 'department', 'industry',
    // New materialized view fields
    'firstName', 'lastName', 'fullName', 'email', 'companyName', 'domain',
    // Company-specific fields
    'company_country', 'company_city', 'company_state', 'company_name'
  ]),
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
    console.log(`[CACHE HIT] Suggestions API - Key: ${cacheKey}`);
    return NextResponse.json(JSON.parse(cached));
  }
  
  console.log(`[CACHE MISS] Suggestions API - Key: ${cacheKey} - Querying Elasticsearch`);

  const client = getOpenSearchClient();
  await ensureIndex(process.env.ELASTICSEARCH_INDEX || 'company_prospect_view');

  // Map old field names to new materialized view field names
  const fieldMapping: Record<string, string> = {
    'company': 'company_name',
    'country': 'company_country',
    'city': 'company_city',
    'state': 'company_state',
    'companyName': 'company_name',
    'fullName': 'fullname',
    // Map to actual field names in Elasticsearch index
    'firstName': 'firstname',
    'lastName': 'lastname',
    'email': 'email',
    'domain': 'domain',
    'jobTitle': 'jobtitle',
    'jobTitleLevel': 'jobtitlelevel',
    'department': 'department',
    'industry': 'industry',
    'company_country': 'company_country',
    'company_city': 'company_city',
    'company_state': 'company_state',
    'company_name': 'company_name'
  };

  const elasticsearchField = fieldMapping[field] || field;

  try {
    // Use search to get matching documents and extract unique values
    const searchParams = {
      index: process.env.ELASTICSEARCH_INDEX || 'company_prospect_view',
      body: {
        size: 100, // Get more results to find unique values
        query: {
          bool: {
            should: [
              // Prefix match for partial suggestions
              {
                prefix: {
                  [elasticsearchField]: {
                    value: query.toLowerCase()
                  }
                }
              },
              // Fuzzy match for typos and variations
              {
                match: {
                  [elasticsearchField]: {
                    query: query,
                    fuzziness: "AUTO",
                    operator: "or"
                  }
                }
              },
              // Wildcard match for partial word matching
              {
                wildcard: {
                  [elasticsearchField]: {
                    value: `*${query.toLowerCase()}*`
                  }
                }
              }
            ],
            minimum_should_match: 1
          }
        }
      }
    };

    const result = await client.search(searchParams as any);
    const allValues = result.hits?.hits?.map((hit: any) => hit._source[elasticsearchField]).filter((value: any) => value && typeof value === 'string' && value.trim() !== '') as string[] || [];
    
    // Get unique values and prioritize them
    const uniqueValues: string[] = [...new Set(allValues)];
    
    // Sort suggestions with priority: exact matches first, then prefix matches, then others
    const suggestions = uniqueValues.sort((a: string, b: string) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Exact match gets highest priority
      if (aLower === queryLower && bLower !== queryLower) return -1;
      if (bLower === queryLower && aLower !== queryLower) return 1;
      
      // Prefix match gets second priority
      if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
      if (bLower.startsWith(queryLower) && !aLower.startsWith(queryLower)) return 1;
      
      // Then alphabetical
      return a.localeCompare(b);
    }).slice(0, limit);
    
    const response = { suggestions };
    console.log(`[CACHE SET] Suggestions API - Key: ${cacheKey} - Stored in Redis with 300s TTL`);
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
