'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

const SignIn = () => {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        setAuthError(null);
        try {
            const result = await signInWithEmail({
                email: data.email.trim().toLowerCase(),
                password: data.password,
            });

            if (result.success) {
                setIsRedirecting(true);
                toast.success('Signed in successfully', {
                    description: 'Redirecting to your dashboard...',
                });
                router.push('/');
                router.refresh();
                return;
            }

            const errorMessage = result.error || 'Invalid email or password. Please verify your credentials and try again.';
            setAuthError(errorMessage);
            toast.error('Sign in failed', {
                description: errorMessage,
            });
        } catch (e) {
            const fallbackMessage = e instanceof Error ? e.message : 'An unexpected error occurred during sign in. Please try again.';
            setAuthError(fallbackMessage);
            toast.error('Sign in error', {
                description: fallbackMessage,
            });
        }
    };

    const getButtonContent = () => {
        if (isRedirecting) {
            return (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-950" />
                    Redirecting to Dashboard...
                </span>
            );
        }

        if (isSubmitting) {
            return (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-950" />
                    Signing In...
                </span>
            );
        }

        return 'Sign In';
    };

    return (
        <>
            <h1 className="form-title">Welcome back</h1>

            {authError ? (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                    <p className="leading-snug">{authError}</p>
                </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="Email"
                    placeholder="johndoe@example.com"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: 'Email is required',
                        pattern: {
                            value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message: 'Please enter a valid email address',
                        },
                    }}
                />

                <InputField
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{
                        required: 'Password is required',
                        minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                        },
                    }}
                />

                <Button
                    type="submit"
                    disabled={isSubmitting || isRedirecting}
                    className="yellow-btn w-full mt-5"
                >
                    {getButtonContent()}
                </Button>

                <FooterLink text="Don't have an account?" linkText="Create an account" href="/sign-up" />
            </form>
        </>
    );
};
export default SignIn;
