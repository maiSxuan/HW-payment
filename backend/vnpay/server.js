// backend/vnpay/server.js
const express = require("express");

const createVNPayRouter = () => {
  const router = express.Router();

  // TODO: Thêm logic VNPay vào đây
  router.post("/vnpay/create-order", (req, res) => {
    res.status(501).json({ message: "VNPay chưa được tích hợp" });
  });

  return router;
};

module.exports = createVNPayRouter;
