const WITHDRAW_NETWORK = "TRC20";
const MIN_WITHDRAW = 100;
const WITHDRAW_LOCK_DAYS = 14;

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

function formatWithdrawStatus(status) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "approved":
      return "مقبول";
    case "rejected":
      return "مرفوض";
    default:
      return status;
  }
}

function renderWithdrawals(withdrawals) {
  const withdrawalsList = document.getElementById("withdrawalsList");

  if (!withdrawals || withdrawals.length === 0) {
    withdrawalsList.innerHTML = `<p class="note">لا توجد طلبات سحب حتى الآن</p>`;
    return;
  }

  withdrawalsList.innerHTML = withdrawals.map((item) => {
    return `
      <div class="deposit-item">
        <div class="deposit-row">
          <span>المبلغ</span>
          <strong>${Number(item.amount).toLocaleString()} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>الشبكة</span>
          <strong>${item.network || WITHDRAW_NETWORK}</strong>
        </div>

        <div class="deposit-row">
          <span>الحالة</span>
          <strong class="status-${item.status}">${formatWithdrawStatus(item.status)}</strong>
        </div>

        <div class="deposit-row">
          <span>عنوان المحفظة</span>
          <strong class="txid-text">${item.wallet_address}</strong>
        </div>

        <div class="deposit-row">
          <span>التاريخ</span>
          <strong>${new Date(item.created_at).toLocaleString("ar-EG")}</strong>
        </div>

        ${
          item.admin_note
            ? `
          <div class="deposit-row">
            <span>ملاحظة الإدارة</span>
            <strong class="txid-text">${item.admin_note}</strong>
          </div>
        `
            : ""
        }
      </div>
    `;
  }).join("");
}

async function loadWithdrawals(profile) {
  const withdrawalsList = document.getElementById("withdrawalsList");
  withdrawalsList.innerHTML = `<p class="note">جاري تحميل الطلبات...</p>`;

  const { data, error } = await supabaseClient
    .from("withdrawals")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    withdrawalsList.innerHTML = `<p class="note">تعذر تحميل طلبات السحب</p>`;
    return;
  }

  renderWithdrawals(data);
}

async function checkWithdrawLock(profile) {
  const { data, error } = await supabaseClient
    .from("deposits")
    .select("confirmed_at, created_at, status")
    .eq("user_id", profile.id)
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: true });

  if (error) {
    console.error(error);
    return {
      allowed: false,
      reason: "تعذر التحقق من حالة الإيداعات"
    };
  }

  if (!data || data.length === 0) {
    return {
      allowed: false,
      reason: "لا يوجد إيداع مؤكد بعد"
    };
  }

  const firstConfirmedDate = new Date(data[0].confirmed_at || data[0].created_at);
  const now = new Date();
  const diffMs = now - firstConfirmedDate;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < WITHDRAW_LOCK_DAYS) {
    const remainingDays = Math.ceil(WITHDRAW_LOCK_DAYS - diffDays);
    return {
      allowed: false,
      reason: `السحب غير متاح حالياً. باقي ${remainingDays} يوم`
    };
  }

  return {
    allowed: true,
    reason: ""
  };
}

async function createWithdrawal(profile, amount, walletAddress, transactionPassword) {
  if (!profile.transaction_password) {
    throw new Error("يرجى تعيين كلمة مرور المعاملة أولاً");
  }

  if (profile.transaction_password !== transactionPassword) {
    throw new Error("كلمة مرور المعاملة غير صحيحة");
  }

  if (Number(profile.available_withdraw || 0) < amount) {
    throw new Error("الرصيد المتاح للسحب غير كافٍ");
  }

  const { data, error } = await supabaseClient
    .from("withdrawals")
    .insert([
      {
        user_id: profile.id,
        amount: amount,
        network: WITHDRAW_NETWORK,
        wallet_address: walletAddress,
        status: "pending"
      }
    ])
    .select();

  if (error) {
    throw error;
  }

  return data;
}

window.addEventListener("DOMContentLoaded", async () => {
  const profile = await getCurrentUserProfile();
  if (!profile) return;

  const availableBalance = document.getElementById("availableBalance");
  const withdrawForm = document.getElementById("withdrawForm");
  const withdrawMessage = document.getElementById("withdrawMessage");

  availableBalance.textContent = `${Number(profile.available_withdraw || 0).toLocaleString()} USDT`;

  await loadWithdrawals(profile);

  withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    withdrawMessage.textContent = "جاري إرسال طلب السحب...";

    const amount = parseFloat(document.getElementById("withdrawAmount").value);
    const walletAddress = document.getElementById("withdrawWallet").value.trim();
    const transactionPassword = document.getElementById("transactionPassword").value.trim();

    if (isNaN(amount) || amount < MIN_WITHDRAW) {
      withdrawMessage.textContent = `الحد الأدنى للسحب هو ${MIN_WITHDRAW} USDT`;
      return;
    }

    if (!walletAddress) {
      withdrawMessage.textContent = "يرجى إدخال عنوان المحفظة";
      return;
    }

    const lockCheck = await checkWithdrawLock(profile);
    if (!lockCheck.allowed) {
      withdrawMessage.textContent = lockCheck.reason;
      return;
    }

    try {
      await createWithdrawal(profile, amount, walletAddress, transactionPassword);
      withdrawMessage.textContent = "تم إرسال طلب السحب بنجاح";
      withdrawForm.reset();
      await loadWithdrawals(profile);
    } catch (error) {
      console.error(error);
      withdrawMessage.textContent = error.message || "حدث خطأ أثناء إرسال طلب السحب";
    }
  });
});
