
import nodemailer from 'nodemailer';

// SMTP 配置全部从环境变量读取，避免把凭据硬编码在源码里。
// 非敏感项（host/port/user）保留默认值；密码等敏感信息必须来自环境变量。
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.feishu.cn';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : SMTP_PORT === 465; // 465 端口默认使用 SSL
const SMTP_USER = process.env.SMTP_USER || 'noreply@fulitimes.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `Trade Insight <${SMTP_USER}>`;

if (!SMTP_PASS) {
  console.warn(
    '[mail] 未配置 SMTP_PASS 环境变量，密码重置邮件将无法发送。请在 .env / 部署环境中设置 SMTP_PASS。'
  );
}

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * 解析邮件中重置链接使用的站点地址。
 * 优先级：NEXT_PUBLIC_APP_URL > NEXTAUTH_URL > localhost 兜底。
 * 去除结尾斜杠，避免拼出 //reset-password；生产环境若仍是本地地址会告警。
 */
function resolveBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:9002';
  const baseUrl = raw.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(baseUrl)) {
    console.warn(
      `[mail] 生产环境站点地址仍为本地地址 (${baseUrl})，密码重置链接将无法被用户访问。` +
        '请将 NEXT_PUBLIC_APP_URL（或 NEXTAUTH_URL）设置为正式域名。'
    );
  }
  return baseUrl;
}

/**
 * Send password reset email
 * @param to Recipient email
 * @param token Reset token
 */
export async function sendPasswordResetEmail(to: string, token: string) {
  if (!SMTP_PASS) {
    throw new Error('SMTP 未配置（缺少 SMTP_PASS 环境变量），无法发送密码重置邮件');
  }

  const baseUrl = resolveBaseUrl();
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
    console.log(`Preparing to send password reset email to: ${to}`);
    console.log(`Using SMTP Config: Host=${SMTP_HOST}, User=${SMTP_USER}, Port=${SMTP_PORT}, Secure=${true}`);

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: '重置您的密码 - 福利复盘',
      text: `请点击以下链接重置您的密码: ${resetLink}`,
      html,
    });
    console.log('Nodemailer sendMail success. Result:', JSON.stringify(info));
    console.log('Message sent ID: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
