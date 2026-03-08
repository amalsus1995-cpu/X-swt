function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function getVipLabel(vipLevel, balance) {
  if (Number(vipLevel || 0) > 0) {
    return `VIP${vipLevel}`;
  }

  if (Number(balance || 0) >= 1000) {
    return "VIP1";
  }

  return "VIP0";
}

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
    alert("تعذر تحميل بيانات الحساب");
    window.location.href = "login.html";
    return null;
  }

  return { authUser: authData.user, profile };
}

function fillAccountData(profile) {
  const fullName = profile.full_name || "مستخدم";
  const email = profile.email || "-";
  const uid = profile.uid || "--";
  const vipLabel = getVipLabel(profile.vip_level, profile.balance);
  const firstLetter = fullName.trim().charAt(0).toUpperCase() || "U";

  setText("userName", fullName);
  setText("userEmail", email);
  setText("avatarLetter", firstLetter);
  setText("userUid", `UID: ${uid}`);
  setText("vipLevel", vipLabel);

  setText("balanceValue", formatMoney(profile.balance));
  setText("investmentBalanceValue", formatMoney(profile.investment_balance));
  setText("totalProfitValue", formatMoney(profile.total_profit));
  setText("availableWithdrawValue", formatMoney(profile.available_withdraw));

  setText("accountStatus", profile.is_active ? "نشط" : "موقوف");
  setText("verifyStatus", profile.is_verified ? "موثق" : "غير موثق");
  setText("telegramStatus", profile.is_telegram_linked ? "مربوط" : "غير مربوط");
  setText("roleStatus", profile.role || "user");

  const adminPanelLink = document.getElementById("adminPanelLink");
  if (profile.role === "admin") {
    adminPanelLink.style.display = "block";
    adminPanelLink.href = "admin.html";
  }
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("تعذر تسجيل الخروج");
    return;
  }

  localStorage.removeItem("user_profile");
  window.location.href = "login.html";
}

window.addEventListener("DOMContentLoaded", async () => {
  const data = await getCurrentUserProfile();
  if (!data) return;

  fillAccountData(data.profile);

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await logoutUser();
  });
});
