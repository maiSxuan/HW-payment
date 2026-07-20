// backend/paypal/server.js
const express = require("express");

const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

// Lấy access token từ PayPal (OAuth2 client credentials flow)
async function getAccessToken() {
  const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error(
      "Thiếu PAYPAL_CLIENT_ID hoặc PAYPAL_SECRET trong biến môi trường",
    );
  }

  const basicAuth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Lấy access token thất bại: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

const createPayPalRouter = () => {
  const router = express.Router();

  // Tạo đơn hàng PayPal
  router.post("/paypal/create-order", async (req, res) => {
    try {
      const { amount, currency = "USD" } = req.body;

      if (!amount) {
        return res.status(400).json({ message: "Thiếu amount trong request" });
      }

      const accessToken = await getAccessToken();

      const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount,
              },
            },
          ],
          application_context: {
            return_url: `${process.env.CLIENT_URL}?method=paypal`,
            cancel_url: `${process.env.CLIENT_URL}?method=paypal&status=cancel`,
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        return res.status(orderRes.status).json({
          message: "Lỗi tạo đơn hàng PayPal",
          detail: orderData,
        });
      }

      res.status(200).json(orderData);
    } catch (err) {
      console.error("Lỗi tạo đơn hàng PayPal:", err.message);
      res.status(500).json({
        message: "Lỗi tạo đơn hàng PayPal",
        detail: err.message,
      });
    }
  });

  // Xác nhận (capture) thanh toán sau khi buyer approve trên PayPal
  router.post("/paypal/capture-order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ message: "Thiếu orderId" });
      }

      const accessToken = await getAccessToken();

      const captureRes = await fetch(
        `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const captureData = await captureRes.json();

      if (!captureRes.ok) {
        return res.status(captureRes.status).json({
          message: "Lỗi capture đơn hàng PayPal",
          detail: captureData,
        });
      }

      res.status(200).json(captureData);
    } catch (err) {
      console.error("Lỗi capture đơn hàng PayPal:", err.message);
      res.status(500).json({
        message: "Lỗi capture đơn hàng PayPal",
        detail: err.message,
      });
    }
  });

  // (Tuỳ chọn) Lấy chi tiết đơn hàng theo orderId — hữu ích khi debug
  router.get("/paypal/order/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const accessToken = await getAccessToken();

      const orderRes = await fetch(
        `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        return res.status(orderRes.status).json({
          message: "Lỗi lấy thông tin đơn hàng PayPal",
          detail: orderData,
        });
      }

      res.status(200).json(orderData);
    } catch (err) {
      console.error("Lỗi lấy thông tin đơn hàng PayPal:", err.message);
      res.status(500).json({
        message: "Lỗi lấy thông tin đơn hàng PayPal",
        detail: err.message,
      });
    }
  });

  return router;
};

module.exports = createPayPalRouter;
