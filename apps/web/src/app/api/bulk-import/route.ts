import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
// Internal API endpoint - no authentication required

const prisma = new PrismaClient();

const CustomerSchema = z.object({
  id: z.string(),
  salutation: z.union([z.string(), z.null()]).optional(),
  firstName: z.union([z.string(), z.null()]).optional(),
  lastName: z.union([z.string(), z.null()]).optional(),
  email: z.union([z.string(), z.null()]).optional(),
  company: z.union([z.string(), z.null()]).optional(),
  address: z.union([z.string(), z.null()]).optional(),
  city: z.union([z.string(), z.null()]).optional(),
  state: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  zipCode: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  mobilePhone: z.union([z.string(), z.null()]).optional(),
  industry: z.union([z.string(), z.null()]).optional(),
  jobTitleLevel: z.union([z.string(), z.null()]).optional(),
  jobTitle: z.union([z.string(), z.null()]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  minEmployeeSize: z.union([z.number(), z.null()]).optional(),
  maxEmployeeSize: z.union([z.number(), z.null()]).optional(),
  jobTitleLink: z.union([z.string(), z.null()]).optional(),
  employeeSizeLink: z.union([z.string(), z.null()]).optional(),
  externalSource: z.string(),
  externalId: z.string(),
});

const BulkImportSchema = z.object({
  customers: z.array(CustomerSchema),
  clearExisting: z.boolean().optional().default(false),
});

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { customers, clearExisting } = BulkImportSchema.parse(body);

    // Clear existing data if requested
    if (clearExisting) {
      await prisma.customer.deleteMany();
    }

    // Bulk upsert customers
    const results = [];
    for (const customer of customers) {
      try {
        const result = await prisma.customer.upsert({
          where: {
            externalSource_externalId: {
              externalSource: customer.externalSource,
              externalId: customer.externalId,
            },
          },
          create: customer,
          update: customer,
        });
        results.push({ success: true, id: result.id });
      } catch (error) {
        console.error(`Error upserting customer ${customer.externalId}:`, error);
        results.push({ success: false, id: customer.externalId, error: String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Bulk import completed: ${successCount} successful, ${failureCount} failed`,
      results: {
        total: customers.length,
        successful: successCount,
        failed: failureCount,
        details: results,
      },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import', details: String(error) },
      { status: 500 }
    );
  }
};
