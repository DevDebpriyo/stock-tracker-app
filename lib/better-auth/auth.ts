import { betterAuth } from "better-auth";
import { mongodbAdapter} from "better-auth/adapters/mongodb";
import { connectToDatabase} from "@/database/mongoose";
import { nextCookies} from "better-auth/next-js";

let authInstance: ReturnType<typeof betterAuth> | null = null;

export const getAuth = async () => {
    if (authInstance) return authInstance;

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) throw new Error('MongoDB connection not found');

    authInstance = betterAuth({
        database: mongodbAdapter(db as unknown as Parameters<typeof mongodbAdapter>[0]),
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
        },
        plugins: [nextCookies()],
    });

    return authInstance;
};

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
    get(_target, prop) {
        if (prop === 'api') {
            return new Proxy({}, {
                get(_apiTarget, apiProp) {
                    return async (...args: unknown[]) => {
                        const instance = await getAuth();
                        const api = instance.api as Record<string, (...params: unknown[]) => unknown>;
                        return api[apiProp as string](...args);
                    };
                }
            });
        }

        return async (...args: unknown[]) => {
            const instance = await getAuth();
            const method = (instance as unknown as Record<string, (...params: unknown[]) => unknown>)[prop as string];
            if (typeof method === 'function') {
                return method.apply(instance, args);
            }
            return method;
        };
    }
});
