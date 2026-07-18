// backend/stripe/server.js
const express = require("express");

const createStripeRouter = () => {
  const router = express.Router();

  // TODO: Thêm logic Stripe vào đây
  router.post("/stripe/create-order", (req, res) => {
    res.status(501).json({ message: "Stripe chưa được tích hợp" });
  });

  return router;
};

module.exports = createStripeRouter;
