import { Client } from '@elastic/elasticsearch';

let client: Client | null = null;

export function getElasticsearchClient(): Client {
  if (!client) {
    client = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });
  }
  return client;
}

// Keep backward compatibility
export const getOpenSearchClient = getElasticsearchClient;


export async function ensureIndex(index: string) {
  const c = getOpenSearchClient();
  
  try {
    // Check if index exists using the correct API for Elasticsearch 8.x
    const exists = await c.indices.exists({ index });
    
    if (!exists) {
      // Create index with proper materialized view data mapping
      await c.indices.create({ 
        index, 
        body: {
          mappings: { 
            properties: {
              id: { type: "keyword" },
              salutation: { type: "keyword" },
              firstName: { type: "keyword" },
              lastName: { type: "keyword" },
              email: { type: "keyword" },
              company: { type: "keyword" },
              address: { type: "text" },
              city: { type: "keyword" },
              state: { type: "keyword" },
              country: { type: "keyword" },
              zipCode: { type: "keyword" },
              phone: { type: "keyword" },
              mobilePhone: { type: "keyword" },
              industry: { type: "keyword" },
              jobTitleLevel: { type: "keyword" },
              jobTitle: { type: "keyword" },
              department: { type: "keyword" },
              minEmployeeSize: { type: "integer" },
              maxEmployeeSize: { type: "integer" },
              jobTitleLink: { type: "keyword" },
              employeeSizeLink: { type: "keyword" },
              revenue: { type: "long" },
              externalSource: { type: "keyword" },
              externalId: { type: "keyword" },
              createdAt: { type: "date" },
              updatedAt: { type: "date" }
            }
          }
        }
      });
      console.log(`✅ Created Elasticsearch index: ${index}`);
    } else {
      console.log(`✅ Elasticsearch index already exists: ${index}`);
    }
  } catch (error: any) {
    // Handle the case where index already exists (common error)
    if (error.meta?.statusCode === 400 && error.body?.error?.type === 'resource_already_exists_exception') {
      console.log(`✅ Elasticsearch index already exists: ${index}`);
    } else {
      console.error(`❌ Error ensuring Elasticsearch index ${index}:`, error.message);
      throw error;
    }
  }
}
