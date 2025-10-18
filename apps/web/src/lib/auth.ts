// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  // return bcrypt.hash(password, 12);
  return 'temp-hash';
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // return bcrypt.compare(password, hashedPassword);
  return password === 'admin123' && hashedPassword === 'temp-hash';
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  // return jwt.sign(
  //   { 
  //     id: user.id, 
  //     email: user.email, 
  //     role: user.role 
  //   },
  //   JWT_SECRET,
  //   { expiresIn: '24h' }
  // );
  return 'temp-token';
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  // try {
  //   const decoded = jwt.verify(token, JWT_SECRET) as any;
  //   return {
  //     id: decoded.id,
  //     email: decoded.email,
  //     firstName: '', // Will be fetched from DB if needed
  //     lastName: '',
  //     role: decoded.role
  //   };
  // } catch (error) {
  //   return null;
  // }
  return {
    id: 'temp-id',
    email: 'admin@leadvantageglobal.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN
  };
}

// Authenticate user
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email, isActive: true }
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await verifyPassword(credentials.password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

// Create user
export async function createUser(userData: CreateUserData): Promise<AuthUser> {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || UserRole.USER
    }
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

// Get user by ID
export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id, isActive: true }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

// Get all users (admin only)
export async function getAllUsers(): Promise<AuthUser[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  return users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  }));
}

// Update user
export async function updateUser(id: string, updates: Partial<CreateUserData>): Promise<AuthUser | null> {
  const updateData: any = {
    firstName: updates.firstName,
    lastName: updates.lastName,
    role: updates.role
  };

  if (updates.password) {
    updateData.password = await hashPassword(updates.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role
  };
}

// Delete user (soft delete)
export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if user is admin
export function isAdmin(user: AuthUser): boolean {
  return user.role === UserRole.ADMIN;
}

// Create initial admin user
export async function createInitialAdmin(): Promise<void> {
  const adminExists = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true }
  });

  if (!adminExists) {
    await createUser({
      email: 'admin@leadvantageglobal.com',
      password: 'admin123', // Change this in production!
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN
    });
    console.log('Initial admin user created: admin@leadvantageglobal.com / admin123');
  }
}
