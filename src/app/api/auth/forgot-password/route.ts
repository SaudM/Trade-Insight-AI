import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mail';
import { consumeRateLimit, getClientIp, tooManyRequests } from '@/lib/rate-limit';
import crypto from 'crypto';

// 11-22 有人反复调用本接口：按 IP 和按邮箱各限一次
const IP_RULE = { name: 'forgot-password:ip', limit: 5, windowSeconds: 15 * 60 };
const EMAIL_RULE = { name: 'forgot-password:email', limit: 3, windowSeconds: 60 * 60 };

const BodySchema = z.object({
    email: z.string().trim().min(3).max(254),
});

export async function POST(req: Request) {
    try {
        const ipLimit = await consumeRateLimit(IP_RULE, getClientIp(req));
        if (!ipLimit.allowed) return tooManyRequests(ipLimit);

        const parsed = BodySchema.safeParse(await req.json().catch(() => null));
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }
        const { email } = parsed.data;

        // 邮箱维度的限流不区分邮箱是否存在，不会泄露注册信息
        const emailLimit = await consumeRateLimit(EMAIL_RULE, email.toLowerCase());
        if (!emailLimit.allowed) return tooManyRequests(emailLimit);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // 防止邮箱枚举：即使邮箱未注册也返回统一的成功响应，
            // 不泄露该邮箱是否存在。此处直接返回，不生成 token、不发信。
            return NextResponse.json({ message: 'Password reset email sent' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Send email
        try {
            await sendPasswordResetEmail(email, resetToken);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            return NextResponse.json(
                { error: 'Failed to send reset email' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
