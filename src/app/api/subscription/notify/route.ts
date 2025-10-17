import { NextRequest, NextResponse } from 'next/server';
import { getPayment } from '@/lib/wxpay';
import { activateSubscriptionPostgres } from '@/lib/subscription-postgres';
import { UserAdapter } from '@/lib/adapters/user-adapter';

export const runtime = 'nodejs';

/**
 * 微信支付结果通知接口
 * 接收微信支付成功后的推送消息，自动激活用户订阅
 */
export async function POST(request: NextRequest) {
    try {
        console.log('收到微信支付通知');
        
        // 获取请求体
        const body = await request.text();
        const signature = request.headers.get('wechatpay-signature');
        const timestamp = request.headers.get('wechatpay-timestamp');
        const nonce = request.headers.get('wechatpay-nonce');
        const serial = request.headers.get('wechatpay-serial');

        if (!signature || !timestamp || !nonce || !serial) {
            console.error('微信支付通知缺少必要的头部信息');
            return NextResponse.json({ code: 'FAIL', message: '缺少必要的头部信息' }, { status: 400 });
        }

        // 验证签名
        try {
            const wxpay = getPayment();
            const isValid = await wxpay.verifySignature({
                body,
                signature,
                timestamp,
                nonce,
                serial
            });

            if (!isValid) {
                console.error('微信支付通知签名验证失败');
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

        console.log('微信支付通知内容:', notificationData);

        // 检查事件类型
        if (notificationData.event_type !== 'TRANSACTION.SUCCESS') {
            console.log('非支付成功事件，忽略处理:', notificationData.event_type);
            return NextResponse.json({ code: 'SUCCESS', message: '事件已接收' });
        }

        // 解密资源内容
        let decryptedData;
        try {
            const wxpay = getPayment();
            decryptedData = wxpay.decipher(
                notificationData.resource.ciphertext,
                notificationData.resource.associated_data,
                notificationData.resource.nonce
            );
        } catch (error) {
            console.error('解密微信支付通知资源失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '解密失败' }, { status: 500 });
        }

        const paymentData = JSON.parse(decryptedData);
        console.log('解密后的支付数据:', paymentData);

        // 检查支付状态
        if (paymentData.trade_state !== 'SUCCESS') {
            console.log('支付状态非成功，当前状态:', paymentData.trade_state);
            return NextResponse.json({ code: 'SUCCESS', message: '支付状态已接收' });
        }

        // 从商户订单号中提取用户信息和套餐信息
        const outTradeNo = paymentData.out_trade_no;
        const parts = outTradeNo.split('_');
        
        if (parts.length < 4) {
            console.error('商户订单号格式错误:', outTradeNo);
            return NextResponse.json({ code: 'FAIL', message: '订单号格式错误' }, { status: 400 });
        }

        const firebaseUid = parts[1];
        const planId = parts[2];

        // 获取用户内部ID
        let userId;
        try {
            const user = await UserAdapter.getUserByFirebaseUid(firebaseUid);
            if (!user) {
                console.error('未找到用户:', firebaseUid);
                return NextResponse.json({ code: 'FAIL', message: '用户不存在' }, { status: 404 });
            }
            userId = user.id;
        } catch (error) {
            console.error('获取用户信息失败:', error);
            return NextResponse.json({ code: 'FAIL', message: '获取用户信息失败' }, { status: 500 });
        }

        // 激活订阅
        try {
            const result = await activateSubscriptionPostgres({
                userId,
                planId,
                paymentId: paymentData.transaction_id,
                amount: paymentData.amount.total / 100 // 微信支付金额单位是分，需要转换为元
            });

            console.log('订阅激活成功:', result);

            // 清理用户缓存
            try {
                await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/cache/clear`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        cacheKeys: [`user:info:${firebaseUid}`, `subscription:${firebaseUid}`] 
                    })
                });
            } catch (cacheError) {
                console.warn('清理缓存失败:', cacheError);
            }

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