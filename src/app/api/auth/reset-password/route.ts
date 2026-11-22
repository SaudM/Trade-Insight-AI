
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getClientIp, tooManyRequests } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

const IP_RULE = { name: 'reset-password:ip', limit: 10, windowSeconds: 15 * 60 };

/**
 * token 必须是 forgot-password 生成的 64 位十六进制串。
 *
 * 一定要校验成字符串：如果把请求体里的对象原样交给 Prisma，
 * `{"token": {"not": ""}}` 会变成 `resetToken != ''` 的查询条件，
 * 匹配到任意一个一小时内申请过重置的用户，直接改掉对方的密码。
 */
const BodySchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/),
    // 设上限，避免超长输入拖慢哈希
    password: z.string().min(6).max(128),
});

export async function POST(req: Request) {
    try {
        const ipLimit = await consumeRateLimit(IP_RULE, getClientIp(req));
        if (!ipLimit.allowed) return tooManyRequests(ipLimit);

        const parsed = BodySchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            );
        }
        const { token, password } = parsed.data;

        // Find user with valid token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return NextResponse.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
