import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { updateUser, verifyPassword, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
  confirmPassword: z.string().optional()
}).refine((data) => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  // If newPassword is provided, it must match confirmPassword
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when changing password, and new passwords must match",
  path: ["currentPassword"]
});

// GET /api/profile - Get current user profile
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const currentUser = req.user!;
    
    // Fetch complete user data from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id }
      });
      
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
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT /api/profile - Update current user profile
export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const updateData = updateProfileSchema.parse(body);
    
    const currentUser = req.user!;
    console.log('🔧 Updating profile for user:', currentUser.email);
    console.log('📝 Update data:', {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      hasNewPassword: !!updateData.newPassword
    });

    // If password change is requested, verify current password
    if (updateData.newPassword && updateData.currentPassword) {
      console.log('🔐 Verifying current password...');
      
      // Get user from database to verify current password
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.id }
        });
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        
        const isCurrentPasswordValid = await verifyPassword(updateData.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          console.log('❌ Current password verification failed');
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }
        
        console.log('✅ Current password verified');
        
        // Hash the new password
        const hashedNewPassword = await hashPassword(updateData.newPassword);
        console.log('🔐 New password hashed successfully');
        
        // Update user with new password
        const updatedUser = await updateUser(currentUser.id, {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          password: hashedNewPassword
        });
        
        console.log('✅ Profile updated with new password');
        
        if (!updatedUser) {
          return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role
          }
        });
        
      } finally {
        await prisma.$disconnect();
      }
    } else {
      // Update without password change
      console.log('📝 Updating profile without password change...');
      
      const updatedUser = await updateUser(currentUser.id, {
        firstName: updateData.firstName,
        lastName: updateData.lastName
      });
      
      console.log('✅ Profile updated successfully');
      
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role
        }
      });
    }
    
  } catch (error) {
    console.error('Error updating profile:', error);
    
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
