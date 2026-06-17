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
    // 記得替換成你的 Render 實際網址
    returnUrl: 'https://testgogo.onrender.com/return',
    orderResultUrl: 'https://testgogo.onrender.com/result'
};

// --- 綠界專用的 URL 編碼函數 ---
function ecpayUrlEncode(str) {
    return encodeURIComponent(str)
        .replace(/%20/g, '+')
        .replace(/%21/g, '!')
        .replace(/%2A/g, '*')
        .replace(/%27/g, "'")
        .replace(/%28/g, '(')
        .replace(/%29/g, ')');
}

// --- 產生綠界訂單需要的加密簽章 (CheckMacValue) ---
function generateCheckMacValue(params) {
    // 1. 將參數依英文字母排序
    const sortedKeys = Object.keys(params).sort();
    let raw = '';
    
    sortedKeys.forEach(key => {
        if (key !== 'CheckMacValue') {
            raw += `${key}=${params[key]}&`;
        }
    });
    
    // 2. 移除最後一個 &
    raw = raw.slice(0, -1);
    
    // 3. 加上 HashKey 和 HashIV
    raw = `HashKey=${config.hashKey}&${raw}&HashIV=${config.hashIv}`;
    
    // 4. 進行 URL Encode (使用綠界專用編碼)
    const encoded = ecpayUrlEncode(raw);
    
    // 5. 轉換成 MD5 並轉為大寫
    return crypto.createHash('md5').update(encoded).digest('hex').toUpperCase();
}

// --- 解析表單資料的 middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 首頁：顯示付款按鈕 ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>綠界金流測試</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 600px; margin: 0 auto; }
                button { 
                    font-size: 20px; 
                    padding: 15px 30px; 
                    background: #4CAF50; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer; 
                    margin-top: 20px;
                }
                button:hover { background: #45a049; }
                .info { background: #f0f0f0; padding: 20px; border-radius: 5px; text-align: left; }
                .info code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛒 綠界金流測試</h1>
                <div class="info">
                    <h3>測試信用卡資料：</h3>
                    <p>卡號：<code>4311-9522-2222-2222</code></p>
                    <p>安全碼：<code>222</code></p>
                    <p>有效月年：請輸入未來日期 (例如 12/2028)</p>
                </div>
                <form method="POST" action="/pay">
                    <button type="submit">💳 用信用卡付款 1 元</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// --- 處理付款請求：建立訂單並導向綠界 ---
app.post('/pay', (req, res) => {
    // 產生唯一的訂單編號 (測試用)
    const timestamp = Date.now();
    const tradeNo = `TEST${timestamp}`.slice(0, 20);
    const totalAmount = '1';
    
    // 目前時間 (綠界格式：YYYY/MM/DD HH:mm:ss)
    const now = new Date();
    const tradeDate = now.getFullYear() + '/' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                     String(now.getDate()).padStart(2, '0') + ' ' +
                     String(now.getHours()).padStart(2, '0') + ':' +
                     String(now.getMinutes()).padStart(2, '0') + ':' +
                     String(now.getSeconds()).padStart(2, '0');

    // 建立訂單參數 (注意參數順序不重要，generateCheckMacValue 會自動排序)
    const params = {
        MerchantID: config.merchantId,
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: tradeDate,
        PaymentType: 'aio',
        TotalAmount: totalAmount,
        TradeDesc: '測試交易',
        ItemName: '測試商品',
        ReturnURL: config.returnUrl,
        OrderResultURL: config.orderResultUrl,
        ChoosePayment: 'Credit',
        EncryptType: '1'
    };

    // 產生簽章
    const checkMacValue = generateCheckMacValue(params);
    params.CheckMacValue = checkMacValue;

    console.log('=== 訂單參數 ===');
    console.log(JSON.stringify(params, null, 2));
    console.log('CheckMacValue:', checkMacValue);

    // 建立一個自動送出資料的表單，導向綠界
    let formHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>導向綠界...</title></head>
        <body style="text-align:center;padding:50px;font-family:Arial;">
            <p>⏳ 正在導向綠界付款頁面...</p>
            <form method="post" action="${config.payUrl}" id="ecpayForm">
    `;
    
    for (const [key, value] of Object.entries(params)) {
        formHtml += `<input type="hidden" name="${key}" value="${value}">`;
    }
    
    formHtml += `
            </form>
            <script>
                console.log('表單即將送出');
                document.getElementById('ecpayForm').submit();
            </script>
        </body>
        </html>
    `;

    res.send(formHtml);
});

// --- 接收綠界付款結果通知的端點 ---
app.post('/return', (req, res) => {
    console.log('=== 收到綠界付款結果通知 ===');
    console.log(JSON.stringify(req.body, null, 2));
    
    // 簡易回傳確認 (實際應用需要驗證簽章)
    res.send('1|OK');
});

// --- 付款完成後的顯示頁面 ---
app.get('/result', (req, res) => {
    console.log('=== 付款完成，回到商店 ===');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>付款完成</title></head>
        <body style="text-align:center;padding:50px;font-family:Arial;">
            <h1>✅ 付款完成！</h1>
            <p>感謝您的測試，訂單已成功送出。</p>
            <p><a href="/" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:white;text-decoration:none;border-radius:5px;">返回首頁</a></p>
        </body>
        </html>
    `);
});

// --- 顯示收到的綠界通知 (除錯用) ---
app.get('/debug', (req, res) => {
    res.send(`
        <h1>除錯資訊</h1>
        <p>服務已啟動，設定如下：</p>
        <ul>
            <li>MerchantID: ${config.merchantId}</li>
            <li>ReturnURL: ${config.returnUrl}</li>
            <li>OrderResultURL: ${config.orderResultUrl}</li>
            <li>Port: ${port}</li>
        </ul>
        <p>請確認 ReturnURL 和 OrderResultURL 已設定為你的 Render 實際網址</p>
    `);
});

app.listen(port, () => {
    console.log(`✅ 測試伺服器運行在 http://localhost:${port}`);
    console.log('📝 請將 config 中的 returnUrl 和 orderResultUrl 替換為你的 Render 實際網址');
    console.log('🔍 查看除錯資訊: /debug');
});
