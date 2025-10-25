import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const authUser = getUserFromRequest(request);
  
  if (!authUser) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    const { companyName, domain } = await request.json();

    if (!companyName && !domain) {
      return NextResponse.json(
        { error: 'Either company name or domain is required' },
        { status: 400 }
      );
    }

    // Search for company by name or domain
    let company;
    if (companyName) {
      company = await prisma.company.findFirst({
        where: {
          name: {
            contains: companyName,
            mode: 'insensitive'
          }
        }
      });
    } else if (domain) {
      company = await prisma.company.findFirst({
        where: {
          domain: {
            contains: domain,
            mode: 'insensitive'
          }
        }
      });
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get all prospects associated with this company
    const prospects = await prisma.prospect.findMany({
      where: {
        companyId: company.id
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        industry: company.industry,
        address: company.address,
        city: company.city,
        state: company.state,
        country: company.country,
        zipCode: company.zipCode,
        phone: company.phone,
        minEmployeeSize: company.minEmployeeSize,
        maxEmployeeSize: company.maxEmployeeSize,
        revenue: company.revenue,
        description: company.description,
        website: company.website,
        linkedinUrl: company.linkedinUrl,
        externalSource: company.externalSource,
        externalId: company.externalId,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      },
      prospects: prospects.map(prospect => ({
        id: prospect.id,
        salutation: prospect.salutation,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        company: company.name, // Use the company name from the found company
        address: prospect.address,
        city: prospect.city,
        state: prospect.state,
        country: prospect.country,
        zipCode: prospect.zipCode,
        phone: prospect.phone,
        mobilePhone: prospect.mobilePhone,
        jobTitleLevel: prospect.jobTitleLevel,
        jobTitle: prospect.jobTitle,
        department: prospect.department,
        jobTitleLink: prospect.jobTitleLink,
        externalSource: prospect.externalSource,
        externalId: prospect.externalId,
        createdAt: prospect.createdAt,
        updatedAt: prospect.updatedAt
      }))
    });

  } catch (error) {
    console.error('Company search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
