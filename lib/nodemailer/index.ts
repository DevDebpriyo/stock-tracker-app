import nodemailer from 'nodemailer';
import {WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE} from "./templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD ? process.env.NODEMAILER_PASSWORD.replace(/\s+/g, '') : '',
    }
});

const getSenderEmail = () => process.env.NODEMAILER_EMAIL || 'ghosalsasti@gmail.com';

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    try {
        const htmlTemplate = WELCOME_EMAIL_TEMPLATE
            .replaceAll('{{name}}', name || 'Trader')
            .replaceAll('{{intro}}', intro);

        const mailOptions = {
            from: `"TraderX" <${getSenderEmail()}>`,
            to: email,
            subject: `Welcome to TraderX - your stock market toolkit is ready!`,
            text: 'Thanks for joining TraderX',
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[nodemailer] Welcome email sent to ${email}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[nodemailer] Failed to send welcome email to ${email}:`, error);
        throw error;
    }
};

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<{ success: boolean; messageId?: string }> => {
    try {
        const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
            .replaceAll('{{date}}', date)
            .replaceAll('{{newsContent}}', newsContent);

        const mailOptions = {
            from: `"TraderX News" <${getSenderEmail()}>`,
            to: email,
            subject: `📈 Market News Summary Today - ${date}`,
            text: `Today's market news summary from TraderX`,
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[nodemailer] News summary email sent to ${email}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[nodemailer] Failed to send news summary email to ${email}:`, error);
        throw error;
    }
};
