import { z } from 'zod';

export const FiltersSchema = z.object({
  sector: z.array(z.string()).optional(),
  industry: z.array(z.string()).optional(),
  size: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  location: z.object({ center: z.tuple([z.number(), z.number()]), radiusKm: z.number() }).optional(),
});

export type Filters = z.infer<typeof FiltersSchema>;
