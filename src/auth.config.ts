
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import bcrypt from 'bcryptjs';

export const authConfig = {
    pages: {
        signIn: '/login',
        newUser: '/signup',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            // Logic to protect validity of pages can be added here
            // For now, we allow access and handle redirects in UI or middleware if needed
            return true;
        },
        async session({ session, token }) {
            console.error('[Auth Debug] Session callback', { hasToken: !!token, hasSessionUser: !!session?.user });
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            console.error('[Auth Debug] JWT callback', { hasUser: !!user, tokenSub: token.sub });
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    console.error(`[Auth Debug] Authorize called for ${email}`);

                    const user = await UserAdapter.getUserByEmail(email);
                    if (!user) {
                        console.error('[Auth Debug] User not found (getUserByEmail returned null)');
                        return null;
                    }

                    // Only allow login if user has a password set
                    if (!user.password) {
                        console.error('[Auth Debug] User has no password set (possibly Google-only user)');
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        console.error('[Auth Debug] Password match success');
                        return user;
                    }
                    console.error('[Auth Debug] Password mismatch');
                } else {
                    console.error('[Auth Debug] Invalid credentials schema:', parsedCredentials.error);
                }

                console.error('[Auth Debug] Authorize returning null');
                return null;
            },
        }),
    ],
    trustHost: true,
} satisfies NextAuthConfig;
