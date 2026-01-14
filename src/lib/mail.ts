
import nodemailer from 'nodemailer';

const SMTP_HOST = 'smtp.feishu.cn';
const SMTP_PORT = 465;
const SMTP_USER = 'noreply@fulitimes.com';
const SMTP_PASS = 'VUwAbFAY1oLflqeG';
const SMTP_FROM = `"Trade Insight" <${SMTP_USER}>`;

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

/**
 * Send password reset email
 * @param to Recipient email
 * @param token Reset token
 */
export async function sendPasswordResetEmail(to: string, token: string) {
    // Determine base URL based on environment
    // In production, this should be set in environment variables
    // For now, we'll try to use NEXT_PUBLIC_APP_URL or fall back to localhost
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:9002';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">重置您的密码</h1>
      </div>
      <div style="color: #555; line-height: 1.6;">
        <p>您好，</p>
        <p>我们收到了重置您密码的请求。如果您没有发起此请求，请忽略此邮件。</p>
        <p>点击下面的按钮重置您的密码：</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">重置密码</a>
        </div>
        <p>或者，您可以复制以下链接到浏览器中打开：</p>
        <p style="word-break: break-all; color: #0070f3;">${resetLink}</p>
        <p>此链接将在 1 小时后失效。</p>
      </div>
      <div style="margin-top: 30px; pt-3; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center;">
        <p>&copy; ${new Date().getFullYear()} Trade Insight AI. All rights reserved.</p>
      </div>
    </div>
  `;

    try {
        const info = await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject: '重置您的密码 - 福利复盘',
            text: `请点击以下链接重置您的密码: ${resetLink}`,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
