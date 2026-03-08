async function getCurrentUserProfile() {

const { data: authData } = await supabaseClient.auth.getUser();

if (!authData?.user) {
window.location.href = "login.html";
return null;
}

const { data: profile } = await supabaseClient
.from("users")
.select("*")
.eq("auth_user_id", authData.user.id)
.single();

return profile;
}


async function updateTransactionPassword(profile, newPassword) {

const { error } = await supabaseClient
.from("users")
.update({
transaction_password: newPassword
})
.eq("id", profile.id);

if (error) throw error;

}


window.addEventListener("DOMContentLoaded", async () => {

const profile = await getCurrentUserProfile();
if (!profile) return;

const form = document.getElementById("transactionPasswordForm");
const message = document.getElementById("passwordMessage");

form.addEventListener("submit", async (e) => {

e.preventDefault();

message.textContent = "جاري التحديث...";

const oldPassword = document.getElementById("oldPassword").value;
const newPassword = document.getElementById("newPassword").value;
const confirmPassword = document.getElementById("confirmPassword").value;


if (profile.transaction_password !== oldPassword) {

message.textContent = "كلمة المرور القديمة غير صحيحة";
return;

}

if (newPassword !== confirmPassword) {

message.textContent = "كلمة المرور الجديدة غير متطابقة";
return;

}

try {

await updateTransactionPassword(profile, newPassword);

message.textContent = "تم تغيير كلمة المرور بنجاح";

form.reset();

} catch (error) {

message.textContent = "حدث خطأ أثناء التحديث";

}

});

});
