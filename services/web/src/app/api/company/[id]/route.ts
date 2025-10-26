import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = getUserFromRequest(request);
  
  if (!authUser) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check if user has permission to edit companies
  if (authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: {
        id: params.id
      }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = getUserFromRequest(request);
  
  if (!authUser) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check if user has permission to edit companies
  if (authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    
    // Domain cannot be changed as it's the primary key
    // Remove domain from update data to prevent changes
    const { domain, ...updateData } = data;

    const updatedCompany = await prisma.company.update({
      where: {
        id: params.id
      },
      data: {
        name: updateData.name || null,
        industry: updateData.industry || null,
        minEmployeeSize: updateData.minEmployeeSize || null,
        maxEmployeeSize: updateData.maxEmployeeSize || null,
        employeeSizeLink: updateData.employeeSizeLink || null,
        revenue: updateData.revenue ? BigInt(updateData.revenue) : null,
        address: updateData.address || null,
        city: updateData.city || null,
        state: updateData.state || null,
        country: updateData.country || null,
        zipCode: updateData.zipCode || null,
        phone: updateData.phone || null,
        mobilePhone: updateData.mobilePhone || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      company: updatedCompany,
      message: 'Company updated successfully' 
    });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
