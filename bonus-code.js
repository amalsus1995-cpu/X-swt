async function applyBonus(){

const { data: auth } = await supabaseClient.auth.getUser();

const { data: profile } = await supabaseClient
.from("users")
.select("*")
.eq("auth_user_id", auth.user.id)
.single();


const code = document.getElementById("bonusInput").value;


const {data:bonus} = await supabaseClient
.from("bonus_codes")
.select("*")
.eq("code",code)
.eq("is_active",true)
.single();


if(!bonus){

document.getElementById("bonusMessage").innerText = "الكود غير صحيح";

return;

}


const {data:used} = await supabaseClient
.from("code_usage")
.select("*")
.eq("user_id",profile.id)
.eq("code",code)
.single();


if(used){

document.getElementById("bonusMessage").innerText = "لقد استخدمت هذا الكود سابقاً";

return;

}


let balance = Number(profile.balance);


if(balance < 15){

document.getElementById("bonusMessage").innerText = "الحد الأدنى 15 دولار";

return;

}


let profit = (balance / 15) * 1.2;

let newBalance = balance + profit;


await supabaseClient
.from("users")
.update({

balance:newBalance,

total_profit:(profile.total_profit || 0) + profit

})
.eq("id",profile.id);


await supabaseClient
.from("code_usage")
.insert({

user_id:profile.id,

code:code

});


document.getElementById("bonusMessage").innerText =
"تم إضافة الربح: " + profit.toFixed(2);

}
