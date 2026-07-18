// backend/paypal/server.js
const express = require("express");

const createPayPalRouter = () => {
  const router = express.Router();

  // TODO: Thêm logic PayPal vào đây
  router.post("/paypal/create-order", (req, res) => {
    res.status(501).json({ message: "PayPal chưa được tích hợp" });
  });

  return router;
};

module.exports = createPayPalRouter;
