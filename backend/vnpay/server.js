const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const { v4: uuidv4 } = require("uuid");

const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");

// URL của frontend (Vite dev server) để redirect người dùng quay lại sau khi thanh toán
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// Lưu trạng thái giao dịch tạm trong bộ nhớ để FE poll (giống pattern ZaloPay)
const paymentStatuses = {};

const createVNPayRouter = () => {
  const router = express.Router();
  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMNCODE,
    secureSecret: process.env.VNP_HASHSECRET,
    vnpayHost: process.env.VNP_HOST,
    testMode: true,
    hashAlgorithm: "SHA512",
    loggerFn: ignoreLogger,
  });

  router.post("/vnpay/create-order", async (req, res) => {
    try {
      const txnRef = uuidv4();
      const amount = 50000; // demo: 50.000 VND, đồng bộ với các phương thức khác

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const paymentUrl = await vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: req.ip || "127.0.0.1",
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang ${txnRef}`,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: `${BACKEND_URL}/vnpay/check-payment`,
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(tomorrow),
      });

      paymentStatuses[txnRef] = { txnRef, status: "pending", amount };

      res.status(201).json({ txnRef, amount, paymentUrl });
    } catch (err) {
      console.error("[VNPay] Create order error:", err.message);
      res.status(500).json({
        message: "Create payment failed",
      });
    }
  });

  // VNPay redirect trình duyệt của user về đây sau khi thanh toán (vnp_ReturnUrl)
  router.get("/vnpay/check-payment", (req, res) => {
    let verify;
    try {
      verify = vnpay.verifyReturnUrl(req.query);
    } catch (err) {
      console.error("[VNPay] verifyReturnUrl error:", err.message);
      return res.redirect(`${CLIENT_URL}/?vnpay_status=error`);
    }

    const txnRef = req.query.vnp_TxnRef;

    if (!verify.isVerified) {
      // Chữ ký không hợp lệ -> không tin dữ liệu này
      if (txnRef) {
        paymentStatuses[txnRef] = {
          txnRef,
          status: "failed",
          reason: "invalid_signature",
        };
      }
      return res.redirect(
        `${CLIENT_URL}/?vnpay_status=invalid&vnpay_txnRef=${encodeURIComponent(txnRef || "")}`,
      );
    }

    const status = verify.isSuccess ? "success" : "failed";
    if (txnRef) {
      paymentStatuses[txnRef] = {
        txnRef,
        status,
        message: verify.message,
        detail: verify,
      };
    }

    return res.redirect(
      `${CLIENT_URL}/?vnpay_status=${status}&vnpay_txnRef=${encodeURIComponent(txnRef || "")}`,
    );
  });

  // FE poll trạng thái theo txnRef (không bắt buộc khi dùng redirect flow, nhưng để đồng bộ pattern)
  router.get("/vnpay/payment-status/:txnRef", (req, res) => {
    const { txnRef } = req.params;
    const status = paymentStatuses[txnRef];
    if (!status) {
      return res.status(200).json({ txnRef, status: "pending" });
    }
    return res.status(200).json(status);
  });

  return router;
};

module.exports = createVNPayRouter;
