async function getProfile() {

const { data: auth } = await supabaseClient.auth.getUser();

const { data: profile } = await supabaseClient
.from("users")
.select("*")
.eq("auth_user_id", auth.user.id)
.single();

return profile;

}


function copyReferral() {

const text = document.getElementById("referralLink").textContent;

navigator.clipboard.writeText(text);

alert("تم نسخ الرابط");

}


async function loadReferrals(profile){

const { data } = await supabaseClient
.from("users")
.select("*")
.eq("referred_by", profile.referral_code);

const box = document.getElementById("referralList");

if(!data.length){

box.innerHTML = `<p class="note">لا توجد إحالات</p>`;
return;

}

box.innerHTML = data.map(user => `

<div class="deposit-item">

<div class="deposit-row">
<span>الاسم</span>
<strong>${user.full_name}</strong>
</div>

<div class="deposit-row">
<span>التاريخ</span>
<strong>${new Date(user.created_at).toLocaleDateString()}</strong>
</div>

</div>

`).join("");

}


window.addEventListener("DOMContentLoaded", async () => {

const profile = await getProfile();

const link = window.location.origin + "/register.html?ref=" + profile.referral_code;

document.getElementById("referralLink").textContent = link;

loadReferrals(profile);

});
