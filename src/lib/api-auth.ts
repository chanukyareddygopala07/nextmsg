/**
 * Authentication Helpers for API Routes
 *
 * Provides consistent auth checking for API routes.
 * Routes that need auth should call requireAuth() at the top.
 */

import { auth } from "@/lib/auth";
import { apiUnauthorized, apiForbidden } from "./api-utils";
import type { NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
}

export async function requireAuth(): Promise<
  { user: AuthenticatedUser; error?: never } | { user?: never; error: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: apiUnauthorized() };
  }

  return {
    user: {
      id: session.user.id,
    },
  };
}

export function verifyOwnership(
  resourceUserId: string,
  currentUserId: string
): NextResponse | null {
  if (resourceUserId !== currentUserId) {
    return apiForbidden("You do not have access to this resource");
  }
  return null;
}
