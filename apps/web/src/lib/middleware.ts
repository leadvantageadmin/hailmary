import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AuthUser } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

// Middleware to check authentication
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = user;

    return handler(authenticatedReq);
  };
}

// Middleware to check admin role
export function withAdminAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return handler(req);
  });
}

// Helper to get user from request
export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  return verifyToken(token);
}

// Helper to check if user is authenticated
export function isAuthenticated(req: NextRequest): boolean {
  return getUserFromRequest(req) !== null;
}

// Helper to check if user is admin
export function isAdmin(req: NextRequest): boolean {
  const user = getUserFromRequest(req);
  return user?.role === 'ADMIN' || false;
}
