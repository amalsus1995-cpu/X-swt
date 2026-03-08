const HOME_WALLET = "TRVTeYxfSg5v9sJfH1HWdxjZaJYCZmJqsu";

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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
    alert("تعذر تحميل بيانات المستخدم");
    window.location.href = "login.html";
    return null;
  }

  return profile;
}

async function copyWalletAddress() {
  try {
    await navigator.clipboard.writeText(HOME_WALLET);
    alert("تم نسخ عنوان المحفظة بنجاح");
  } catch (error) {
    alert("تعذر نسخ عنوان المحفظة");
  }
}

function fillHomeData(profile) {
  const userName = profile.full_name || "مستخدم";
  const balance = formatMoney(profile.balance);
  const profit = formatMoney(profile.total_profit);
  const investment = formatMoney(profile.investment_balance);
  const withdraw = formatMoney(profile.available_withdraw);

  setText("welcomeText", `أهلاً ${userName}`);
  setText("heroUserName", `مرحباً ${userName}`);
  setText("balanceValue", balance);
  setText("profitValue", profit);
  setText("investmentValue", investment);
  setText("withdrawValue", withdraw);
}

window.addEventListener("DOMContentLoaded", async () => {
  const profile = await getCurrentUserProfile();
  if (!profile) return;

  fillHomeData(profile);

  const copyWalletBtn = document.getElementById("copyWalletBtn");
  if (copyWalletBtn) {
    copyWalletBtn.addEventListener("click", copyWalletAddress);
  }
});
