const app = document.createElement("div");
app.style.fontFamily = "Arial, sans-serif";
app.style.background = "#f0f2f5";
app.style.minHeight = "100vh";
app.style.padding = "24px";
app.style.margin = "24px 24px 0 auto";
app.innerHTML = `
  <div style="max-width:740px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.08);padding:24px;">
    <div id="mainContent">
      <h1>HW Payment</h1>
      <div id="orderSummary" style="margin-bottom:20px;padding:16px;border-radius:12px;background:#fafafa;border:1px solid #e8e8e8;">
        <h3 style="margin-top:0;margin-bottom:12px;font-size:16px;">Thông tin đơn hàng</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
          <div><span style="color:#888;">Người mua:</span> <strong>Nguyễn Văn A</strong></div>
          <div><span style="color:#888;">Mã đơn:</span> <strong>ORD-001</strong></div>
          <div><span style="color:#888;">Sản phẩm:</span> <strong>Ốp lưng Iphone16</strong></div>
          <div><span style="color:#888;">Số lượng:</span> <strong>1</strong></div>
          <div style="grid-column:1 / -1; margin-top:8px; padding-top:12px; border-top:1px dashed #ddd; font-size:16px;">
            <span style="color:#888;">Tổng tiền:</span> <strong style="color:#ff4d4f; font-size: 18px;">50.000 VNĐ</strong>
          </div>
        </div>
      </div>
      <p>Chọn phương thức thanh toán.</p>
      <div id="methods" style="display:grid;grid-template-columns:repeat(2,minmax(140px,1fr));gap:16px"></div>
      <div id="status" style="margin-top:24px;padding:18px;border-radius:12px;background:#fafafa;border:1px solid #e8e8e8;min-height:86px"></div>
      <div id="orderDetails" style="margin-top:16px;padding:18px;border-radius:16px;background:#f6fbff;border:1px solid #dbe8ff;display:none"></div>
      <div id="orderUrl" style="margin-top:12px; font-size:14px; line-height:1.6;"></div>
      <div id="countdown" style="margin-top:12px; font-size:18px; font-weight:bold; color:#ff4d4f; text-align:center; display:none;"></div>
      <div id="qrContainer" style="margin-top:16px;display:flex;justify-content:center"></div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
        <button id="payButton" style="padding:12px 20px;border:none;border-radius:10px;background:#1677ff;color:#fff;font-size:16px;cursor:pointer" disabled>Thanh toán</button>
      </div>
      <pre id="debug" style="display:none;margin-top:20px;padding:16px;background:#001529;color:#fff;border-radius:12px;white-space:pre-wrap;min-height:140px"></pre>
    </div>
    <div id="successScreen" style="display:none; text-align:center; padding:40px 0;">
      <div style="width:120px; height:120px; margin:0 auto; background:#f4f6f8; clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2" style="width:60px;height:60px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      </div>
      <h2 style="color:#1677ff; margin-top:24px; font-weight:700;">THANH TOÁN THÀNH CÔNG</h2>
      <p style="color:#657786; margin-top:16px;">Hệ thống sẽ quay về trang sau <span id="successCountdown" style="font-weight:bold;">5</span> giây</p>
      <a href="#" id="returnHomeBtn" style="color:#1677ff; text-decoration:underline; font-weight:bold; display:inline-block; margin-top:8px;">Về ngay</a>
    </div>
    <div id="failureScreen" style="display:none; text-align:center; padding:40px 0;">
      <div style="width:120px; height:120px; margin:0 auto; background:#fff1f0; clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2" style="width:60px;height:60px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
      </div>
      <h2 style="color:#ff4d4f; margin-top:24px; font-weight:700;">THANH TOÁN THẤT BẠI</h2>
      <p id="failureMessage" style="color:#657786; margin-top:16px;">Giao dịch không thành công.</p>
      <button id="retryBtn" style="margin-top:20px;padding:12px 24px;border:none;border-radius:10px;background:#1677ff;color:#fff;font-size:16px;cursor:pointer;">Thử lại</button>
    </div>
  </div>
`;

document.body.appendChild(app);

const methods = ["paypal", "stripe", "vnpay", "zalopay"];
const methodsEl = document.getElementById("methods");
const statusEl = document.getElementById("status");
const orderDetailsEl = document.getElementById("orderDetails");
const orderUrlEl = document.getElementById("orderUrl");
const qrContainer = document.getElementById("qrContainer");
const payButton = document.getElementById("payButton");
const debugEl = document.getElementById("debug");
const mainContent = document.getElementById("mainContent");
const successScreen = document.getElementById("successScreen");
const successCountdown = document.getElementById("successCountdown");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const failureScreen = document.getElementById("failureScreen");
const failureMessage = document.getElementById("failureMessage");
const retryBtn = document.getElementById("retryBtn");
let selectedMethod = null;
let countdownInterval = null;
let successInterval = null;
let zalopayPollingActive = false;
const countdownEl = document.getElementById("countdown");

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text || err.message };
  }
}

returnHomeBtn.onclick = (e) => {
  e.preventDefault();
  resetApp();
};

retryBtn.onclick = () => resetApp();

methods.forEach((method) => {
  const card = document.createElement("div");
  card.textContent = method.toUpperCase();
  card.style.padding = "18px";
  card.style.border = "1px solid #d9d9d9";
  card.style.borderRadius = "12px";
  card.style.cursor = "pointer";
  card.style.background = "#fff";
  card.style.transition = "all 0.2s ease";
  card.onclick = () => selectMethod(method, card);
  methodsEl.appendChild(card);
});

function selectMethod(method, element) {

  selectedMethod = method;
  payButton.disabled = false;
  statusEl.innerHTML = `<strong>Phương thức đã chọn:</strong> ${method}`;
  statusEl.style.borderColor = "#1677ff";
  document
    .querySelectorAll("#methods div")
    .forEach((el) => (el.style.borderColor = "#d9d9d9"));
  element.style.borderColor = "#1677ff";
  debugEl.textContent = "";
}

function resetApp() {
  selectedMethod = null;
  zalopayPollingActive = false;
  clearInterval(countdownInterval);
  clearInterval(successInterval);
  countdownEl.style.display = "none";
  successScreen.style.display = "none";
  failureScreen.style.display = "none";
  mainContent.style.display = "block";
  statusEl.style.display = "block";
  payButton.disabled = true;
  statusEl.innerHTML = "<strong>Trạng thái:</strong> Chưa chọn phương thức.";
  statusEl.style.borderColor = "#e8e8e8";
  orderUrlEl.innerHTML = "";
  qrContainer.innerHTML = "";
  orderDetailsEl.style.display = "none";
  orderDetailsEl.style.padding = "";
  orderDetailsEl.style.background = "";
  orderDetailsEl.style.border = "";
  document
    .querySelectorAll("#methods div")
    .forEach((el) => (el.style.borderColor = "#d9d9d9"));
  debugEl.textContent = "";
}


payButton.onclick = async () => {
  if (!selectedMethod) return;
  statusEl.innerHTML = `<strong>Đang thực hiện:</strong> ${selectedMethod}`;
  statusEl.style.borderColor = "#faad14";
  payButton.disabled = true;
  debugEl.textContent = "";

  if (selectedMethod === "vnpay") {
    try {
      const res = await fetch("/vnpay/create-order", { method: "POST" });
      const data = await res.json();
      debugEl.textContent = JSON.stringify(data, null, 2);

      if (!res.ok) throw new Error(data.message || "Lỗi tạo đơn VNPay");
      if (!data.paymentUrl) throw new Error("Không có paymentUrl từ VNPay");

      // Lưu lại để khi VNPay redirect về, ta biết trước đó đang chờ đơn nào
      sessionStorage.setItem("vnpay_pending_txnRef", data.txnRef);

      statusEl.innerHTML = `<strong>Đang chuyển đến VNPay...</strong>`;
      statusEl.style.borderColor = "#faad14";

      // VNPay yêu cầu điều hướng cả trang sang cổng thanh toán của họ
      window.location.href = data.paymentUrl;
    } catch (err) {
      statusEl.innerHTML = `<strong>Lỗi:</strong> ${err.message}`;
      statusEl.style.borderColor = "#ff4d4f";
      payButton.disabled = false;
      }
    return;
  }

  // stripe
  if (selectedMethod === "stripe") {
    try {
      const res = await fetch("/stripe/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 50000,
          productName: "Ốp lưng Iphone16 - ORD-001",
        }),
      });
      const data = await safeJson(res);
      debugEl.textContent = JSON.stringify(data, null, 2);

      if (!res.ok) throw new Error(data.error || "Lỗi tạo đơn Stripe");

      if (data.url) {
        statusEl.innerHTML = `<strong>Stripe:</strong> Đang chuyển hướng...`;
        statusEl.style.borderColor = "#52c41a";
        window.location.href = data.url; // Chuyển hướng sang Stripe Checkout
      } else {
        throw new Error("Không nhận được url thanh toán từ Stripe");
      }
    } catch (err) {
      statusEl.innerHTML = `<strong>Lỗi Stripe:</strong> ${err.message}`;
      statusEl.style.borderColor = "#ff4d4f";
      payButton.disabled = false;
      }
    return; //
  }
  // end stripe selection

  // paypal
  if (selectedMethod === "paypal") {
    try {
      const res = await fetch("/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "2.00" }), // quy đổi 50.000 VNĐ ra USD sandbox
      });
      const data = await safeJson(res);
      debugEl.textContent = JSON.stringify(data, null, 2);

      if (!res.ok) throw new Error(data.message || "Lỗi tạo đơn PayPal");

      const approveLink = data.links?.find((l) => l.rel === "approve")?.href;

      if (approveLink) {
        statusEl.innerHTML = `<strong>PayPal:</strong> Đang chuyển hướng...`;
        statusEl.style.borderColor = "#52c41a";
        window.location.href = approveLink; // Chuyển hướng sang PayPal Checkout
      } else {
        throw new Error("Không nhận được link thanh toán từ PayPal");
      }
    } catch (err) {
      statusEl.innerHTML = `<strong>Lỗi PayPal:</strong> ${err.message}`;
      statusEl.style.borderColor = "#ff4d4f";
      payButton.disabled = false;
      }
    return;
  }
  // end paypal selection

  if (selectedMethod !== "zalopay") {
    statusEl.innerHTML = `<strong>${selectedMethod.toUpperCase()}</strong> hiện chưa xử lý.`;
    statusEl.style.borderColor = "#ff4d4f";
    payButton.disabled = false;
    return;
  }

  // ZaloPay Gateway redirect flow (giống VNPay/Stripe/PayPal)
  try {
    const res = await fetch("/zalopay/create-order", { method: "POST" });
    const data = await safeJson(res);
    debugEl.textContent = JSON.stringify(data, null, 2);

    if (!res.ok) {
      throw new Error(data.message || data.error || "Lỗi tạo đơn ZaloPay");
    }

    if (!data.orderurl) {
      throw new Error("Không nhận được orderurl từ ZaloPay");
    }

    // Lưu apptransid để kiểm tra khi quay về
    sessionStorage.setItem("zalopay_pending_apptransid", data.apptransid);

    statusEl.innerHTML = `<strong>ZaloPay:</strong> Đang chuyển đến cổng thanh toán...`;
    statusEl.style.borderColor = "#0068ff";

    // Redirect sang ZaloPay Gateway – người dùng chọn phương thức (QR, ATM, Visa/Master)
    window.location.href = data.orderurl;
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.innerHTML = `<strong>Lỗi ZaloPay:</strong> ${err.message}`;
    statusEl.style.borderColor = "#ff4d4f";
    payButton.disabled = false;
    }
};

async function cancelZaloPayOrder(apptransid) {
  if (!apptransid) return;
  zalopayPollingActive = false;
  try {
    await fetch(`/zalopay/cancel/${encodeURIComponent(apptransid)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.warn("[ZaloPay] cancel order failed:", err.message);
  }
}

function clearStripeReturnParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("status");
  url.searchParams.delete("session_id");
  url.searchParams.delete("method");
  window.history.replaceState({}, "", url.pathname + url.search);
}

function showSuccessScreen() {
  clearInterval(countdownInterval);
  mainContent.style.display = "none";
  failureScreen.style.display = "none";
  successScreen.style.display = "block";

  let timeLeft = 5;
  successCountdown.innerText = timeLeft;
  successInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(successInterval);
      resetApp();
    } else {
      successCountdown.innerText = timeLeft;
    }
  }, 1000);
}

function showFailureScreen(message) {
  clearInterval(countdownInterval);
  clearInterval(successInterval);
  mainContent.style.display = "none";
  successScreen.style.display = "none";
  failureScreen.style.display = "block";
  failureMessage.textContent = message || "Giao dịch không thành công.";
}

async function handleStripeReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");
  const method = urlParams.get("method");
  const sessionId = urlParams.get("session_id");

  if (method !== "stripe") return;

  clearStripeReturnParams();

  if (status === "cancel") {
    showFailureScreen("Bạn đã hủy giao dịch.");
    return;
  }

  if (status !== "success") return;

  if (!sessionId) {
    showFailureScreen("Không tìm thấy mã phiên thanh toán.");
    return;
  }

  mainContent.style.display = "block";
  statusEl.style.display = "block";
  statusEl.innerHTML = "<strong>Stripe:</strong> Đang xác minh thanh toán...";
  statusEl.style.borderColor = "#faad14";

  try {
    const res = await fetch(
      `/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,
    );
    const data = await safeJson(res);

    if (res.ok && data.verified) {
      showSuccessScreen();
      return;
    }

    const reason =
      data.payment_status === "unpaid"
        ? "Thanh toán chưa hoàn tất."
        : data.error || "Không thể xác minh thanh toán.";
    showFailureScreen(reason);
  } catch (err) {
    showFailureScreen(err.message || "Không thể xác minh thanh toán.");
  }
}

function clearPaypalReturnParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  url.searchParams.delete("PayerID");
  url.searchParams.delete("method");
  window.history.replaceState({}, "", url.pathname + url.search);
}

async function handlePaypalReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("token"); // PayPal trả về orderId qua param "token"

  if (!orderId) return;

  clearPaypalReturnParams();

  mainContent.style.display = "block";
  statusEl.style.display = "block";
  statusEl.innerHTML = "<strong>PayPal:</strong> Đang xác minh thanh toán...";
  statusEl.style.borderColor = "#faad14";

  try {
    const res = await fetch(`/paypal/capture-order/${orderId}`, {
      method: "POST",
    });
    const data = await safeJson(res);

    if (res.ok && data.status === "COMPLETED") {
      showSuccessScreen();
      return;
    }
    showFailureScreen(data.message || "Không thể xác minh thanh toán.");
  } catch (err) {
    showFailureScreen(err.message || "Không thể xác minh thanh toán.");
  }
}

// Xử lý khi ZaloPay Gateway redirect về trang sau thanh toán
async function handleZaloPayReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get("status");

  if (status !== "zalopay_return") return;

  // Xóa query params khỏi URL
  window.history.replaceState({}, document.title, window.location.pathname);

  const apptransid = sessionStorage.getItem("zalopay_pending_apptransid");
  sessionStorage.removeItem("zalopay_pending_apptransid");

  mainContent.style.display = "block";
  statusEl.style.display = "block";
  statusEl.innerHTML = "<strong>ZaloPay:</strong> Đang xác minh kết quả thanh toán...";
  statusEl.style.borderColor = "#0068ff";

  if (!apptransid) {
    showFailureScreen("Không tìm thấy mã giao dịch ZaloPay.");
    return;
  }

  // Truy vấn trạng thái đơn hàng trực tiếp từ ZaloPay
  try {
    const res = await fetch(`/orderstatus/${encodeURIComponent(apptransid)}`);
    const data = await safeJson(res);

    if (
      res.ok &&
      data.returncode === 1 &&
      (data.status === 1 || data.status === "SUCCESS" || data.isprocessing === false)
    ) {
      resetApp();
      return;
    }

    // Thử lần 2 sau 3 giây (ZaloPay có thể chưa cập nhật ngay)
    await new Promise((r) => setTimeout(r, 500));
    const res2 = await fetch(`/orderstatus/${encodeURIComponent(apptransid)}`);
    const data2 = await safeJson(res2);

    if (
      res2.ok &&
      data2.returncode === 1 &&
      (data2.status === 1 || data2.status === "SUCCESS" || data2.isprocessing === false)
    ) {
      resetApp();
      return;
    }

    // Nếu returncode không phải 1 → thất bại hoặc chưa thanh toán
    const msg =
      data2.returnmessage || data2.message ||
      (data2.returncode === -49 ? "Giao dịch chưa được thanh toán." : "Thanh toán không thành công.");
    showFailureScreen(msg);
  } catch (err) {
    showFailureScreen(err.message || "Không thể xác minh thanh toán ZaloPay.");
  }
}

statusEl.innerHTML = "<strong>Trạng thái:</strong> Chưa chọn phương thức.";
orderUrlEl.innerHTML = "";

// Xử lý khi VNPay redirect trình duyệt quay lại frontend (?vnpay_status=...&vnpay_txnRef=...)
(function handleVNPayReturn() {
  const params = new URLSearchParams(window.location.search);
  const vnpayStatus = params.get("vnpay_status");
  if (!vnpayStatus) return;

  const expectedTxnRef = sessionStorage.getItem("vnpay_pending_txnRef");
  const returnedTxnRef = params.get("vnpay_txnRef");
  sessionStorage.removeItem("vnpay_pending_txnRef");

  // Xóa query string khỏi URL để tránh xử lý lại khi reload
  window.history.replaceState({}, document.title, window.location.pathname);

  if (vnpayStatus === "success") {
    if (expectedTxnRef && returnedTxnRef && expectedTxnRef !== returnedTxnRef) {
      statusEl.innerHTML =
        "<strong>Cảnh báo:</strong> Mã giao dịch trả về không khớp.";
      statusEl.style.borderColor = "#ff4d4f";
      return;
    }
    showSuccessScreen();
  } else if (vnpayStatus === "invalid") {
    statusEl.innerHTML =
      "<strong>Lỗi:</strong> Chữ ký xác thực từ VNPay không hợp lệ.";
    statusEl.style.borderColor = "#ff4d4f";
  } else if (vnpayStatus === "error") {
    statusEl.innerHTML =
      "<strong>Lỗi:</strong> Không xác thực được phản hồi từ VNPay.";
    statusEl.style.borderColor = "#ff4d4f";
  } else {
    statusEl.innerHTML = "<strong>Thanh toán thất bại</strong> qua VNPay.";
    statusEl.style.borderColor = "#ff4d4f";
    }
})();

// Xử lý khi VNPay redirect trình duyệt quay lại frontend (?vnpay_status=...&vnpay_txnRef=...)
(function handleVNPayReturn() {
  const params = new URLSearchParams(window.location.search);
  const vnpayStatus = params.get("vnpay_status");
  if (!vnpayStatus) return;

  const expectedTxnRef = sessionStorage.getItem("vnpay_pending_txnRef");
  const returnedTxnRef = params.get("vnpay_txnRef");
  sessionStorage.removeItem("vnpay_pending_txnRef");

  // Xóa query string khỏi URL để tránh xử lý lại khi reload
  window.history.replaceState({}, document.title, window.location.pathname);

  if (vnpayStatus === "success") {
    if (expectedTxnRef && returnedTxnRef && expectedTxnRef !== returnedTxnRef) {
      statusEl.innerHTML =
        "<strong>Cảnh báo:</strong> Mã giao dịch trả về không khớp.";
      statusEl.style.borderColor = "#ff4d4f";
      return;
    }
    showSuccessScreen();
  } else if (vnpayStatus === "invalid") {
    statusEl.innerHTML =
      "<strong>Lỗi:</strong> Chữ ký xác thực từ VNPay không hợp lệ.";
    statusEl.style.borderColor = "#ff4d4f";
  } else if (vnpayStatus === "error") {
    statusEl.innerHTML =
      "<strong>Lỗi:</strong> Không xác thực được phản hồi từ VNPay.";
    statusEl.style.borderColor = "#ff4d4f";
  } else {
    statusEl.innerHTML = "<strong>Thanh toán thất bại</strong> qua VNPay.";
    statusEl.style.borderColor = "#ff4d4f";
    }
})();

// Gọi trực tiếp thay vì DOMContentLoaded vì Vite ESModule script đã được defer tự động
handleStripeReturn();
handlePaypalReturn();
handleZaloPayReturn();
