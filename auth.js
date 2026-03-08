// ==========================
// Register
// ==========================
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = document.getElementById("registerMessage");
    message.textContent = "جاري إنشاء الحساب...";

    const full_name = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;
    const referral_code = document.getElementById("referral_code").value.trim();

    if (password !== confirm_password) {
      message.textContent = "كلمتا المرور غير متطابقتين";
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name
          }
        }
      });

      if (error) {
        message.textContent = error.message;
        return;
      }

      // تحديث جدول users بعد التسجيل
      if (data?.user) {
        const { error: updateError } = await supabaseClient
          .from("users")
          .update({
            full_name,
            email,
            phone,
            referred_by: referral_code || null
          })
          .eq("auth_user_id", data.user.id);

        if (updateError) {
          console.error(updateError.message);
        }
      }

      message.textContent = "تم إنشاء الحساب بنجاح. تحقق من بريدك الإلكتروني ثم سجل الدخول.";
      registerForm.reset();
    } catch (err) {
      message.textContent = "حدث خطأ غير متوقع";
      console.error(err);
    }
  });
}

// ==========================
// Login
// ==========================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = document.getElementById("loginMessage");
    message.textContent = "جاري تسجيل الدخول...";

    const email = document.getElementById("login_email").value.trim();
    const password = document.getElementById("login_password").value;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        message.textContent = error.message;
        return;
      }

      // جلب بيانات المستخدم
      const { data: profile, error: profileError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", data.user.id)
        .single();

      if (profileError) {
        message.textContent = "تم الدخول لكن تعذر تحميل الحساب";
        return;
      }

      // تخزين بسيط محلي
      localStorage.setItem("user_profile", JSON.stringify(profile));

      // إذا كان أدمن
      if (profile.role === "admin") {
        window.location.href = "index.html";
      } else {
        window.location.href = "index.html";
      }
    } catch (err) {
      message.textContent = "حدث خطأ غير متوقع";
      console.error(err);
    }
  });
}
