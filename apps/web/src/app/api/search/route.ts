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
  jobTitleLevel: z.array(z.string()).optional(),
  department: z.array(z.string()).optional(),
  minEmployeeSize: z.array(z.number()).optional(),
  maxEmployeeSize: z.array(z.number()).optional(),
  industry: z.array(z.string()).optional(),
});

const BodySchema = z.object({
  filters: FilterSchema.default({}),
  page: z.object({ 
    size: z.number().min(1).max(100).default(25), 
    number: z.number().min(1).default(1) 
  }).default({ size: 25, number: 1 }),
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
  const cacheKey = `search:${stableStringify({ filters, pageSize: page.size, pageNumber: page.number })}`;

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
      // Single value - use match query for better partial matching
      const searchValue = values[0];
      const query = { 
        match: { 
          [field]: {
            query: searchValue,
            operator: "and",
            fuzziness: "AUTO"
          }
        } 
      };
      return query;
    } else {
      // Multiple values - use bool query with should clauses
      const query = {
        bool: {
          should: values.map(value => ({
            match: { 
              [field]: {
                query: value,
                operator: "and",
                fuzziness: "AUTO"
              }
            }
          })),
          minimum_should_match: 1
        }
      };
      return query;
    }
  };

  if (filters.company?.length) mustFilters.push(createPartialMatchQuery('company', filters.company));
  if (filters.country?.length) mustFilters.push(createPartialMatchQuery('country', filters.country));
  if (filters.city?.length) mustFilters.push(createPartialMatchQuery('city', filters.city));
  if (filters.state?.length) mustFilters.push(createPartialMatchQuery('state', filters.state));
  if (filters.jobTitle?.length) mustFilters.push(createPartialMatchQuery('jobTitle', filters.jobTitle));
  if (filters.jobTitleLevel?.length) mustFilters.push(createPartialMatchQuery('jobTitleLevel', filters.jobTitleLevel));
  if (filters.department?.length) mustFilters.push(createPartialMatchQuery('department', filters.department));
  if (filters.minEmployeeSize?.length) {
    // For numeric employee size, use range queries on minEmployeeSize
    if (filters.minEmployeeSize.length === 1) {
      // Single value - find companies with min employee size >= this value
      mustFilters.push({ range: { minEmployeeSize: { gte: filters.minEmployeeSize[0] } } });
    } else {
      // Multiple values - find companies with min employee size >= any of these values
      mustFilters.push({
        bool: {
          should: filters.minEmployeeSize.map(value => ({
            range: { minEmployeeSize: { gte: value } }
          })),
          minimum_should_match: 1
        }
      });
    }
  }
  
  if (filters.maxEmployeeSize?.length) {
    // For max employee size, use range queries on maxEmployeeSize
    if (filters.maxEmployeeSize.length === 1) {
      // Single value - find companies with max employee size <= this value
      mustFilters.push({ range: { maxEmployeeSize: { lte: filters.maxEmployeeSize[0] } } });
    } else {
      // Multiple values - find companies with max employee size <= any of these values
      mustFilters.push({
        bool: {
          should: filters.maxEmployeeSize.map(value => ({
            range: { maxEmployeeSize: { lte: value } }
          })),
          minimum_should_match: 1
        }
      });
    }
  }
  if (filters.industry?.length) mustFilters.push(createPartialMatchQuery('industry', filters.industry));

  const sort = [{ id: 'asc' }];
  const from = (page.number - 1) * page.size;
  
  // If no filters, use match_all query, otherwise use filtered query
  let query;
  if (mustFilters.length === 0) {
    query = { match_all: {} };
  } else {
    query = { bool: { filter: mustFilters } };
  }
  
  const searchParams: any = {
    index: process.env.OPENSEARCH_INDEX || 'customers',
    body: {
      track_scores: false,
      from,
      size: page.size,
      sort,
      query,
    },
  };
  

  try {
    const result = await client.search(searchParams as any);
    const items = (result.body.hits.hits || []).map((h: any) => ({ id: h.sort?.[0] ?? h._id, ...h._source }));
    const totalHits = result.body.hits.total?.value || result.body.hits.total || 0;
    const totalPages = Math.ceil(totalHits / page.size);
    const hasNextPage = page.number < totalPages;
    const hasPrevPage = page.number > 1;
    
    const response = { 
      items, 
      pagination: {
        currentPage: page.number,
        pageSize: page.size,
        totalItems: totalHits,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
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
  const jobTitleLevel = url.searchParams.getAll('jobTitleLevel');
  const department = url.searchParams.getAll('department');
  const minEmployeeSize = url.searchParams.getAll('minEmployeeSize').map(Number).filter(n => !isNaN(n));
  const maxEmployeeSize = url.searchParams.getAll('maxEmployeeSize').map(Number).filter(n => !isNaN(n));
  const industry = url.searchParams.getAll('industry');
  
  const filters: any = {};
  if (company.length) filters.company = company;
  if (country.length) filters.country = country;
  if (city.length) filters.city = city;
  if (state.length) filters.state = state;
  if (jobTitle.length) filters.jobTitle = jobTitle;
  if (jobTitleLevel.length) filters.jobTitleLevel = jobTitleLevel;
  if (department.length) filters.department = department;
  if (minEmployeeSize.length) filters.minEmployeeSize = minEmployeeSize;
  if (maxEmployeeSize.length) filters.maxEmployeeSize = maxEmployeeSize;
  if (industry.length) filters.industry = industry;
  
  const body = { filters, page: { size: 25, number: 1 } };
  return POST(new NextRequest(req.url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }));
});
