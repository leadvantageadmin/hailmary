import { Client } from '@opensearch-project/opensearch';

let client: Client | null = null;

export function getOpenSearchClient(): Client {
  if (!client) {
    client = new Client({ node: process.env.OPENSEARCH_URL || 'http://localhost:9200' });
  }
  return client;
}


export async function ensureIndex(index: string) {
  const c = getOpenSearchClient();
  const exists = await c.indices.exists({ index });
  if (!exists.body) {
    await c.indices.create({ index, body: {
      mappings: { properties: {
        id: { type: "keyword" },
        name: { type: "keyword" },
        sector: { type: "keyword" },
        industry: { type: "keyword" },
        size: { type: "integer" },
        location: { type: "geo_point" }
      } }
    } });
  }
}
