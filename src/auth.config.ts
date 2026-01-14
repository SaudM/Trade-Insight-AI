
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
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
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

                    const user = await UserAdapter.getUserByEmail(email);
                    if (!user) {
                        return null;
                    }

                    // Only allow login if user has a password set
                    if (!user.password) {
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        return user;
                    }
                }

                return null;
            },
        }),
    ],
    trustHost: true,
} satisfies NextAuthConfig;
