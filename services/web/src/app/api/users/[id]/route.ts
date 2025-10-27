import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuthDynamic, AuthenticatedRequest } from '@/lib/middleware';
import { updateUser, deleteUser, getUserById } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'USER', 'MODERATOR']).optional()
});

// GET /api/users/[id] - Get user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserById(params.id);
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

// PUT /api/users/[id] - Update user (admin only)
export const PUT = withAdminAuthDynamic(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await req.json();
    const updates = updateUserSchema.parse(body);

    const user = await updateUser(params.id, updates);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// DELETE /api/users/[id] - Delete user (admin only)
export const DELETE = withAdminAuthDynamic(async (req: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  try {
    const success = await deleteUser(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
