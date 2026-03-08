const TELEGRAM_BOT_LINK = "https://t.me/";

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

function fillTelegramData(profile) {
  setText("telegramLinkStatus", profile.is_telegram_linked ? "مربوط" : "غير مربوط");
  setText("telegramUsernameValue", profile.telegram_username || "-");
  setText("telegramChatIdValue", profile.telegram_chat_id || "-");

  const usernameInput = document.getElementById("telegramUsernameInput");
  const chatIdInput = document.getElementById("telegramChatIdInput");
  const openBotBtn = document.getElementById("openBotBtn");

  usernameInput.value = profile.telegram_username || "";
  chatIdInput.value = profile.telegram_chat_id || "";
  openBotBtn.href = TELEGRAM_BOT_LINK;
}

async function saveTelegramData(profile, username, chatId) {
  const cleanUsername = username.replace("@", "").trim();

  const { error } = await supabaseClient
    .from("users")
    .update({
      telegram_username: cleanUsername || null,
      telegram_chat_id: chatId || null,
      is_telegram_linked: !!(cleanUsername || chatId)
    })
    .eq("id", profile.id);

  if (error) {
    throw error;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const profile = await getCurrentUserProfile();
  if (!profile) return;

  fillTelegramData(profile);

  const telegramForm = document.getElementById("telegramForm");
  const telegramMessage = document.getElementById("telegramMessage");

  telegramForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    telegramMessage.textContent = "جاري حفظ البيانات...";

    const username = document.getElementById("telegramUsernameInput").value.trim();
    const chatId = document.getElementById("telegramChatIdInput").value.trim();

    try {
      await saveTelegramData(profile, username, chatId);
      telegramMessage.textContent = "تم حفظ بيانات Telegram بنجاح";

      const updatedProfile = await getCurrentUserProfile();
      if (updatedProfile) fillTelegramData(updatedProfile);
    } catch (error) {
      console.error(error);
      telegramMessage.textContent = "حدث خطأ أثناء حفظ بيانات Telegram";
    }
  });
});
