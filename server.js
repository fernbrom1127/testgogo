const express = require('express');
// 正確的導入方式：直接 require，不需要 new
const ecpay = require('node-ecpay-aio');

const app = express();
const port = process.env.PORT || 3000;

// --- 綠界測試環境設定 (使用官方測試金鑰) ---
// 注意：這裡的設定方式可能因套件版本而異，請參考套件的官方文件
const ecpayConfig = {
    MerchantID: '3002607',
    HashKey: 'pwFHCqoQZGmho4w6',
    HashIV: 'EkRm7iFT261dpevs',
    PayGateWay: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
};

// --- 解析表單資料 ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 首頁：顯示付款按鈕 ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>綠界金流測試 (SDK版)</title>
        </head>
        <body style="text-align:center;padding:50px;">
            <h1>綠界金流測試 (使用 SDK)</h1>
            <p>測試信用卡：4311-9522-2222-2222</p>
            <form method="POST" action="/pay">
                <button type="submit" style="font-size:20px;padding:10px 20px;">付款 1 元</button>
            </form>
        </body>
        </html>
    `);
});

// --- 處理付款請求 ---
app.post('/pay', async (req, res) => {
    const tradeNo = `Test${Date.now()}`;

    // 1. 建立訂單參數
    const baseParam = {
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '/'),
        TotalAmount: '1',
        TradeDesc: '測試交易',
        ItemName: '測試商品',
        ReturnURL: 'https://你的render網址.onrender.com/return', // 記得修改
        OrderResultURL: 'https://你的render網址.onrender.com/result', // 記得修改
        ChoosePayment: 'Credit',
        EncryptType: '1',
    };

    try {
        // 2. 使用 SDK 的方法建立訂單
        // 注意：這裡的呼叫方式 'ecpay.paymentClient.create' 是假設的，請務必查閱你安裝的套件版本文件
        // 有些版本可能是 ecpay.create(orderData)
        const html = await ecpay.paymentClient.create(baseParam, ecpayConfig);
        res.send(html);
    } catch (error) {
        console.error('建立訂單失敗:', error);
        res.status(500).send('建立訂單失敗');
    }
});

// --- (選用) 接收綠界付款結果通知的端點 ---
app.post('/return', (req, res) => {
    console.log('收到綠界付款結果通知:', req.body);
    res.send('1|OK');
});

app.get('/result', (req, res) => {
    res.send('付款完成，感謝您的測試！');
});

app.listen(port, () => {
    console.log(`✅ 測試伺服器運行在 http://localhost:${port}`);
});
