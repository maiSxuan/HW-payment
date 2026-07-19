// backend/stripe/server.js
const express = require("express");
const config = require("./config");
const stripe = require("stripe")(config.STRIPE_SECRET_KEY);

const createStripeRouter = () => {
  const router = express.Router();

  router.get("/stripe/verify-session", async (req, res) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) {
        return res.status(400).json({ verified: false, error: "Thiếu session_id" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const verified = session.payment_status === "paid";

      res.json({
        verified,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
      });
    } catch (error) {
      res.status(400).json({ verified: false, error: error.message });
    }
  });

  router.post("/stripe/create-order", async (req, res) => {
    try {
      const amount = req.body.amount ?? 50000;
      const productName = req.body.productName ?? "Stripe Integration Demo";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "vnd",
              product_data: {
                name: productName,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${config.CLIENT_URL}/index.html?status=success&session_id={CHECKOUT_SESSION_ID}&method=stripe`,
        cancel_url: `${config.CLIENT_URL}/index.html?status=cancel&method=stripe`,
      });

      res.json({ url: session.url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

module.exports = createStripeRouter;
