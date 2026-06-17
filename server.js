const express = require('express');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// --- 綠界測試環境設定 ---
const config = {
    merchantId: '3002607',
    hashKey: 'pwFHCqoQZGmho4w6',
    hashIv: 'EkRm7iFT261dpevs',
    payUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
    // 重要：記得替換成你的 Render 實際網址
    returnUrl: 'https://testgogo.onrender.com/return',
    orderResultUrl: 'https://testgogo.onrender.com/result'
};

// --- 產生綠界訂單需要的加密簽章 (CheckMacValue) ---
function generateCheckMacValue(params) {
    // 1. 將參數依英文字母排序
    const sortedKeys = Object.keys(params).sort();
    let raw = '';
    sortedKeys.forEach(key => {
        if (params[key] !== '' && key !== 'CheckMacValue') {
            raw += `${key}=${params[key]}&`;
        }
    });
    // 2. 加上 HashKey 和 HashIV
    raw = `HashKey=${config.hashKey}&${raw}HashIV=${config.hashIv}`;
    // 3. URL Encode
    const encoded = encodeURIComponent(raw);
    // 4. 轉換成大寫
    const result = encoded.replace(/%20/g, '+');
    // 5. 產生 MD5
    return crypto.createHash('md5').update(result).digest('hex').toUpperCase();
}

// --- 解析表單資料的 middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 首頁：顯示一個付款按鈕 ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>綠界金流測試</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                button { font-size: 20px; padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
                button:hover { background: #45a049; }
            </style>
        </head>
        <body>
            <h1>🛒 綠界金流測試</h1>
            <p>測試信用卡：4311-9522-2222-2222</p>
            <p>安全碼：222</p>
            <form method="POST" action="/pay">
                <button type="submit">💳 用信用卡付款 1 元</button>
            </form>
        </body>
        </html>
    `);
});

// --- 處理付款請求：建立訂單並導向綠界 ---
app.post('/pay', (req, res) => {
    const tradeNo = `Test${Date.now()}`;
    const totalAmount = '1';

    // 建立訂單參數
    const params = {
        MerchantID: config.merchantId,
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '/'),
        PaymentType: 'aio',
        TotalAmount: totalAmount,
        TradeDesc: '測試交易',
        ItemName: '測試商品',
        ReturnURL: config.returnUrl,
        OrderResultURL: config.orderResultUrl,
        ChoosePayment: 'Credit',
        EncryptType: '1',
    };

    // 產生簽章
    params.CheckMacValue = generateCheckMacValue(params);

    // 建立一個自動送出資料的表單，導向綠界
    let formHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>導向綠界...</title></head>
        <body>
            <p>正在導向綠界付款頁面...</p>
            <form method="post" action="${config.payUrl}" id="ecpayForm">
    `;
    for (const [key, value] of Object.entries(params)) {
        formHtml += `<input type="hidden" name="${key}" value="${value}">`;
    }
    formHtml += `
            </form>
            <script>document.getElementById('ecpayForm').submit();</script>
        </body>
        </html>
    `;

    res.send(formHtml);
});

// --- 接收綠界付款結果通知的端點 ---
app.post('/return', (req, res) => {
    console.log('收到綠界付款結果通知:', req.body);
    // 這裡需要驗證簽章，並更新訂單狀態
    res.send('1|OK');
});

// --- 付款完成後的顯示頁面 ---
app.get('/result', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>付款完成</title></head>
        <body style="text-align:center;padding:50px;font-family:Arial;">
            <h1>✅ 付款完成！</h1>
            <p>感謝您的測試，訂單已成功送出。</p>
            <a href="/">返回首頁</a>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`✅ 測試伺服器運行在 http://localhost:${port}`);
    console.log('📝 請將 config 中的 returnUrl 和 orderResultUrl 替換為你的 Render 實際網址');
});
