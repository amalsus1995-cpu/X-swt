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
    usersList.innerHTML = `<p class="note">تعذر تحميل المستخدمين</p>`;
    return;
  }

  renderUsers(data || []);
}

function renderUsers(users) {
  const usersList = document.getElementById("usersList");

  if (!users.length) {
    usersList.innerHTML = `<p class="note">لا يوجد مستخدمون</p>`;
    return;
  }

  usersList.innerHTML = users.map((user) => `
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
  `).join("");
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

  const { error } = await supabaseClient
    .from("users")
    .update({ balance: newBalance })
    .eq("id", userId);

  if (error) {
    alert("فشل تعديل الرصيد");
    return;
  }

  alert("تم تعديل الرصيد");
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
    alert("فشل تعديل VIP");
    return;
  }

  alert("تم تعديل VIP");
  await loadUsers();
}

async function quickAddBalance() {
  const email = document.getElementById("quickEmail").value.trim();
  const amount = parseFloat(document.getElementById("quickAmount").value);

  if (!email || isNaN(amount) || amount <= 0) {
    alert("أدخل الإيميل والمبلغ بشكل صحيح");
    return;
  }

  const { data: user, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    alert("المستخدم غير موجود");
    return;
  }

  const newBalance = Number(user.balance || 0) + amount;

  const { error: updateError } = await supabaseClient
    .from("users")
    .update({ balance: newBalance })
    .eq("id", user.id);

  if (updateError) {
    alert("فشل إضافة الرصيد");
    return;
  }

  alert("تمت إضافة الرصيد بنجاح");
  document.getElementById("quickEmail").value = "";
  document.getElementById("quickAmount").value = "";
  await loadUsers();
}

async function createCode() {
  const code = document.getElementById("quickCode").value.trim();

  if (!code) {
    alert("اكتب الكود أولاً");
    return;
  }

  const { error } = await supabaseClient
    .from("bonus_codes")
    .insert([{ code, is_active: true }]);

  if (error) {
    alert("فشل إنشاء الكود");
    return;
  }

  alert("تم إنشاء الكود بنجاح");
  document.getElementById("quickCode").value = "";
}

async function loadDepositsAdmin() {
  const box = document.getElementById("depositsAdminList");
  box.innerHTML = `<p class="note">جاري تحميل الإيداعات...</p>`;

  const { data, error } = await supabaseClient
    .from("deposits")
    .select(`*, users(full_name,email,uid)`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    box.innerHTML = `<p class="note">تعذر تحميل الإيداعات</p>`;
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = `<p class="note">لا توجد إيداعات</p>`;
    return;
  }

  box.innerHTML = data.map((item) => `
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
    </div>
  `).join("");
}

async function loadWithdrawalsAdmin() {
  const box = document.getElementById("withdrawalsAdminList");
  box.innerHTML = `<p class="note">جاري تحميل السحوبات...</p>`;

  const { data, error } = await supabaseClient
    .from("withdrawals")
    .select(`*, users(full_name,email,uid)`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    box.innerHTML = `<p class="note">تعذر تحميل السحوبات</p>`;
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = `<p class="note">لا توجد سحوبات</p>`;
    return;
  }

  box.innerHTML = data.map((item) => `
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
    </div>
  `).join("");
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
