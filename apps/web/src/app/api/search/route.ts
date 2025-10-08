import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOpenSearchClient, ensureIndex } from '@/lib/opensearch';
import { getRedis } from '@/lib/redis';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

const FilterSchema = z.object({
  company: z.array(z.string()).optional(),
  country: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  state: z.array(z.string()).optional(),
  jobTitle: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
      employeeSize: z.array(z.number()).optional(),
  industry: z.array(z.string()).optional(),
});

const BodySchema = z.object({
  filters: FilterSchema.default({}),
  page: z.object({ size: z.number().min(1).max(100).default(20), cursor: z.string().optional() }).default({ size: 20 }),
});

function stableStringify(value: unknown): string {
  try {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(Object.keys(value as Record<string, unknown>).sort().reduce((acc: Record<string, unknown>, k) => {
        // @ts-ignore
        acc[k] = (value as any)[k];
        return acc;
      }, {}));
    }
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(value);
  }
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.format() }, { status: 400 });
  }

  const { filters, page } = parsed.data;
  const cacheKey = `search:${stableStringify({ filters, pageSize: page.size, cursor: page.cursor ?? null })}`;

  const redis = getRedis();
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  const client = getOpenSearchClient();
  await ensureIndex(process.env.OPENSEARCH_INDEX || 'customers');

  const mustFilters: any[] = [];
  
  // Helper function to create partial match queries
  const createPartialMatchQuery = (field: string, values: string[]) => {
    if (values.length === 1) {
      // Single value - use wildcard for partial match
      return { wildcard: { [field]: { value: `*${values[0].toLowerCase()}*`, case_insensitive: true } } };
    } else {
      // Multiple values - use bool query with should clauses
      return {
        bool: {
          should: values.map(value => ({
            wildcard: { [field]: { value: `*${value.toLowerCase()}*`, case_insensitive: true } }
          })),
          minimum_should_match: 1
        }
      };
    }
  };

  if (filters.company?.length) mustFilters.push(createPartialMatchQuery('company', filters.company));
  if (filters.country?.length) mustFilters.push(createPartialMatchQuery('country', filters.country));
  if (filters.city?.length) mustFilters.push(createPartialMatchQuery('city', filters.city));
  if (filters.state?.length) mustFilters.push(createPartialMatchQuery('state', filters.state));
  if (filters.jobTitle?.length) mustFilters.push(createPartialMatchQuery('jobTitle', filters.jobTitle));
  if (filters.department?.length) mustFilters.push(createPartialMatchQuery('department', filters.department));
  if (filters.employeeSize?.length) {
    // For numeric employee size, use range queries
    if (filters.employeeSize.length === 1) {
      // Single value - find companies with employee size >= this value
      mustFilters.push({ range: { employeeSize: { gte: filters.employeeSize[0] } } });
    } else {
      // Multiple values - find companies with employee size >= any of these values
      mustFilters.push({
        bool: {
          should: filters.employeeSize.map(value => ({
            range: { employeeSize: { gte: value } }
          })),
          minimum_should_match: 1
        }
      });
    }
  }
  if (filters.industry?.length) mustFilters.push(createPartialMatchQuery('industry', filters.industry));

  const sort = [{ id: 'asc' }];
  const searchParams: any = {
    index: process.env.OPENSEARCH_INDEX || 'customers',
    body: {
      track_scores: false,
      size: page.size,
      sort,
      query: { bool: { filter: mustFilters } },
    },
  };
  if (page.cursor) searchParams.body.search_after = [page.cursor];

  try {
    const result = await client.search(searchParams as any);
    const items = (result.body.hits.hits || []).map((h: any) => ({ id: h.sort?.[0] ?? h._id, ...h._source }));
    const nextCursor = items.length === page.size ? items[items.length - 1]?.id : undefined;
    const response = { items, nextCursor };
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
    return NextResponse.json(response);
  } catch (e: any) {
    const message = e?.message || 'Search failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const url = new URL(req.url);
  const company = url.searchParams.getAll('company');
  const country = url.searchParams.getAll('country');
  const city = url.searchParams.getAll('city');
  const state = url.searchParams.getAll('state');
  const jobTitle = url.searchParams.getAll('jobTitle');
  const department = url.searchParams.getAll('department');
  const employeeSize = url.searchParams.getAll('employeeSize').map(Number).filter(n => !isNaN(n));
  const industry = url.searchParams.getAll('industry');
  
  const filters: any = {};
  if (company.length) filters.company = company;
  if (country.length) filters.country = country;
  if (city.length) filters.city = city;
  if (state.length) filters.state = state;
  if (jobTitle.length) filters.jobTitle = jobTitle;
  if (department.length) filters.department = department;
  if (employeeSize.length) filters.employeeSize = employeeSize;
  if (industry.length) filters.industry = industry;
  
  const body = { filters, page: { size: 10 } };
  return POST(new NextRequest(req.url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
});
