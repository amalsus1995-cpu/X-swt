async function getProfile(){

const { data: auth } = await supabaseClient.auth.getUser();

const { data: profile } = await supabaseClient
.from("users")
.select("*")
.eq("auth_user_id", auth.user.id)
.single();

return profile;

}


async function loadDeposits(profile){

const { data } = await supabaseClient
.from("deposits")
.select("*")
.eq("user_id", profile.id)
.order("created_at",{ascending:false});

const box = document.getElementById("depositHistory");

if(!data.length){

box.innerHTML = `<p class="note">لا يوجد إيداعات</p>`;
return;

}

box.innerHTML = data.map(d => `

<div class="deposit-item">

<div class="deposit-row">
<span>المبلغ</span>
<strong>${d.amount}</strong>
</div>

<div class="deposit-row">
<span>الحالة</span>
<strong>${d.status}</strong>
</div>

</div>

`).join("");

}


async function loadWithdraw(profile){

const { data } = await supabaseClient
.from("withdrawals")
.select("*")
.eq("user_id", profile.id)
.order("created_at",{ascending:false});

const box = document.getElementById("withdrawHistory");

if(!data.length){

box.innerHTML = `<p class="note">لا يوجد سحوبات</p>`;
return;

}

box.innerHTML = data.map(w => `

<div class="deposit-item">

<div class="deposit-row">
<span>المبلغ</span>
<strong>${w.amount}</strong>
</div>

<div class="deposit-row">
<span>الحالة</span>
<strong>${w.status}</strong>
</div>

</div>

`).join("");

}


window.addEventListener("DOMContentLoaded", async () => {

const profile = await getProfile();

loadDeposits(profile);
loadWithdraw(profile);

});
