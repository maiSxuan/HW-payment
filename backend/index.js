// backend/index.js
// Entry point: khởi động tất cả payment servers cùng lúc trên 1 Express app
require("dotenv").config();
const express = require("express");
const path = require("path");

const createZaloPayRouter = require("./zalopay/server");
const createPayPalRouter = require("./paypal/server");
const createStripeRouter = require("./stripe/server");
const createVNPayRouter = require("./vnpay/server");

const app = express();
// Render (và hầu hết PaaS) cấp PORT qua biến môi trường, không được hardcode
const PORT = process.env.PORT || 3001;

// Middleware chung
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Gắn tất cả router vào 1 app duy nhất
app.use("/", createZaloPayRouter());
app.use("/", createPayPalRouter());
app.use("/", createStripeRouter());
app.use("/", createVNPayRouter());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    services: ["zalopay", "paypal", "stripe", "vnpay"],
    port: PORT,
  });
});

// ---- Serve frontend (file tĩnh sau khi `vite build`) ----
// Sau khi build, Vite xuất ra frontend/dist. Khi deploy, ta gộp BE + FE
// thành 1 service duy nhất: BE serve luôn các file tĩnh này, nên FE và BE
// dùng chung 1 domain, không cần CORS.
const FRONTEND_DIST = path.resolve(__dirname, "../frontend/dist");
app.use(express.static(FRONTEND_DIST));

// Bất kỳ route GET nào không khớp router API ở trên (và không phải file tĩnh)
// sẽ trả về index.html để FE tự xử lý phía client.
// Dùng app.use (không kèm path) để tương thích với path-to-regexp v6 của Express 5.
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(path.join(FRONTEND_DIST, "index.html"), (err) => {
    if (err) next(err);
  });
});

app.listen(PORT, () => {
  console.log("========================================");
  console.log(`✅ Backend đang chạy trên port ${PORT}`);
  console.log("  Các phương thức thanh toán hoạt động:");
  console.log("  - ZaloPay  : /zalopay/create-order");
  console.log("  - PayPal   : /paypal/create-order");
  console.log("  - Stripe   : /stripe/create-order");
  console.log("  - VNPay    : /vnpay/create-order");
  console.log("  Health check: /health");
  console.log("========================================");
});
