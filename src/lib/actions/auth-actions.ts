
'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const SignupSchema = z.object({
    name: z.string().min(1, { message: "请输入您的姓名" }),
    email: z.string().email({ message: "请输入有效的邮箱地址" }),
    password: z.string().min(6, { message: "密码至少需要6位" }),
});

export type State = {
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
    };
    message?: string | null;
};

export async function registerUser(prevState: State | undefined, formData: FormData) {
    const validatedFields = SignupSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Register.',
        };
    }

    const { email, password, name } = validatedFields.data;

    try {
        const existingUser = await UserAdapter.getUserByEmail(email);
        if (existingUser) {
            return {
                message: '该邮箱已被注册',
            };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await UserAdapter.createUser({
            email,
            name,
            password: hashedPassword,
        });

    } catch (error) {
        console.error('Registration failed:', error);
        return { message: '创建用户失败，请稍后重试' };
    }

    // Attempt auto-login after registration
    try {
        console.log(`Attempting auto-login for ${email}`);
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        });
        console.log('Auto-login signIn call completed');
    } catch (error) {
        console.error('Auto-login error:', error);
        if (error instanceof AuthError) {
            if (error.type === 'CredentialsSignin') {
                return { message: '注册成功，但自动登录失败。请手动登录。' };
            }
        }
        // ...
    }

    return { message: 'Success' };
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const result = await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirect: false,
        });

        console.log('SignIn result:', result);
        return null;

    } catch (error) {
        if (error instanceof AuthError) {
            if (error.type === 'CredentialsSignin') {
                return '邮箱或密码错误';
            }
            return '登录失败，请稍后重试';
        }
        throw error;
    }
}
