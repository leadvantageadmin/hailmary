import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET = async (req: NextRequest, { params }: { params: { email: string } }) => {
  // Check authentication
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { email } = params;
  
  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Query the materialized view for exact email match
    const result = await prisma.$queryRaw`
      SELECT * FROM company_prospect_view 
      WHERE email = ${email}
      LIMIT 1
    ` as any[];
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = result[0];
    
    // Map materialized view fields to the expected customer format
    const serializedCustomer = {
      id: customerData.prospect_id || customerData.company_id,
      salutation: customerData.salutation,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      company: customerData.company_name,
      companyDomain: customerData.domain,
      address: customerData.prospect_address || customerData.company_address,
      city: customerData.prospect_city || customerData.company_city,
      state: customerData.prospect_state || customerData.company_state,
      country: customerData.prospect_country || customerData.company_country,
      zipCode: customerData.prospect_zipcode || customerData.company_zipcode,
      phone: customerData.prospect_phone || customerData.company_phone,
      mobilePhone: customerData.prospect_mobilephone || customerData.company_mobilephone,
      industry: customerData.industry,
      jobTitleLevel: customerData.jobTitleLevel,
      jobTitle: customerData.jobTitle,
      department: customerData.department,
      minEmployeeSize: customerData.minEmployeeSize,
      maxEmployeeSize: customerData.maxEmployeeSize,
      jobTitleLink: customerData.jobTitleLink,
      employeeSizeLink: null, // Not available in materialized view
      revenue: customerData.revenue ? customerData.revenue.toString() : null,
      externalSource: customerData.prospect_externalsource || customerData.company_externalsource,
      externalId: customerData.prospect_externalid || customerData.company_externalid,
      createdAt: customerData.prospect_createdat || customerData.company_createdat,
      updatedAt: customerData.prospect_updatedat || customerData.company_updatedat,
    };
    
    return NextResponse.json({ customer: serializedCustomer });
    
  } catch (error: any) {
    console.error('Error searching for customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
