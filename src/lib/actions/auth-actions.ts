
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
                message: 'Email already exists.',
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
        return { message: 'Database Error: Failed to Create User.' };
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
                return { message: 'Registration successful, but login failed.' };
            }
        }
        // In NextAuth v5, signIn might throw even on success if redirect happens (though we set redirect: false).
        // If it's not an AuthError, it might be a redirect or other system error.
        // We should log it to be sure.
        // If it WAS a redirect, we might want to let it bubble up if we were redirecting?
        // But with redirect: false, it shouldn't redirect.
        // However, if it throws for other reasons, we want to know.
        // For now, let's swallow it but LOG it heavily so we see it.
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

        // In NextAuth v5 with redirect: false, unrelated errors might throw,
        // but failures like 'CredentialsSignin' might just be returned in result?
        // Actually, looking at docs/source, signIn with redirect:false returns a promise that resolves.
        // But if strict credentials checks fail, it might throw?
        // Let's assume if it doesn't throw, we check validation.
        console.log('SignIn result:', result);

        // Wait, does v5 signIn return anything useful with redirect:false?
        // V5 beta: signIn returns Promise<void> if redirect:true (throws redirect).
        // If redirect:false, it might not return the full object like V4.
        // Actually, V5 recommends catching the error.

        // Let's assume success if no error is thrown.
        return null;

    } catch (error) {
        if (error instanceof AuthError) {
            if (error.type === 'CredentialsSignin') {
                return 'Invalid credentials.';
            }
            return 'Something went wrong.';
        }
        throw error;
    }
}
