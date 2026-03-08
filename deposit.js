const DEPOSIT_WALLET = "TRVTeYxfSg5v9sJfH1HWdxjZaJYCZmJqsu";
const DEPOSIT_NETWORK = "TRC20";
const MIN_DEPOSIT = 500;

async function getCurrentUserProfile() {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData?.user) {
    window.location.href = "login.html";
    return null;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profileError || !profile) {
    alert("تعذر تحميل بيانات المستخدم");
    window.location.href = "login.html";
    return null;
  }

  return profile;
}

async function copyWalletAddress() {
  try {
    await navigator.clipboard.writeText(DEPOSIT_WALLET);
    alert("تم نسخ عنوان المحفظة بنجاح");
  } catch (error) {
    alert("تعذر نسخ عنوان المحفظة");
  }
}

function formatDepositStatus(status) {
  switch (status) {
    case "pending":
      return "بانتظار الدفع";
    case "checking":
      return "جارٍ التحقق";
    case "confirmed":
      return "مكتمل";
    case "rejected":
      return "مرفوض";
    default:
      return status;
  }
}

function renderDeposits(deposits) {
  const depositsList = document.getElementById("depositsList");

  if (!deposits || deposits.length === 0) {
    depositsList.innerHTML = `<p class="note">لا توجد طلبات إيداع حتى الآن</p>`;
    return;
  }

  depositsList.innerHTML = deposits.map((item) => {
    return `
      <div class="deposit-item">
        <div class="deposit-row">
          <span>المبلغ</span>
          <strong>${Number(item.amount).toLocaleString()} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>الشبكة</span>
          <strong>${item.network || DEPOSIT_NETWORK}</strong>
        </div>

        <div class="deposit-row">
          <span>الحالة</span>
          <strong class="status-${item.status}">${formatDepositStatus(item.status)}</strong>
        </div>

        <div class="deposit-row">
          <span>النقاط المضافة</span>
          <strong>${Number(item.points_added || 0).toLocaleString()}</strong>
        </div>

        <div class="deposit-row">
          <span>التاريخ</span>
          <strong>${new Date(item.created_at).toLocaleString("ar-EG")}</strong>
        </div>

        ${
          item.txid
            ? `
          <div class="deposit-row">
            <span>TxID</span>
            <strong class="txid-text">${item.txid}</strong>
          </div>
        `
            : ""
        }
      </div>
    `;
  }).join("");
}

async function loadUserDeposits(profile) {
  const depositsList = document.getElementById("depositsList");
  depositsList.innerHTML = `<p class="note">جاري تحميل الطلبات...</p>`;

  const { data, error } = await supabaseClient
    .from("deposits")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    depositsList.innerHTML = `<p class="note">تعذر تحميل طلبات الإيداع</p>`;
    return;
  }

  renderDeposits(data);
}

async function createDepositRequest(profile, amount, txid) {
  const { data, error } = await supabaseClient
    .from("deposits")
    .insert([
      {
        user_id: profile.id,
        amount: amount,
        network: DEPOSIT_NETWORK,
        wallet_address: DEPOSIT_WALLET,
        txid: txid || null,
        status: "pending",
        points_added: 0
      }
    ])
    .select();

  if (error) {
    throw error;
  }

  return data;
}

window.addEventListener("DOMContentLoaded", async () => {
  const copyWalletBtn = document.getElementById("copyWalletBtn");
  const depositForm = document.getElementById("depositForm");
  const depositMessage = document.getElementById("depositMessage");

  copyWalletBtn.addEventListener("click", copyWalletAddress);

  const profile = await getCurrentUserProfile();
  if (!profile) return;

  await loadUserDeposits(profile);

  depositForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    depositMessage.textContent = "جاري إنشاء طلب الإيداع...";

    const amount = parseFloat(document.getElementById("depositAmount").value);
    const txid = document.getElementById("depositTxid").value.trim();

    if (isNaN(amount) || amount < MIN_DEPOSIT) {
      depositMessage.textContent = `الحد الأدنى للإيداع هو ${MIN_DEPOSIT} USDT`;
      return;
    }

    try {
      await createDepositRequest(profile, amount, txid);
      depositMessage.textContent = "تم إنشاء طلب الإيداع بنجاح";
      depositForm.reset();
      await loadUserDeposits(profile);
    } catch (error) {
      console.error(error);
      depositMessage.textContent = "حدث خطأ أثناء إنشاء طلب الإيداع";
    }
  });
});
