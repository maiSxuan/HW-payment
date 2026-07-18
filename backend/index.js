// backend/index.js
// Entry point: khởi động tất cả payment servers cùng lúc trên 1 Express app
const express = require("express");
const path = require("path");

const createZaloPayRouter = require("./zalopay/server");
const createPayPalRouter = require("./paypal/server");
const createStripeRouter = require("./stripe/server");
const createVNPayRouter = require("./vnpay/server");

const app = express();
const PORT = 3001;

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

app.listen(PORT, () => {
  console.log("========================================");
  console.log(`✅ Backend đang chạy trên port ${PORT}`);
  console.log("  Các phương thức thanh toán hoạt động:");
  console.log("  - ZaloPay  : /zalopay/create-order");
  console.log("  - PayPal   : /paypal/create-order");
  console.log("  - Stripe   : /stripe/create-order");
  console.log("  - VNPay    : /vnpay/create-order");
  console.log("  Health check: http://localhost:3001/health");
  console.log("========================================");
});
