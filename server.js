const express = require('express');
const ecpay = require('node-ecpay-aio'); // 引入套件

const app = express();
const port = process.env.PORT || 3000;

// --- 1. 建立一個 ecpay 實例，並傳入設定 ---
const create = new ecpay({
    operationMode: "Test", // 測試模式
    merchantInfo: {
        merchantID: "3002607",       // 測試商店代號
        hashKey: "pwFHCqoQZGmho4w6", // 測試 HashKey
        hashIV: "EkRm7iFT261dpevs"   // 測試 HashIV
    }
});

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

    // 2. 建立訂單參數 (比照綠界官方規格)
    const baseParam = {
        MerchantTradeNo: tradeNo,
        MerchantTradeDate: new Date().toLocaleString('zh-TW', { hour12: false }).replace(/\//g, '/'),
        TotalAmount: '1',
        TradeDesc: '測試交易',
        ItemName: '測試商品',
        ReturnURL: 'https://testgogo.onrender.com/return',   // 記得修改
        OrderResultURL: 'https://testgogo.onrender.com/result', // 記得修改
        ChoosePayment: 'Credit',
        EncryptType: '1',
    };

    try {
        // 3. 使用正確的方法 'aio_check_out_all' 建立訂單
        // 文件範例: create.payment_client.aio_check_out_all(parameters = base_param, invoice = inv_params)
        const html = create.payment_client.aio_check_out_all(baseParam);
        res.send(html);
    } catch (error) {
        console.error('建立訂單失敗:', error);
        res.status(500).send('建立訂單失敗: ' + error.message);
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
