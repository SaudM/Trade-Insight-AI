const Payment = require('wxpay-v3');

async function test() {
    console.log('Testing wxpay-v3 initialization...');
    try {
        const pay = new Payment({
            appid: 'mock_appid',
            mchid: 'mock_mchid',
            private_key: '', // Empty key to trigger potential fallback
            serial_no: 'mock_serial',
            v3key: 'mock_v3key',
            apiv3_private_key: 'mock_v3key',
            notify_url: 'https://example.com'
        });
        console.log('Initialization success');

        // Attempt a call?
        // const res = await pay.native({ description: 'test', out_trade_no: '123', amount: { total: 1 } });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
