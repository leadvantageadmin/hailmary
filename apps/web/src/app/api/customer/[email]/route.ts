import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

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
    // Query PostgreSQL directly for exact email match
    const customer = await prisma.customer.findFirst({
      where: {
        email: email
      }
    });
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
    
  } catch (error: any) {
    console.error('Error searching for customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};
