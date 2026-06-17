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
    returnUrl: 'https://你的render網址.ondigitalocean.app/return', // 付款完成後，綠界會將結果POST到這個網址
    orderResultUrl: 'https://你的render網址.ondigitalocean.app/result' // 付款完成後，消費者會被導向這個網址
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

// --- 首頁：顯示一個付款按鈕 ---
app.get('/', (req, res) => {
    res.send(`
        <h1>綠界金流測試</h1>
        <form method="POST" action="/pay">
            <button type="submit" style="font-size:20px;padding:10px 20px;">用信用卡付款 1 元</button>
        </form>
    `);
});

// --- 處理付款請求：建立訂單並導向綠界 ---
app.post('/pay', (req, res) => {
    const tradeNo = `Test${Date.now()}`; // 唯一訂單編號
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
        ChoosePayment: 'Credit', // 指定使用信用卡付款
        EncryptType: '1',
    };

    // 產生簽章
    params.CheckMacValue = generateCheckMacValue(params);

    // 建立一個自動送出資料的表單，導向綠界
    let formHtml = `<form method="post" action="${config.payUrl}" id="ecpayForm">`;
    for (const [key, value] of Object.entries(params)) {
        formHtml += `<input type="hidden" name="${key}" value="${value}">`;
    }
    formHtml += `</form><script>document.getElementById('ecpayForm').submit();</script>`;

    res.send(formHtml);
});

// --- (選用) 接收綠界付款結果通知的端點 ---
app.post('/return', (req, res) => {
    console.log('收到綠界付款結果通知:', req.body);
    // 這裡需要驗證簽章，並更新訂單狀態
    res.send('1|OK'); // 告訴綠界已收到通知
});

app.get('/result', (req, res) => {
    res.send('付款完成，感謝您的測試！');
});

app.listen(port, () => {
    console.log(`測試伺服器運行在 http://localhost:${port}`);
});
