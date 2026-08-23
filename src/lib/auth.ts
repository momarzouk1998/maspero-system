import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'maspero-super-secret-jwt-key-2026-digitalocean'
);

export interface SessionPayload {
  userId: string;
  name: string;
  role: string;
}

export interface UserPermission {
  create: boolean;
  update: boolean;
  delete: boolean;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('maspero_session')?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await db.users.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      job_title: true,
      wallet_balance: true,
      is_active: true,
      permissions: true,
    }
  });

  return user;
}

/**
 * Check if a user has a specific permission on a feature.
 * Manager always has full access.
 * @param user - User object from getCurrentUser()
 * @param feature - Feature key: 'services' | 'tickets' | 'machines' | 'expenses' | 'shifts' | 'invoices' | 'charge_history'
 * @param action - 'create' | 'update' | 'delete'
 */
export function hasPermission(
  user: any,
  feature: string,
  action: 'create' | 'update' | 'delete'
): boolean {
  if (!user) return false;
  if (user.role === 'manager') return true;

  let perms: any = user.permissions;
  if (typeof perms === 'string') {
    try { perms = JSON.parse(perms); } catch { perms = {}; }
  }
  if (!perms || typeof perms !== 'object') return false;

  const featurePerm = perms[feature];
  if (!featurePerm || typeof featurePerm !== 'object') return false;

  return Boolean(featurePerm[action]);
}

