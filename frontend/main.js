const app = document.createElement("div");
app.style.fontFamily = "Arial, sans-serif";
app.style.background = "#f0f2f5";
app.style.minHeight = "100vh";
app.style.padding = "24px";
app.innerHTML = `
  <div style="max-width:740px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.08);padding:24px;">
    <div id="mainContent">
      <h1>HW Payment</h1>
      <p>Chọn phương thức thanh toán.</p>
      <div id="methods" style="display:grid;grid-template-columns:repeat(2,minmax(140px,1fr));gap:16px"></div>
      <div id="status" style="margin-top:24px;padding:18px;border-radius:12px;background:#fafafa;border:1px solid #e8e8e8;min-height:86px"></div>
      <div id="orderDetails" style="margin-top:16px;padding:18px;border-radius:16px;background:#f6fbff;border:1px solid #dbe8ff;display:none"></div>
      <div id="orderUrl" style="margin-top:12px; font-size:14px; line-height:1.6;"></div>
      <div id="countdown" style="margin-top:12px; font-size:18px; font-weight:bold; color:#ff4d4f; text-align:center; display:none;"></div>
      <div id="qrContainer" style="margin-top:16px;display:flex;justify-content:center"></div>
      <button id="payButton" style="margin-top:16px;padding:12px 20px;border:none;border-radius:10px;background:#1677ff;color:#fff;font-size:16px;cursor:pointer" disabled>Thanh toán</button>
      <button id="resetButton" style="margin-top:16px;margin-left:12px;padding:12px 20px;border:none;border-radius:10px;background:#52c41a;color:#fff;font-size:16px;cursor:pointer">Về trang chủ</button>
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
      <p style="margin-top:12px;"><a href="#" id="failureHomeBtn" style="color:#1677ff; text-decoration:underline; font-weight:bold;">Về ngay</a></p>
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
const resetButton = document.getElementById("resetButton");
const debugEl = document.getElementById("debug");
const mainContent = document.getElementById("mainContent");
const successScreen = document.getElementById("successScreen");
const successCountdown = document.getElementById("successCountdown");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const failureScreen = document.getElementById("failureScreen");
const failureMessage = document.getElementById("failureMessage");
const retryBtn = document.getElementById("retryBtn");
const failureHomeBtn = document.getElementById("failureHomeBtn");
let selectedMethod = null;
let currentApptransid = null;
let countdownInterval = null;
let successInterval = null;
const countdownEl = document.getElementById("countdown");

returnHomeBtn.onclick = (e) => {
  e.preventDefault();
  resetApp();
};

retryBtn.onclick = () => resetApp();

failureHomeBtn.onclick = (e) => {
  e.preventDefault();
  resetApp();
};

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
  currentApptransid = null;
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

resetButton.onclick = resetApp;

payButton.onclick = async () => {
  if (!selectedMethod) return;
  statusEl.innerHTML = `<strong>Đang thực hiện:</strong> ${selectedMethod}`;
  statusEl.style.borderColor = "#faad14";
  payButton.disabled = true;
  resetButton.disabled = true;
  debugEl.textContent = "";

// stripe 
if (selectedMethod === "stripe") {
  try {
    const res = await fetch("/stripe/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 50000, 
        productName: "Stripe Integration Demo"
      })
    });
    const data = await res.json();
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
    resetButton.disabled = false;
  }
  return; // 
}
// end stripe selection

  if (selectedMethod !== "zalopay") {
    statusEl.innerHTML = `<strong>${selectedMethod.toUpperCase()}</strong> hiện chưa xử lý.`;
    statusEl.style.borderColor = "#ff4d4f";
    payButton.disabled = false;
    resetButton.disabled = false;
    return;
  }

  try {
    const res = await fetch("/zalopay/create-order", { method: "POST" });
    const data = await res.json();
    debugEl.textContent = JSON.stringify(data, null, 2);

    if (!res.ok) throw new Error(data.message || "Lỗi tạo đơn");

    currentApptransid = data.apptransid;
    statusEl.style.display = "none"; // Ẩn status box, thay bằng UI ZaloPay đẹp
    qrContainer.innerHTML = "";
    orderUrlEl.innerHTML = ""; // Xóa link gateway

    if (data.orderurl) {
      // Bắt đầu đếm ngược 15 phút
      let timeLeft = 15 * 60;
      clearInterval(countdownInterval);

      const getCountdownHtml = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const mm = minutes.toString().padStart(2, "0");
        const ss = seconds.toString().padStart(2, "0");
        return `
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#666;">
            Giao dịch kết thúc trong
            <span style="display:inline-flex;align-items:center;gap:3px;">
              <span style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:2px 8px;font-size:15px;font-weight:700;color:#111;min-width:28px;text-align:center;">${mm}</span>
              <span style="font-weight:700;color:#111;">:</span>
              <span style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;padding:2px 8px;font-size:15px;font-weight:700;color:#111;min-width:28px;text-align:center;">${ss}</span>
            </span>
          </span>`;
      };

      // QR image
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.orderurl)}&margin=10`;

      orderDetailsEl.style.display = "block";
      orderDetailsEl.style.padding = "0";
      orderDetailsEl.style.background = "transparent";
      orderDetailsEl.style.border = "none";
      orderDetailsEl.innerHTML = `
        <div style="display:flex;gap:0;border-radius:16px;overflow:hidden;border:1px solid #e8edf2;background:#fff;">
          <!-- Cột trái: Thông tin đơn hàng -->
          <div style="flex:0 0 300px;padding:28px 24px;border-right:1px solid #e8edf2;background:#fff;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
              <svg width="90" height="28" viewBox="0 0 90 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="22" font-family="Arial Black,Arial" font-weight="900" font-size="22" fill="#0068ff">Zalo</text>
                <text x="52" y="22" font-family="Arial Black,Arial" font-weight="900" font-size="22" fill="#00c853">pay</text>
              </svg>
              <span style="font-size:13px;color:#888;">Merchant Demo V1</span>
            </div>

            <div style="margin-bottom:14px;">
              <p style="margin:0;font-size:13px;color:#888;">Giá trị đơn hàng</p>
              <p style="margin:4px 0 0;font-size:14px;color:#333;">₫50.000</p>
            </div>
            <div style="margin-bottom:14px;">
              <p style="margin:0;font-size:13px;color:#888;">Số tiền thanh toán</p>
              <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111;">₫50.000</p>
            </div>
            <div style="margin-bottom:14px;">
              <p style="margin:0;font-size:13px;color:#888;">Mã giao dịch</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111;">${data.apptransid}</p>
            </div>
            <div style="margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#888;">Nội dung</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111;">ZaloPay Integration Demo</p>
            </div>

            <!-- Countdown box -->
            <div id="countdownBox" style="background:#fffbf0;border:1px solid #ffe7a0;border-radius:10px;padding:10px 14px;display:inline-block;">
              ${getCountdownHtml()}
            </div>
          </div>

          <!-- Cột phải: QR code -->
          <div style="flex:1;padding:28px 24px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;">
            <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#111;">Quét QR để thanh toán</p>
            <div style="position:relative;width:230px;height:230px;">
              <!-- Corner brackets -->
              <div style="position:absolute;top:0;left:0;width:22px;height:22px;border-top:3px solid #0068ff;border-left:3px solid #0068ff;border-radius:4px 0 0 0;"></div>
              <div style="position:absolute;top:0;right:0;width:22px;height:22px;border-top:3px solid #0068ff;border-right:3px solid #0068ff;border-radius:0 4px 0 0;"></div>
              <div style="position:absolute;bottom:0;left:0;width:22px;height:22px;border-bottom:3px solid #0068ff;border-left:3px solid #0068ff;border-radius:0 0 0 4px;"></div>
              <div style="position:absolute;bottom:0;right:0;width:22px;height:22px;border-bottom:3px solid #0068ff;border-right:3px solid #0068ff;border-radius:0 0 4px 0;"></div>
              <img id="qrCodeImg" src="${qrUrl}" alt="QR code ZaloPay"
                style="width:100%;height:100%;object-fit:contain;border-radius:4px;" />
            </div>
            <p style="margin:16px 0 6px;font-size:13px;color:#888;text-align:center;">Mở ứng dụng ZaloPay để quét mã</p>
          </div>
        </div>
      `;

      const countdownBox = document.getElementById("countdownBox");
      const updateCountdown = () => {
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          if (countdownBox) countdownBox.innerHTML = `<span style="color:#ff4d4f;font-weight:700;">⏰ Giao dịch đã hết hạn</span>`;
          statusEl.style.display = "block";
          statusEl.innerHTML = "<strong>Thanh toán thất bại:</strong> Quá thời gian quy định";
          statusEl.style.borderColor = "#ff4d4f";
          resetButton.disabled = false;
          return;
        }
        timeLeft--;
        if (countdownBox) countdownBox.innerHTML = getCountdownHtml();
      };

      countdownInterval = setInterval(updateCountdown, 1000);

    } else {
      orderDetailsEl.style.display = "none";
      statusEl.style.display = "block";
      statusEl.innerHTML = "<strong>Lỗi:</strong> Không có orderurl từ ZaloPay.";
    }

    await pollStatus(currentApptransid);
  } catch (err) {
    statusEl.style.display = "block";
    statusEl.innerHTML = `<strong>Lỗi:</strong> ${err.message}`;
    statusEl.style.borderColor = "#ff4d4f";
    payButton.disabled = false;
    resetButton.disabled = false;
  }
};

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
      `/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
    );
    const data = await res.json();

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

async function pollStatus(apptransid) {
  for (let i = 0; i < 450; i++) {
    let isPending = true; // mặc định coi là đang chờ

    try {
      const res = await fetch(`/payment-status/${apptransid}`);
      const data = await res.json();
      debugEl.textContent += `\n=== Poll ${i + 1} ===\n${JSON.stringify(data, null, 2)}`;

      if (data.status === "success") {
        showSuccessScreen();
        return;
      } else if (data.status === "failed") {
        clearInterval(countdownInterval);
        countdownEl.style.display = "none";
        statusEl.innerHTML = `<strong>Thanh toán thất bại</strong> ${data.returnmessage || ""}`;
        statusEl.style.borderColor = "#ff4d4f";
        resetButton.disabled = false;
        return;
      } else if (data.status === "processing") {
        statusEl.innerHTML = `<strong>Giao dịch đang xử lý</strong> Vui lòng chờ callback.`;
        statusEl.style.borderColor = "#faad14";
        isPending = true; // tiếp tục chờ callback
      } else {
        // "pending" hoặc "unknown" = chưa có callback, tiếp tục chờ
        statusEl.innerHTML = `<strong>Đang chờ thanh toán...</strong> Vui lòng quét mã QR hoặc click vào link.`;
        statusEl.style.borderColor = "#faad14";
        isPending = true;
      }
    } catch (e) {
      console.warn(`Poll ${i + 1} lỗi:`, e.message);
    }

    // Chờ 2 giây rồi mới fallback qua /orderstatus
    // (KHÔNG gọi ngay vì ZaloPay trả TRANS_INFO_NOT_FOUND nếu user chưa thanh toán)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Fallback: hỏi trực tiếp ZaloPay (chỉ sau khi đã chờ)
    try {
      const orderStatus = await fetch(`/orderstatus/${apptransid}`);
      if (orderStatus.ok) {
        const statusData = await orderStatus.json();
        debugEl.textContent += `\n=== Fallback orderstatus ${i + 1} ===\n${JSON.stringify(statusData, null, 2)}`;

        if (statusData.returncode === 1) {
          if (statusData.status === 1 || statusData.status === "SUCCESS" || statusData.isprocessing === false) {
            showSuccessScreen();
            return;
          }
          if (statusData.status === 2 || statusData.status === "PROCESSING" || statusData.isprocessing === true) {
            statusEl.innerHTML = `<strong>Giao dịch đang xử lý</strong> Vui lòng chờ callback.`;
            statusEl.style.borderColor = "#faad14";
            // tiếp tục vòng lặp
          }
        }
        // returncode khác 1 (kể cả -49) = chưa tìm thấy / chưa thanh toán → tiếp tục chờ
      }
    } catch (e) {
      console.warn(`Fallback orderstatus ${i + 1} lỗi:`, e.message);
    }
  }

  statusEl.innerHTML =
    "<strong>Chưa nhận callback.</strong> Vui lòng kiểm tra lại sau.";
  statusEl.style.borderColor = "#faad14";
  resetButton.disabled = false;
}

statusEl.innerHTML = "<strong>Trạng thái:</strong> Chưa chọn phương thức.";
orderUrlEl.innerHTML = "";


window.addEventListener("DOMContentLoaded", () => {
  handleStripeReturn();
});
