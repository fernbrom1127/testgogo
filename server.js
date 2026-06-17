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
    // 重要：替換成你的 Render 實際網址
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
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                    background: #f5f5f5;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    max-width: 500px;
                    width: 100%;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #1a1a1a;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 28px;
                }
                .info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    border-left: 4px solid #4CAF50;
                }
                .info h3 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                .info p {
                    color: #666;
                    margin: 8px 0;
                    font-size: 14px;
                }
                .info code {
                    background: #e9ecef;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    color: #d63384;
                }
                .btn-pay {
                    width: 100%;
                    padding: 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s;
                }
                .btn-pay:hover {
                    background: #45a049;
                }
                .btn-pay:active {
                    transform: scale(0.98);
                }
                .note {
                    text-align: center;
                    margin-top: 20px;
                    color: #999;
                    font-size: 13px;
                }
                .loading {
                    display: none;
                    text-align: center;
                    margin-top: 15px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛒 綠界金流測試</h1>
                
                <div class="info">
                    <h3>📋 測試信用卡資料</h3>
                    <p>卡號：<code>4311-9522-2222-2222</code></p>
                    <p>安全碼：<code>222</code></p>
                    <p>有效月年：請輸入未來日期 (例如 12/2028)</p>
                </div>

                <form method="POST" action="/pay" id="payForm">
                    <button type="submit" class="btn-pay" id="payBtn">💳 付款 1 元</button>
                </form>
                
                <div class="loading" id="loading">
                    ⏳ 處理中，請稍候...
                </div>
                
                <div class="note">
                    ⚠️ 測試環境，不會實際扣款
                </div>
            </div>

            <script>
                document.getElementById('payForm').addEventListener('submit', function(e) {
                    document.getElementById('payBtn').disabled = true;
                    document.getElementById('payBtn').textContent = '⏳ 處理中...';
                    document.getElementById('loading').style.display = 'block';
                });
            </script>
        </body>
        </html>
    `);
});

// --- 處理付款請求：建立訂單並導向綠界 ---
app.post('/pay', (req, res) => {
    try {
        // 產生唯一的訂單編號
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const tradeNo = `TEST${timestamp}${random}`.slice(0, 20);
        const totalAmount = '1';
        
        // 目前時間 (綠界格式：YYYY/MM/DD HH:mm:ss)
        const now = new Date();
        const tradeDate = now.getFullYear() + '/' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                         String(now.getDate()).padStart(2, '0') + ' ' +
                         String(now.getHours()).padStart(2, '0') + ':' +
                         String(now.getMinutes()).padStart(2, '0') + ':' +
                         String(now.getSeconds()).padStart(2, '0');

        // 建立訂單參數
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

        // 記錄訂單資訊 (方便除錯)
        console.log('=== 訂單參數 ===');
        console.log('訂單編號:', tradeNo);
        console.log('金額:', totalAmount);
        console.log('CheckMacValue:', checkMacValue);

        // 建立自動送出的表單
        let formHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>導向綠界...</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: #f5f5f5;
                    }
                    .spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #4CAF50;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .message {
                        color: #333;
                        font-size: 18px;
                    }
                </style>
            </head>
            <body>
                <div class="spinner"></div>
                <div class="message">⏳ 正在導向綠界付款頁面...</div>
                <form method="post" action="${config.payUrl}" id="ecpayForm">
        `;
        
        for (const [key, value] of Object.entries(params)) {
            formHtml += `<input type="hidden" name="${key}" value="${value}">`;
        }
        
        formHtml += `
                </form>
                <script>
                    // 延遲 500ms 送出表單，確保頁面完全載入
                    setTimeout(function() {
                        document.getElementById('ecpayForm').submit();
                    }, 500);
                </script>
            </body>
            </html>
        `;

        res.send(formHtml);
        
    } catch (error) {
        console.error('付款請求錯誤:', error);
        res.status(500).send('付款請求失敗: ' + error.message);
    }
});

// --- 接收綠界付款結果通知 ---
app.post('/return', (req, res) => {
    console.log('=== 收到綠界付款結果通知 ===');
    console.log('參數:', JSON.stringify(req.body, null, 2));
    
    // 檢查是否有付款結果
    if (req.body.RtnCode === '1') {
        console.log('✅ 付款成功！');
        console.log('訂單編號:', req.body.MerchantTradeNo);
        console.log('交易編號:', req.body.TradeNo);
    } else {
        console.log('❌ 付款失敗');
        console.log('錯誤訊息:', req.body.RtnMsg);
    }
    
    // 回傳給綠界確認收到通知
    res.send('1|OK');
});

// --- 付款完成後的顯示頁面 ---
app.get('/result', (req, res) => {
    console.log('=== 付款完成，返回商店 ===');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>付款完成</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: #f5f5f5;
                }
                .container {
                    background: white;
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                .icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #4CAF50;
                    margin-bottom: 10px;
                }
                p {
                    color: #666;
                    margin: 10px 0;
                }
                .btn-home {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 12px 30px;
                    background: #4CAF50;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    transition: background 0.3s;
                }
                .btn-home:hover {
                    background: #45a049;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">✅</div>
                <h1>付款完成！</h1>
                <p>感謝您的測試，訂單已成功送出。</p>
                <p style="font-size:14px;color:#999;">
                    這只是測試環境，不會實際扣款
                </p>
                <a href="/" class="btn-home">返回首頁</a>
            </div>
        </body>
        </html>
    `);
});

// --- 除錯頁面 ---
app.get('/debug', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>除錯資訊</title></head>
        <body style="font-family:monospace;padding:20px;">
            <h1>🔍 除錯資訊</h1>
            <h3>服務設定</h3>
            <ul>
                <li>MerchantID: ${config.merchantId}</li>
                <li>ReturnURL: ${config.returnUrl}</li>
                <li>OrderResultURL: ${config.orderResultUrl}</li>
                <li>Port: ${port}</li>
            </ul>
            <h3>測試步驟</h3>
            <ol>
                <li>回到 <a href="/">首頁</a></li>
                <li>點擊付款按鈕</li>
                <li>使用測試信用卡付款</li>
                <li>查看終端機日誌確認結果</li>
            </ol>
            <h3>測試信用卡</h3>
            <ul>
                <li>卡號: 4311-9522-2222-2222</li>
                <li>安全碼: 222</li>
                <li>有效月年: 未來日期 (如 12/2028)</li>
            </ul>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`✅ 測試伺服器運行在 http://localhost:${port}`);
    console.log(`🔍 查看除錯資訊: http://localhost:${port}/debug`);
    console.log('📝 重要：請將 config 中的 returnUrl 和 orderResultUrl 替換為你的 Render 實際網址');
});
