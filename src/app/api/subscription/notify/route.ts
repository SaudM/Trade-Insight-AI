import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/wxpay';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { UserAdapter } from '@/lib/adapters/user-adapter';
import { CacheKeys } from '@/lib/redis';
import { CachedApiHandler } from '@/lib/cached-api-handler';

export const runtime = 'nodejs';

/**
 * 微信支付结果通知接口
 * 接收微信支付成功后的推送消息，自动激活用户订阅
 */
export async function POST(request: NextRequest) {
    try {
        console.log('--------------------------------------------------');
        console.log('收到微信支付通知 - 开始处理');

        // 获取请求体
        const body = await request.text();
        const signature = request.headers.get('wechatpay-signature');
        const timestamp = request.headers.get('wechatpay-timestamp');
        const nonce = request.headers.get('wechatpay-nonce');
        const serial = request.headers.get('wechatpay-serial');

        console.log('Notification Headers:', {
            signature: signature ? `${signature.substring(0, 20)}...` : 'missing',
            timestamp,
            nonce,
            serial
        });
        console.log('Notification Body Length:', body.length);
        console.log('Notification Body (First 100 chars):', body.substring(0, 100));

        if (!signature || !timestamp || !nonce || !serial) {
            console.error('微信支付通知缺少必要的头部信息');
            return NextResponse.json({ code: 'FAIL', message: '缺少必要的头部信息' }, { status: 400 });
        }

        // 验证签名
        try {
            console.log('Preparing to verify signature...');
            const wxpay = getPayment();

            // Ensure certificates are loaded before verification to prevent "this.certificates is not iterable" error
            // The wxpay-v3 library fetches certificates asynchronously in constructor but doesn't await it
            if (!wxpay.certificates || Object.keys(wxpay.certificates).length === 0) {
                try {
                    console.log('WeChat Pay certificates not loaded, fetching now...');
                    await wxpay.decodeCertificates();
                    console.log('WeChat Pay certificates loaded successfully. Count:', Object.keys(wxpay.certificates).length);
                } catch (certError) {
                    console.error('Failed to load WeChat Pay certificates:', certError);
                    // Continue to verifySign, it might fail but better to try or fail there
                }
            } else {
                console.log('WeChat Pay certificates already loaded. Count:', Object.keys(wxpay.certificates).length);
            }

            const isValid = await wxpay.verifySign({
                body,
                signature,
                timestamp,
                nonce,
                serial
            });

            console.log('Signature verification result:', isValid);

            if (!isValid) {
                console.error('微信支付通知签名验证失败');
                console.error('Failed Signature Details:', { timestamp, nonce, serial, body_length: body.length });
                return NextResponse.json({ code: 'FAIL', message: '签名验证失败' }, { status: 400 });
            }
        } catch (error) {
            console.error('验证微信支付通知签名时出错:', error);
            return NextResponse.json({ code: 'FAIL', message: '签名验证出错' }, { status: 500 });
        }

        // 解析通知内容
        let notificationData;
        try {
            notificationData = JSON.parse(body);
        } catch (error) {
            console.error('解析微信支付通知内容失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '通知内容格式错误' }, { status: 400 });
        }

        console.log('微信支付通知 Event Type:', notificationData.event_type);

        // 检查事件类型
        if (notificationData.event_type !== 'TRANSACTION.SUCCESS') {
            console.log('非支付成功事件，忽略处理:', notificationData.event_type);
            return NextResponse.json({ code: 'SUCCESS', message: '事件已接收' });
        }

        // 解密资源内容
        let decryptedData;
        try {
            console.log('Decrypting resource data...');
            const wxpay = getPayment();
            decryptedData = wxpay.decipher(
                notificationData.resource.ciphertext,
                notificationData.resource.associated_data,
                notificationData.resource.nonce
            );
            console.log('Decryption successful.');
        } catch (error) {
            console.error('解密微信支付通知资源失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '解密失败' }, { status: 500 });
        }

        const paymentData = JSON.parse(decryptedData);
        // Log critical payment info, mask sensitive if needed (standard logs are safe for internal use mainly)
        console.log('解密后的支付数据 Summary:', {
            out_trade_no: paymentData.out_trade_no,
            transaction_id: paymentData.transaction_id,
            trade_state: paymentData.trade_state,
            amount: paymentData.amount,
            payer_openid: paymentData.payer ? paymentData.payer.openid : 'unknown'
        });

        // 检查支付状态
        if (paymentData.trade_state !== 'SUCCESS') {
            console.log('支付状态非成功，当前状态:', paymentData.trade_state);
            return NextResponse.json({ code: 'SUCCESS', message: '支付状态已接收' });
        }

        // 从商户订单号中提取用户信息和套餐信息
        const outTradeNo = paymentData.out_trade_no;
        const parts = outTradeNo.split('_');
        console.log('Parsing OutTradeNo:', outTradeNo, 'Parts:', parts);

        if (parts.length < 4) {
            console.error('商户订单号格式错误:', outTradeNo);
            return NextResponse.json({ code: 'FAIL', message: '订单号格式错误' }, { status: 400 });
        }

        const firebaseUid = parts[1];
        const planId = parts[2];
        console.log('Extracted Info:', { firebaseUid, planId });

        // 获取用户内部ID
        let userId;
        try {
            const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
            if (!user) {
                console.error('未找到用户:', firebaseUid);
                return NextResponse.json({ code: 'FAIL', message: '用户不存在' }, { status: 404 });
            }
            userId = user.id;
            console.log('Found internal User ID:', userId);
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '获取用户信息失败' }, { status: 500 });
        }

        // 激活订阅
        try {
            console.log('Activating subscription for user:', userId, 'Plan:', planId);
            const result = await activateSubscriptionPostgres({
                userId,
                planId,
                paymentId: paymentData.transaction_id,
                amount: paymentData.amount.total / 100 // 微信支付金额单位是分，需要转换为元
            });

            console.log('订阅激活成功:', result);

            // 清理用户缓存
            // CRITICAL: 无论客户端后续使用 System UID 还是 Firebase UID 查询，都必须能获取到最新订阅状态
            try {
                const cacheKeysToClear = [CacheKeys.userByUid(userId)];

                // 注意：firebaseUid 从 webhook 数据中解析得到，一定是存在的字符串
                if (firebaseUid) {
                    cacheKeysToClear.push(CacheKeys.userByFirebaseUid(firebaseUid));
                    cacheKeysToClear.push(`subscription:${firebaseUid}`); // 保留原有的 subscription key 清理，防止有遗漏的旧逻辑依赖
                }

                console.log('Clearing cache keys:', cacheKeysToClear);
                CachedApiHandler.clearMultipleCacheAsync(cacheKeysToClear);
                console.log(`已清理用户缓存: ${userId}, ${firebaseUid}`);
            } catch (cacheError) {
                console.warn('清理缓存失败:', cacheError);
            }

            console.log('微信支付通知处理完成 - SUCCESS');
            console.log('--------------------------------------------------');
            return NextResponse.json({ code: 'SUCCESS', message: '订阅激活成功' });

        } catch (error) {
            console.error('激活订阅失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '激活订阅失败' }, { status: 500 });
        }

    } catch (error) {
        console.error('处理微信支付通知时出错:', error);
        return NextResponse.json({ code: 'FAIL', message: '服务器内部错误' }, { status: 500 });
    }
}