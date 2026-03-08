const KYC_BUCKET = "kyc-files";

function kycStatusLabel(status) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "approved":
      return "مقبول";
    case "rejected":
      return "مرفوض";
    default:
      return "لا يوجد طلب";
  }
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

  return { authUser: authData.user, profile };
}

async function loadKycRequest(profile) {
  const kycStatusBox = document.getElementById("kycStatusBox");
  kycStatusBox.innerHTML = `<p class="note">جاري تحميل حالة التوثيق...</p>`;

  const { data, error } = await supabaseClient
    .from("kyc_requests")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
    kycStatusBox.innerHTML = `<p class="note">تعذر تحميل حالة التوثيق</p>`;
    return null;
  }

  if (!data || data.length === 0) {
    kycStatusBox.innerHTML = `
      <div class="deposit-item">
        <div class="deposit-row">
          <span>الحالة</span>
          <strong>لا يوجد طلب بعد</strong>
        </div>
      </div>
    `;
    return null;
  }

  const item = data[0];

  kycStatusBox.innerHTML = `
    <div class="deposit-item">
      <div class="deposit-row">
        <span>الحالة</span>
        <strong>${kycStatusLabel(item.status)}</strong>
      </div>

      <div class="deposit-row">
        <span>الاسم</span>
        <strong>${item.full_name || "-"}</strong>
      </div>

      <div class="deposit-row">
        <span>الدولة</span>
        <strong>${item.country || "-"}</strong>
      </div>

      <div class="deposit-row">
        <span>رقم الهوية</span>
        <strong>${item.id_number || "-"}</strong>
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

  return item;
}

async function uploadFile(userId, file, type) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${type}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(KYC_BUCKET)
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from(KYC_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

async function submitKyc(profile, formData) {
  const { error } = await supabaseClient
    .from("kyc_requests")
    .insert([
      {
        user_id: profile.id,
        full_name: formData.full_name,
        country: formData.country,
        id_number: formData.id_number,
        front_image_url: formData.front_image_url,
        back_image_url: formData.back_image_url,
        selfie_image_url: formData.selfie_image_url,
        status: "pending"
      }
    ]);

  if (error) {
    throw error;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const result = await getCurrentUserProfile();
  if (!result) return;

  const { profile } = result;
  await loadKycRequest(profile);

  const kycForm = document.getElementById("kycForm");
  const kycMessage = document.getElementById("kycMessage");

  kycForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    kycMessage.textContent = "جاري رفع الملفات وإرسال الطلب...";

    const fullName = document.getElementById("kycFullName").value.trim();
    const country = document.getElementById("kycCountry").value.trim();
    const idNumber = document.getElementById("kycIdNumber").value.trim();

    const frontFile = document.getElementById("frontImage").files[0];
    const backFile = document.getElementById("backImage").files[0];
    const selfieFile = document.getElementById("selfieImage").files[0];

    if (!frontFile || !backFile || !selfieFile) {
      kycMessage.textContent = "يرجى رفع جميع الصور المطلوبة";
      return;
    }

    try {
      const frontUrl = await uploadFile(profile.id, frontFile, "front");
      const backUrl = await uploadFile(profile.id, backFile, "back");
      const selfieUrl = await uploadFile(profile.id, selfieFile, "selfie");

      await submitKyc(profile, {
        full_name: fullName,
        country: country,
        id_number: idNumber,
        front_image_url: frontUrl,
        back_image_url: backUrl,
        selfie_image_url: selfieUrl
      });

      kycMessage.textContent = "تم إرسال طلب التوثيق بنجاح";
      kycForm.reset();
      await loadKycRequest(profile);
    } catch (error) {
      console.error(error);
      kycMessage.textContent = "حدث خطأ أثناء إرسال طلب التوثيق";
    }
  });
});
