
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { adminAuth } from '@/lib/firebase-admin';
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
                console.log('[Auth] Authorize called');
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    console.log(`[Auth] Attempting login for: ${email}`);

                    const user = await UserAdapter.getUserByEmail(email);
                    if (!user) {
                        console.log('[Auth] User not found');
                        return null;
                    }

                    // Only allow login if user has a password set
                    if (!user.password) {
                        console.log('[Auth] User has no password set (likely OAuth user)');
                        return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        console.log('[Auth] Password matched, login successful');
                        return user;
                    } else {
                        console.log('[Auth] Password mismatch');
                    }
                } else {
                    console.log('[Auth] Invalid credentials format');
                }

                return null;
            },
        }),
        // Firebase 登录 Provider（Google 登录走这里：前端 signInWithPopup 拿到 idToken 后调 signIn('firebase', { idToken })）
        Credentials({
            id: 'firebase',
            name: 'Firebase',
            async authorize(credentials) {
                console.log('[Auth] Firebase authorize ENTERED, has idToken:', !!(credentials as any)?.idToken);
                const parsed = z.object({ idToken: z.string().min(1) }).safeParse(credentials);
                if (!parsed.success) {
                    console.log('[Auth] Firebase: invalid credentials shape');
                    return null;
                }
                try {
                    // 服务端用本地静态 Google 公钥 + jose 验签 Firebase ID Token
                    const decoded = await adminAuth.verifyIdToken(parsed.data.idToken);
                    const firebaseUid = decoded.uid;

                    // 取对应的 PG 用户。用户应已由前端 POST /api/user 创建/同步。
                    const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
                    if (!user) {
                        console.log('[Auth] Firebase: token valid but PG user not found:', firebaseUid);
                        return null;
                    }
                    return user;
                } catch (error: any) {
                    console.log('[Auth] Firebase verifyIdToken failed:', error?.code || error?.message);
                    return null;
                }
            },
        }),
        // 微信登录 Provider
        Credentials({
            id: 'wechat',
            name: 'WeChat',
            async authorize(credentials) {
                console.log('[Auth] WeChat authorize called');

                const parsedCredentials = z
                    .object({ userId: z.string() })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { userId } = parsedCredentials.data;
                    console.log(`[Auth] WeChat login for userId: ${userId}`);

                    const user = await UserAdapter.getUserByUid(userId);
                    if (user) {
                        console.log('[Auth] WeChat login successful');
                        return user;
                    } else {
                        console.log('[Auth] WeChat user not found');
                    }
                }

                return null;
            },
        }),
    ],
    trustHost: true,
} satisfies NextAuthConfig;
