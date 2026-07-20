// backend/zalopay/server.js
const express = require("express");
const axios = require("axios").default;
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const config = {
  appid: process.env.ZALO_APPID,
  key1: process.env.ZALO_KEY1,
  key2: process.env.ZALO_KEY2,
  endpoint: process.env.ZALO_ENDPOINT,
  callbackUrl: process.env.ZALO_CALLBACK_URL,
  orderStatusUrl: process.env.ZALO_ORDER_STATUS_URL,
  CLIENT_URL: process.env.CLIENT_URL,
};

const paymentStatuses = {}; // Lưu trạng thái callback cho FE kiểm tra

const createZaloPayRouter = () => {
  const router = express.Router();

  const createOrder = async () => {
    console.log("[ZaloPay] createOrder() called");
    const embeddata = {
      merchantinfo: "embeddata123",
      redirecturl: `${config.CLIENT_URL}/?status=zalopay_return`, // quay lại trang chủ frontend
    };

    const items = [
      {
        itemid: "OL01",
        itemname: "Ốp lưng Iphone16",
        itemprice: 50000,
        itemquantity: 1,
      },
    ];

    const transID = Math.floor(Math.random() * 1000000);
    const order = {
      appid: config.appid,
      apptransid: `${moment().format("YYMMDD")}_${transID}`,
      appuser: "Nguyễn Văn A",
      apptime: Date.now(),
      item: JSON.stringify(items),
      embeddata: JSON.stringify(embeddata),
      amount: 50000,
      description: "Thanh toán đơn hàng ORD-001",
      bankcode: "zalopayapp",
      callbackurl: config.callbackUrl,
    };

    const data =
      config.appid +
      "|" +
      order.apptransid +
      "|" +
      order.appuser +
      "|" +
      order.amount +
      "|" +
      order.apptime +
      "|" +
      order.embeddata +
      "|" +
      order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    console.log("[ZaloPay] sending to endpoint:", config.endpoint);
    try {
      const result = await axios.post(config.endpoint, qs.stringify(order), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      console.log("[ZaloPay] received from endpoint");
      return { apptransid: order.apptransid, ...result.data };
    } catch (err) {
      console.log("[ZaloPay] error from endpoint", err.message);
      throw err;
    }
  };

  // Debug callback
  router.all("/debug-callback", express.raw({ type: "*/*" }), (req, res) => {
    const rawBody = req.body;
    let parsedBody = Buffer.isBuffer(rawBody)
      ? rawBody.toString("utf8")
      : rawBody;
    console.log("[ZaloPay] DEBUG CALLBACK method:", req.method);
    res.status(200).json({
      method: req.method,
      url: req.originalUrl,
      parsedBody,
      query: req.query,
    });
  });

  // Tạo đơn hàng (cả 2 route đều hỗ trợ)
  const handleCreateOrder = async (req, res) => {
    console.log("[ZaloPay] HIT create-order");
    try {
      const orderResult = await createOrder();
      console.log("[ZaloPay] Create order response:", orderResult);
      return res.status(200).json(orderResult);
    } catch (err) {
      console.error(
        "[ZaloPay] Create order error:",
        err.response?.data || err.message,
      );
      return res.status(err.response?.status || 500).json({
        message: "Không thể tạo đơn hàng ZaloPay",
        error: err.response?.data || err.message,
      });
    }
  };

  router.post("/payment", handleCreateOrder);
  router.post("/zalopay/create-order", handleCreateOrder);

  // Callback từ ZaloPay
  router.post("/callback", express.raw({ type: "*/*" }), (req, res) => {
    let result = {};
    const rawBody = req.body;
    let body = rawBody;

    console.log("[ZaloPay] --- callback received ---");

    try {
      if (Buffer.isBuffer(body)) {
        const text = body.toString("utf8").trim();
        if (!text) {
          body = {};
        } else if (text.startsWith("{") || text.startsWith("[")) {
          body = JSON.parse(text);
        } else {
          body = Object.fromEntries(new URLSearchParams(text));
        }
      } else if (typeof body === "string") {
        const text = body.trim();
        if (!text) {
          body = {};
        } else if (text.startsWith("{") || text.startsWith("[")) {
          body = JSON.parse(text);
        } else {
          body = Object.fromEntries(new URLSearchParams(text));
        }
      }

      const dataStr = body?.data;
      const reqMac = body?.mac;

      if (!dataStr || !reqMac) {
        throw new Error("Callback body thiếu data hoặc mac");
      }

      const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
      console.log("[ZaloPay] mac valid:", reqMac === mac);

      if (reqMac !== mac) {
        console.error("[ZaloPay] CALLBACK BỊ TỪ CHỐI: MAC không hợp lệ");
        result.returncode = -1;
        result.returnmessage = "mac not equal";
      } else {
        const dataJson = JSON.parse(dataStr);
        const callbackStatus = Number(dataJson.status);
        console.log(
          "[ZaloPay] callback success, apptransid:",
          dataJson.apptransid,
        );
        result.returncode = 1;
        result.returnmessage = "success";
        result.callbackStatus = callbackStatus;
      }
    } catch (ex) {
      console.error("[ZaloPay] Callback error:", ex.message);
      result.returncode = 0;
      result.returnmessage = ex.message;
    }

    if (body?.data) {
      try {
        const dataJson = JSON.parse(body.data);
        const callbackStatus = Number(dataJson.status);
        let frontendStatus = "failed";
        if (callbackStatus === 1) frontendStatus = "success";
        else if (callbackStatus === 2) frontendStatus = "processing";

        paymentStatuses[dataJson.apptransid] = {
          apptransid: dataJson.apptransid,
          status: frontendStatus,
          returncode: result.returncode,
          returnmessage: result.returnmessage,
          detail: dataJson,
        };
      } catch (err) {
        console.warn(
          "[ZaloPay] Không lưu được trạng thái callback:",
          err.message,
        );
      }
    }

    res.json(result);
  });

  // Kiểm tra trạng thái thanh toán (từ FE poll)
  router.get("/payment-status/:apptransid", (req, res) => {
    const apptransid = req.params.apptransid;
    const status = paymentStatuses[apptransid];
    if (!status) {
      return res.status(200).json({
        apptransid,
        status: "pending",
        message: "Chưa có callback cho đơn hàng này, đang chờ thanh toán...",
      });
    }
    return res.status(200).json(status);
  });

  // Kiểm tra trạng thái đơn hàng trực tiếp từ ZaloPay
  const handleOrderStatus = async (req, res) => {
    const apptransid = req.params.apptransid;
    let postData = {
      appid: config.appid,
      apptransid,
    };

    let data = postData.appid + "|" + postData.apptransid + "|" + config.key1;
    postData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    let postConfig = {
      method: "post",
      url: config.orderStatusUrl,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: qs.stringify(postData),
    };

    try {
      const result = await axios(postConfig);
      const status = result.data;

      const notFoundCodes = [-49, -1, -2];
      const isNotFound =
        notFoundCodes.includes(status.returncode) ||
        status.error?.errorCode === "TRANS_INFO_NOT_FOUND";

      if (isNotFound) {
        console.log(
          "[ZaloPay] ⏳ Giao dịch chưa tìm thấy (user chưa thanh toán)",
          { apptransid },
        );
      } else if (
        status.returncode === 1 &&
        (status.status === 1 ||
          status.status === "SUCCESS" ||
          status.isprocessing === false)
      ) {
        console.log("[ZaloPay] ✅ THANH TOÁN THÀNH CÔNG", { apptransid });
        paymentStatuses[apptransid] = {
          apptransid,
          status: "success",
          returncode: status.returncode,
          returnmessage: status.returnmessage,
          detail: status,
        };
      } else if (
        status.returncode === 1 &&
        (status.status === 2 ||
          status.status === "PROCESSING" ||
          status.isprocessing === true)
      ) {
        console.log("[ZaloPay] ⏳ GIAO DỊCH ĐANG XỬ LÝ", { apptransid });
        paymentStatuses[apptransid] = {
          apptransid,
          status: "processing",
          returncode: status.returncode,
          returnmessage: status.returnmessage,
          detail: status,
        };
      } else {
        console.error("[ZaloPay] ❌ THANH TOÁN THẤT BẠI", {
          apptransid,
          status,
        });
        paymentStatuses[apptransid] = {
          apptransid,
          status: "failed",
          returncode: status.returncode,
          returnmessage: status.returnmessage,
          detail: status,
        };
      }

      return res.status(200).json(result.data);
    } catch (error) {
      console.error(
        "[ZaloPay] Order status error:",
        error.response?.data || error.message,
      );
      return res.status(error.response?.status || 500).json({
        message: "Không thể kiểm tra trạng thái đơn hàng",
        error: error.response?.data || error.message,
      });
    }
  };

  router.get("/orderstatus/:apptransid", handleOrderStatus);
  router.post("/orderstatus/:apptransid", handleOrderStatus);

  router.post("/zalopay/cancel/:apptransid", (req, res) => {
    const apptransid = req.params.apptransid;
    if (!apptransid) {
      return res.status(400).json({ message: "Thiếu apptransid" });
    }

    paymentStatuses[apptransid] = {
      apptransid,
      status: "failed",
      returncode: -1,
      returnmessage: "Giao dịch bị huỷ bởi người dùng.",
      detail: { cancelledBy: "user", timestamp: Date.now() },
    };

    console.log("[ZaloPay] order cancelled by frontend:", apptransid);
    return res.status(200).json({ ok: true, apptransid, status: "failed" });
  });

  return router;
};

module.exports = createZaloPayRouter;
