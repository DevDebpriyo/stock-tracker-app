'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName } });

        if(response) {
            try {
                await inngest.send({
                    name: 'app/user.created',
                    data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
                });
            } catch (inngestErr) {
                console.error('Failed to trigger sign-up welcome email event via Inngest:', inngestErr);
            }
        }

        return { success: true, data: response };
    } catch (e: unknown) {
        console.log('Sign up failed', e);
        const err = e as { message?: string; body?: { message?: string; code?: string } };
        const rawMessage = err?.body?.message || err?.message || '';

        let userMessage = 'Unable to create your account. Please try again.';
        if (rawMessage.toLowerCase().includes('already exists') || err?.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
            userMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (rawMessage.toLowerCase().includes('password')) {
            userMessage = rawMessage;
        }

        return { success: false, error: userMessage };
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    try {
        const response = await auth.api.signInEmail({ body: { email, password } });

        return { success: true, data: response };
    } catch (e: unknown) {
        console.log('Sign in failed', e);
        const err = e as { message?: string; body?: { message?: string; code?: string }; status?: string | number };
        const rawMessage = err?.body?.message || err?.message || '';

        let userMessage = 'Invalid email or password. Please verify your credentials and try again.';
        if (rawMessage.toLowerCase().includes('not found') || rawMessage.toLowerCase().includes('invalid')) {
            userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (rawMessage) {
            userMessage = rawMessage;
        }

        return { success: false, error: userMessage };
    }
}

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}
