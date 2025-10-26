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

  // Check if user has permission to edit prospects
  if (authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  try {
    const prospect = await prisma.prospect.findUnique({
      where: {
        id: params.id
      },
      include: {
        company: true
      }
    });

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Error fetching prospect:', error);
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

  // Check if user has permission to edit prospects
  if (authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    
    // Remove email and companyId from update data as they are protected fields
    const { email, companyId, ...updateData } = data;

    const updatedProspect = await prisma.prospect.update({
      where: {
        id: params.id
      },
      data: {
        salutation: updateData.salutation || null,
        firstName: updateData.firstName || null,
        lastName: updateData.lastName || null,
        // email: not updated - protected field
        jobTitle: updateData.jobTitle || null,
        jobTitleLevel: updateData.jobTitleLevel || null,
        department: updateData.department || null,
        jobTitleLink: updateData.jobTitleLink || null,
        address: updateData.address || null,
        city: updateData.city || null,
        state: updateData.state || null,
        country: updateData.country || null,
        zipCode: updateData.zipCode || null,
        phone: updateData.phone || null,
        mobilePhone: updateData.mobilePhone || null,
        // companyId: not updated - protected field
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      prospect: updatedProspect,
      message: 'Prospect updated successfully' 
    });
  } catch (error) {
    console.error('Error updating prospect:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
