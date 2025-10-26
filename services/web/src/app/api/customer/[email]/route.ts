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
    // Query individual tables using Prisma ORM with relations
    const prospect = await prisma.prospect.findFirst({
      where: {
        email: email
      },
      include: {
        company: true
      }
    });
    
    if (!prospect) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const company = prospect.company;
    
    // Map individual table fields to the expected customer format
    const serializedCustomer = {
      id: prospect.id,
      salutation: prospect.salutation,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      company: company?.name || null,
      companyDomain: company?.domain || null,
      address: prospect.address || company?.address || null,
      city: prospect.city || company?.city || null,
      state: prospect.state || company?.state || null,
      country: prospect.country || company?.country || null,
      zipCode: prospect.zipCode || company?.zipCode || null,
      phone: prospect.phone || company?.phone || null,
      mobilePhone: prospect.mobilePhone || company?.mobilePhone || null,
      industry: company?.industry || null,
      jobTitleLevel: prospect.jobTitleLevel,
      jobTitle: prospect.jobTitle,
      department: prospect.department,
      minEmployeeSize: company?.minEmployeeSize || null,
      maxEmployeeSize: company?.maxEmployeeSize || null,
      jobTitleLink: prospect.jobTitleLink,
      employeeSizeLink: company?.employeeSizeLink || null,
      revenue: company?.revenue ? company.revenue.toString() : null,
      externalSource: prospect.externalSource || company?.externalSource || null,
      externalId: prospect.externalId || company?.externalId || null,
      createdAt: prospect.createdAt,
      updatedAt: prospect.updatedAt,
    };
    
    return NextResponse.json({ customer: serializedCustomer });
    
  } catch (error: any) {
    console.error('Error searching for customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
