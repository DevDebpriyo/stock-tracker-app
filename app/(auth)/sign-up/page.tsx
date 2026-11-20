'use client';

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

const SignUp = () => {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'US',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignUpFormData) => {
        setAuthError(null);
        try {
            const result = await signUpWithEmail({
                ...data,
                email: data.email.trim().toLowerCase(),
                fullName: data.fullName.trim(),
            });

            if (result.success) {
                setIsRedirecting(true);
                toast.success('Account created successfully', {
                    description: 'Setting up your dashboard and redirecting...',
                });
                router.push('/');
                router.refresh();
                return;
            }

            const errorMessage = result.error || 'Failed to create an account. Please try again.';
            setAuthError(errorMessage);
            toast.error('Sign up failed', {
                description: errorMessage,
            });
        } catch (e) {
            const fallbackMessage = e instanceof Error ? e.message : 'An unexpected error occurred while creating your account.';
            setAuthError(fallbackMessage);
            toast.error('Sign up error', {
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
                    Creating Your Account...
                </span>
            );
        }

        return 'Start Your Investing Journey';
    };

    return (
        <>
            <h1 className="form-title">Sign Up & Personalize</h1>

            {authError ? (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                    <p className="leading-snug">{authError}</p>
                </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="fullName"
                    label="Full Name"
                    placeholder="John Doe"
                    register={register}
                    error={errors.fullName}
                    validation={{
                        required: 'Full name is required',
                        minLength: {
                            value: 2,
                            message: 'Full name must be at least 2 characters',
                        },
                    }}
                />

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
                    placeholder="Enter a strong password"
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

                <CountrySelectField
                    name="country"
                    label="Country"
                    control={control}
                    error={errors.country}
                    required
                />

                <SelectField
                    name="investmentGoals"
                    label="Investment Goals"
                    placeholder="Select your investment goal"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                <SelectField
                    name="riskTolerance"
                    label="Risk Tolerance"
                    placeholder="Select your risk level"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                <SelectField
                    name="preferredIndustry"
                    label="Preferred Industry"
                    placeholder="Select your preferred industry"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                <Button
                    type="submit"
                    disabled={isSubmitting || isRedirecting}
                    className="yellow-btn w-full mt-5"
                >
                    {getButtonContent()}
                </Button>

                <FooterLink text="Already have an account?" linkText="Sign in" href="/sign-in" />
            </form>
        </>
    );
};
export default SignUp;
