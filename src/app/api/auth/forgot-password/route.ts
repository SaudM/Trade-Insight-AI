
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

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
