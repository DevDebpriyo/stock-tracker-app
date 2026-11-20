import { inngest } from "@/lib/inngest/client";
import { NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT } from "@/lib/inngest/prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created' },
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country || 'Not specified'}
            - Investment goals: ${event.data.investmentGoals || 'Growth'}
            - Risk tolerance: ${event.data.riskTolerance || 'Medium'}
            - Preferred industry: ${event.data.preferredIndustry || 'Technology'}
        `;

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile);

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({
                model: 'gemini-2.5-flash-lite',
                apiKey: process.env.GEMINI_API_KEY || '',
            }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }
        });

        await step.run('send-welcome-email', async () => {
            const part = response?.candidates?.[0]?.content?.parts?.[0];
            let introText = (part && 'text' in part && typeof part.text === 'string' ? part.text : null) ||
                'Thanks for joining TraderX. You now have the tools to track markets and make smarter moves.';

            // Convert any raw markdown bold asterisks to HTML strong tags
            introText = introText.replace(/\*\*(.*?)\*\*/g, (_, g1) => `<strong>${g1}</strong>`);

            const { email, name } = event.data;

            return await sendWelcomeEmail({ email, name: name || 'Trader', intro: introText });
        });

        return {
            success: true,
            message: 'Welcome email sent successfully'
        };
    }
);

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.news' }, { cron: '0 12 * * *' } ],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail);

        if (!users || users.length === 0) {
            return { success: false, message: 'No users found for news email' };
        }

        // Step #2: Fetch general market news once & prepare user news packages
        const { generalArticles, userNewsMap } = await step.run('fetch-user-news', async () => {
            // Fetch general market news once to serve as the shared baseline and avoid burning Finnhub rate limits
            let generalNews: MarketNewsArticle[] = [];
            try {
                generalNews = (await getNews()) || [];
                generalNews = generalNews.slice(0, 6);
            } catch (err) {
                console.error('daily-news: failed to fetch general news baseline:', err);
            }

            const customUserPackages: Array<{
                user: UserForNewsEmail;
                hasCustomSymbols: boolean;
                articles: MarketNewsArticle[];
            }> = [];

            for (const user of users as UserForNewsEmail[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    if (symbols && symbols.length > 0) {
                        let customArticles = await getNews(symbols);
                        customArticles = (customArticles || []).slice(0, 6);
                        if (customArticles.length > 0) {
                            customUserPackages.push({ user, hasCustomSymbols: true, articles: customArticles });
                            continue;
                        }
                    }
                    // Fallback to shared general news
                    customUserPackages.push({ user, hasCustomSymbols: false, articles: generalNews });
                } catch (e) {
                    console.error('daily-news: error preparing news for user', user.email, e);
                    customUserPackages.push({ user, hasCustomSymbols: false, articles: generalNews });
                }
            }

            return {
                generalArticles: generalNews,
                userNewsMap: customUserPackages,
            };
        });

        // Step #3: Generate general news AI summary once for all baseline users
        const generalSummaryPrompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
            '{{newsData}}',
            JSON.stringify(generalArticles, null, 2)
        );

        const generalAiResponse = await step.ai.infer('summarize-general-market-news', {
            model: step.ai.models.gemini({
                model: 'gemini-2.5-flash-lite',
                apiKey: process.env.GEMINI_API_KEY || '',
            }),
            body: {
                contents: [{ role: 'user', parts: [{ text: generalSummaryPrompt }] }]
            }
        });

        const generalPart = generalAiResponse?.candidates?.[0]?.content?.parts?.[0];
        const defaultGeneralNewsContent = (generalPart && 'text' in generalPart && typeof generalPart.text === 'string' ? generalPart.text : null) || 'No market news available today.';

        // Process customized AI summaries only for users who have distinct custom symbols
        const userNewsSummaries: Array<{ user: UserForNewsEmail; newsContent: string }> = [];

        for (let i = 0; i < userNewsMap.length; i++) {
            const { user, hasCustomSymbols, articles } = userNewsMap[i];

            if (!hasCustomSymbols) {
                // Reuse the shared general news summary
                userNewsSummaries.push({ user, newsContent: defaultGeneralNewsContent });
            } else {
                try {
                    const customPrompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
                        '{{newsData}}',
                        JSON.stringify(articles, null, 2)
                    );

                    const customAiResponse = await step.ai.infer(`summarize-custom-news-${user.id || i}`, {
                        model: step.ai.models.gemini({
                            model: 'gemini-2.5-flash-lite',
                            apiKey: process.env.GEMINI_API_KEY || '',
                        }),
                        body: {
                            contents: [{ role: 'user', parts: [{ text: customPrompt }] }]
                        }
                    });

                    const customPart = customAiResponse?.candidates?.[0]?.content?.parts?.[0];
                    const customContent = (customPart && 'text' in customPart && typeof customPart.text === 'string' ? customPart.text : null) || defaultGeneralNewsContent;

                    userNewsSummaries.push({ user, newsContent: customContent });
                } catch (e) {
                    console.error('Failed to summarize custom news for user:', user.email, e);
                    userNewsSummaries.push({ user, newsContent: defaultGeneralNewsContent });
                }
            }
        }

        // Step #4: Send the emails in controlled batches with allSettled to protect SMTP connections
        const deliveryResults = await step.run('send-news-emails', async () => {
            const BATCH_SIZE = 5;
            const results: Array<{ email: string; success: boolean; error?: string }> = [];

            for (let i = 0; i < userNewsSummaries.length; i += BATCH_SIZE) {
                const batch = userNewsSummaries.slice(i, i + BATCH_SIZE);
                const settled = await Promise.allSettled(
                    batch.map(async ({ user, newsContent }) => {
                        if (!newsContent) return { email: user.email, success: false, reason: 'Empty content' };
                        return await sendNewsSummaryEmail({
                            email: user.email,
                            date: getFormattedTodayDate(),
                            newsContent,
                        });
                    })
                );

                for (let j = 0; j < settled.length; j++) {
                    const outcome = settled[j];
                    const targetEmail = batch[j].user.email;
                    if (outcome.status === 'fulfilled') {
                        results.push({ email: targetEmail, success: true });
                    } else {
                        console.error(`daily-news: delivery failed for ${targetEmail}:`, outcome.reason);
                        results.push({ email: targetEmail, success: false, error: String(outcome.reason) });
                    }
                }
            }

            return results;
        });

        const successfulCount = deliveryResults.filter((r) => r.success).length;
        return {
            success: true,
            totalUsers: userNewsSummaries.length,
            sentSuccessfully: successfulCount,
            message: `Daily news summary sent to ${successfulCount}/${userNewsSummaries.length} users.`,
        };
    }
);
