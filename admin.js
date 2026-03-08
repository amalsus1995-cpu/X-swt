function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function getAdminProfile() {
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
    alert("تعذر تحميل حساب الأدمن");
    window.location.href = "login.html";
    return null;
  }

  if (profile.role !== "admin") {
    alert("ليس لديك صلاحية دخول لوحة الأدمن");
    window.location.href = "account.html";
    return null;
  }

  return profile;
}

async function loadStats() {
  const [
    usersResult,
    depositsResult,
    withdrawalsResult,
    pendingWithdrawalsResult
  ] = await Promise.all([
    supabaseClient.from("users").select("*", { count: "exact", head: true }),
    supabaseClient.from("deposits").select("*", { count: "exact", head: true }),
    supabaseClient.from("withdrawals").select("*", { count: "exact", head: true }),
    supabaseClient.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending")
  ]);

  setText("usersCount", usersResult.count || 0);
  setText("depositsCount", depositsResult.count || 0);
  setText("withdrawalsCount", withdrawalsResult.count || 0);
  setText("pendingWithdrawalsCount", pendingWithdrawalsResult.count || 0);
}

async function loadUsers() {
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = `<p class="note">جاري تحميل المستخدمين...</p>`;

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    usersList.innerHTML = `<p class="note">تعذر تحميل المستخدمين</p>`;
    return;
  }

  renderUsers(data);
}

function renderUsers(users) {
  const usersList = document.getElementById("usersList");

  if (!users || users.length === 0) {
    usersList.innerHTML = `<p class="note">لا يوجد مستخدمون</p>`;
    return;
  }

  usersList.innerHTML = users.map((user) => {
    return `
      <div class="admin-card" data-user-card>
        <div class="admin-card-top">
          <div>
            <h3>${user.full_name || "مستخدم"}</h3>
            <p>${user.email || "-"}</p>
          </div>
          <span class="mini-badge">${user.role || "user"}</span>
        </div>

        <div class="deposit-row">
          <span>UID</span>
          <strong>${user.uid || "--"}</strong>
        </div>

        <div class="deposit-row">
          <span>الرصيد</span>
          <strong>${formatMoney(user.balance)} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>الرصيد الاستثماري</span>
          <strong>${formatMoney(user.investment_balance)} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>المتاح للسحب</span>
          <strong>${formatMoney(user.available_withdraw)} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>VIP</span>
          <strong>VIP${user.vip_level || 0}</strong>
        </div>

        <div class="deposit-row">
          <span>الحالة</span>
          <strong>${user.is_active ? "نشط" : "موقوف"}</strong>
        </div>

        <div class="admin-actions">
          <button class="small-btn" onclick="changeBalance('${user.id}', ${Number(user.balance || 0)}, 'add')">زيادة رصيد</button>
          <button class="small-btn danger-btn" onclick="changeBalance('${user.id}', ${Number(user.balance || 0)}, 'subtract')">خصم رصيد</button>
          <button class="small-btn" onclick="changeVip('${user.id}', ${Number(user.vip_level || 0)})">تعديل VIP</button>
        </div>
      </div>
    `;
  }).join("");
}

async function changeBalance(userId, currentBalance, mode) {
  const amountText = prompt(mode === "add" ? "كم تريد زيادة الرصيد؟" : "كم تريد خصم الرصيد؟");
  if (!amountText) return;

  const amount = parseFloat(amountText);
  if (isNaN(amount) || amount <= 0) {
    alert("أدخل مبلغ صحيح");
    return;
  }

  let newBalance = currentBalance;
  if (mode === "add") {
    newBalance += amount;
  } else {
    newBalance -= amount;
    if (newBalance < 0) newBalance = 0;
  }

  const vipLevel = newBalance >= 1000 ? 1 : 0;

  const { error } = await supabaseClient
    .from("users")
    .update({
      balance: newBalance,
      vip_level: vipLevel
    })
    .eq("id", userId);

  if (error) {
    console.error(error);
    alert("فشل تعديل الرصيد");
    return;
  }

  alert("تم تعديل الرصيد بنجاح");
  await loadUsers();
}

async function changeVip(userId, currentVip) {
  const vipText = prompt("أدخل مستوى VIP الجديد", currentVip);
  if (vipText === null) return;

  const vipLevel = parseInt(vipText, 10);
  if (isNaN(vipLevel) || vipLevel < 0) {
    alert("مستوى VIP غير صحيح");
    return;
  }

  const { error } = await supabaseClient
    .from("users")
    .update({ vip_level: vipLevel })
    .eq("id", userId);

  if (error) {
    console.error(error);
    alert("فشل تعديل VIP");
    return;
  }

  alert("تم تعديل VIP بنجاح");
  await loadUsers();
}

async function loadDepositsAdmin() {
  const depositsAdminList = document.getElementById("depositsAdminList");
  depositsAdminList.innerHTML = `<p class="note">جاري تحميل الإيداعات...</p>`;

  const { data, error } = await supabaseClient
    .from("deposits")
    .select(`
      *,
      users(id, full_name, email, uid, balance, investment_balance, available_withdraw, vip_level)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    depositsAdminList.innerHTML = `<p class="note">تعذر تحميل الإيداعات</p>`;
    return;
  }

  if (!data || data.length === 0) {
    depositsAdminList.innerHTML = `<p class="note">لا توجد إيداعات</p>`;
    return;
  }

  depositsAdminList.innerHTML = data.map((item) => {
    return `
      <div class="admin-card">
        <div class="admin-card-top">
          <div>
            <h3>${item.users?.full_name || "مستخدم"}</h3>
            <p>${item.users?.email || "-"}</p>
          </div>
          <span class="mini-badge">${item.status}</span>
        </div>

        <div class="deposit-row">
          <span>UID</span>
          <strong>${item.users?.uid || "--"}</strong>
        </div>

        <div class="deposit-row">
          <span>المبلغ</span>
          <strong>${formatMoney(item.amount)} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>الشبكة</span>
          <strong>${item.network || "TRC20"}</strong>
        </div>

        <div class="deposit-row">
          <span>النقاط المضافة</span>
          <strong>${formatMoney(item.points_added)}</strong>
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

        <div class="admin-actions">
          <button class="small-btn" onclick="confirmDeposit('${item.id}', '${item.user_id}', ${Number(item.amount || 0)}, '${item.status}')">تأكيد الإيداع</button>
          <button class="small-btn danger-btn" onclick="rejectDeposit('${item.id}', '${item.status}')">رفض الإيداع</button>
        </div>
      </div>
    `;
  }).join("");
}

async function confirmDeposit(depositId, userId, amount, currentStatus) {
  if (currentStatus === "confirmed") {
    alert("هذا الإيداع مؤكد مسبقاً");
    return;
  }

  if (currentStatus === "rejected") {
    alert("هذا الإيداع مرفوض مسبقاً");
    return;
  }

  const note = prompt("ملاحظة الإدارة (اختياري)") || null;

  const { data: user, error: userError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.error(userError);
    alert("تعذر تحميل بيانات المستخدم");
    return;
  }

  const pointsToAdd = Number(amount || 0);
  const newBalance = Number(user.balance || 0) + pointsToAdd;
  const newInvestmentBalance = Number(user.investment_balance || 0) + pointsToAdd;
  const newAvailableWithdraw = Number(user.available_withdraw || 0) + pointsToAdd;
  const newVipLevel = newBalance >= 1000 ? 1 : Number(user.vip_level || 0);

  const { error: depositError } = await supabaseClient
    .from("deposits")
    .update({
      status: "confirmed",
      points_added: pointsToAdd,
      admin_note: note,
      confirmed_at: new Date().toISOString()
    })
    .eq("id", depositId);

  if (depositError) {
    console.error(depositError);
    alert("فشل تأكيد الإيداع");
    return;
  }

  const { error: userUpdateError } = await supabaseClient
    .from("users")
    .update({
      balance: newBalance,
      investment_balance: newInvestmentBalance,
      available_withdraw: newAvailableWithdraw,
      vip_level: newVipLevel
    })
    .eq("id", userId);

  if (userUpdateError) {
    console.error(userUpdateError);
    alert("تم تأكيد الإيداع لكن فشل تحديث رصيد المستخدم");
    return;
  }

  alert("تم تأكيد الإيداع وإضافة الرصيد بنجاح");
  await loadStats();
  await loadUsers();
  await loadDepositsAdmin();
}

async function rejectDeposit(depositId, currentStatus) {
  if (currentStatus === "confirmed") {
    alert("لا يمكن رفض إيداع مؤكد");
    return;
  }

  if (currentStatus === "rejected") {
    alert("هذا الإيداع مرفوض مسبقاً");
    return;
  }

  const note = prompt("سبب الرفض") || "تم رفض الإيداع من الإدارة";

  const { error } = await supabaseClient
    .from("deposits")
    .update({
      status: "rejected",
      admin_note: note
    })
    .eq("id", depositId);

  if (error) {
    console.error(error);
    alert("فشل رفض الإيداع");
    return;
  }

  alert("تم رفض الإيداع");
  await loadStats();
  await loadDepositsAdmin();
}

async function loadWithdrawalsAdmin() {
  const withdrawalsAdminList = document.getElementById("withdrawalsAdminList");
  withdrawalsAdminList.innerHTML = `<p class="note">جاري تحميل السحوبات...</p>`;

  const { data, error } = await supabaseClient
    .from("withdrawals")
    .select(`
      *,
      users(full_name, email, uid)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    withdrawalsAdminList.innerHTML = `<p class="note">تعذر تحميل السحوبات</p>`;
    return;
  }

  if (!data || data.length === 0) {
    withdrawalsAdminList.innerHTML = `<p class="note">لا توجد سحوبات</p>`;
    return;
  }

  withdrawalsAdminList.innerHTML = data.map((item) => {
    return `
      <div class="admin-card">
        <div class="admin-card-top">
          <div>
            <h3>${item.users?.full_name || "مستخدم"}</h3>
            <p>${item.users?.email || "-"}</p>
          </div>
          <span class="mini-badge">${item.status}</span>
        </div>

        <div class="deposit-row">
          <span>UID</span>
          <strong>${item.users?.uid || "--"}</strong>
        </div>

        <div class="deposit-row">
          <span>المبلغ</span>
          <strong>${formatMoney(item.amount)} USDT</strong>
        </div>

        <div class="deposit-row">
          <span>المحفظة</span>
          <strong class="txid-text">${item.wallet_address}</strong>
        </div>

        <div class="deposit-row">
          <span>التاريخ</span>
          <strong>${new Date(item.created_at).toLocaleString("ar-EG")}</strong>
        </div>

        <div class="admin-actions">
          <button class="small-btn" onclick="approveWithdrawal('${item.id}')">قبول</button>
          <button class="small-btn danger-btn" onclick="rejectWithdrawal('${item.id}')">رفض</button>
        </div>
      </div>
    `;
  }).join("");
}

async function approveWithdrawal(withdrawalId) {
  const note = prompt("ملاحظة الإدارة (اختياري)") || null;

  const { error } = await supabaseClient
    .from("withdrawals")
    .update({
      status: "approved",
      admin_note: note,
      processed_at: new Date().toISOString()
    })
    .eq("id", withdrawalId);

  if (error) {
    console.error(error);
    alert("فشل قبول طلب السحب");
    return;
  }

  alert("تم قبول طلب السحب");
  await loadWithdrawalsAdmin();
  await loadStats();
}

async function rejectWithdrawal(withdrawalId) {
  const note = prompt("سبب الرفض") || "تم الرفض من الإدارة";

  const { error } = await supabaseClient
    .from("withdrawals")
    .update({
      status: "rejected",
      admin_note: note,
      processed_at: new Date().toISOString()
    })
    .eq("id", withdrawalId);

  if (error) {
    console.error(error);
    alert("فشل رفض طلب السحب");
    return;
  }

  alert("تم رفض طلب السحب");
  await loadWithdrawalsAdmin();
  await loadStats();
}

function enableUserSearch() {
  const searchInput = document.getElementById("userSearch");

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const cards = document.querySelectorAll("[data-user-card]");

    cards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(term) ? "block" : "none";
    });
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  const admin = await getAdminProfile();
  if (!admin) return;

  await loadStats();
  await loadUsers();
  await loadDepositsAdmin();
  await loadWithdrawalsAdmin();
  enableUserSearch();
});
