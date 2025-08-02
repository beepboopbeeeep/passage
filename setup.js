/**
 * اسکریپت تنظیم اطلاعات اولیه برای Passage Worker
 * 
 * برای اجرای این اسکریپت:
 * 1. wrangler login
 * 2. wrangler kv:key put --binding=AUTH "admin" '{"username":"admin","password":"admin"}'
 */

// اطلاعات پیش‌فرض ادمین
const defaultAdmin = {
  username: "admin",
  password: "admin" // در محیط واقعی حتماً این را تغییر دهید
};

// نمایش اطلاعات پیش‌فرض
console.log("اطلاعات ادمین پیش‌فرض:");
console.log(JSON.stringify(defaultAdmin, null, 2));

console.log("\nدستور برای تنظیم در KV Storage:");
console.log('wrangler kv:key put --binding=AUTH "admin" \'' + JSON.stringify(defaultAdmin) + '\'');

console.log("\nدستورات برای ایجاد KV Namespaces:");
console.log("wrangler kv:namespace create \"AUTH\"");
console.log("wrangler kv:namespace create \"USERS\"");
console.log("wrangler kv:namespace create \"INBOUNDS\"");
console.log("wrangler kv:namespace create \"TOKENS\"");
console.log("wrangler kv:namespace create \"PROXY_CONFIGS\"");

console.log("\nپس از ایجاد KV Namespaces، شناسه‌های ایجاد شده را در فایل wrangler.toml وارد کنید.");