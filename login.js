const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

async function getOrCreateProfile(user) {
  const { data: existingProfile, error: existingError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("Select profile error:", existingError);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const isAdmin = user.email === "am.alsus1995@gmail.com";

  const { error: insertError } = await supabaseClient
    .from("users")
    .insert([
      {
        auth_user_id: user.id,
        email: user.email,
        role: isAdmin ? "admin" : "user",
        balance: 0,
        full_name: ""
      }
    ]);

  if (insertError) {
    console.error("Insert profile error:", insertError);
    throw insertError;
  }

  const { data: createdProfile, error: createdError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (createdError) {
    console.error("Reload profile error:", createdError);
    throw createdError;
  }

  return createdProfile;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  loginMessage.textContent = "جاري تسجيل الدخول...";

  const email = document.getElementById("login_email").value.trim();
  const password = document.getElementById("login_password").value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginMessage.textContent = error.message;
      return;
    }

    if (!data?.user) {
      loginMessage.textContent = "تعذر تسجيل الدخول";
      return;
    }

    const profile = await getOrCreateProfile(data.user);

    localStorage.setItem("user_profile", JSON.stringify(profile));
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "فشل تحميل الحساب بعد تسجيل الدخول";
  }
});
