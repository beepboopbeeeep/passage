// i18n.js - مدیریت زبان‌ها
const translations = {
    fa: {
        // منو
        dashboard: "داشبورد",
        clients: "کاربران",
        inbounds: "اینباندها",
        settings: "تنظیمات",
        about: "درباره ما",
        
        // داشبورد
        "total-clients": "کل کاربران",
        "active-inbounds": "اینباندهای فعال",
        "active-connections": "اتصالات فعال",
        "activation-days": "روزهای فعال‌سازی",
        
        // کاربران
        username: "نام کاربری",
        protocol: "پروتکل",
        "expiry-date": "تاریخ انقضا",
        status: "وضعیت",
        actions: "عملیات",
        "add-client": "افزودن کاربر",
        "create-user": "ایجاد کاربر",
        
        // اینباندها
        name: "نام",
        port: "پورت",
        network: "شبکه",
        security: "امنیت",
        "add-inbound": "افزودن اینباند",
        "create-inbound": "ایجاد اینباند",
        
        // تنظیمات
        "current-username": "نام کاربری فعلی",
        "new-password": "رمز عبور جدید",
        "confirm-password": "تکرار رمز عبور",
        "save-changes": "ذخیره تغییرات",
        
        // درباره ما
        "about-passage": "درباره Passage",
        "about-desc": "Passage یک پنل مدیریت قدرتمند برای کانفیگ‌های V2Ray روی Cloudflare Workers است.",
        "developed-by": "توسعه یافته توسط تیم Najidevs",
        "github-projects": "پروژه‌های ما در گیت‌هاب:",
        
        // عمومی
        logout: "خروج",
        active: "فعال",
        inactive: "غیرفعال",
        edit: "ویرایش",
        delete: "حذف",
        copy: "کپی"
    },
    en: {
        // منو
        dashboard: "Dashboard",
        clients: "Clients",
        inbounds: "Inbounds",
        settings: "Settings",
        about: "About",
        
        // داشبورد
        "total-clients": "Total Clients",
        "active-inbounds": "Active Inbounds",
        "active-connections": "Active Connections",
        "activation-days": "Activation Days",
        
        // کاربران
        username: "Username",
        protocol: "Protocol",
        "expiry-date": "Expiry Date",
        status: "Status",
        actions: "Actions",
        "add-client": "Add Client",
        "create-user": "Create User",
        
        // اینباندها
        name: "Name",
        port: "Port",
        network: "Network",
        security: "Security",
        "add-inbound": "Add Inbound",
        "create-inbound": "Create Inbound",
        
        // تنظیمات
        "current-username": "Current Username",
        "new-password": "New Password",
        "confirm-password": "Confirm Password",
        "save-changes": "Save Changes",
        
        // درباره ما
        "about-passage": "About Passage",
        "about-desc": "Passage is a powerful management panel for V2Ray configs on Cloudflare Workers.",
        "developed-by": "Developed by Najidevs Team",
        "github-projects": "Our GitHub Projects:",
        
        // عمومی
        logout: "Logout",
        active: "Active",
        inactive: "Inactive",
        edit: "Edit",
        delete: "Delete",
        copy: "Copy"
    }
};

// تابع تغییر زبان
function setLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    
    // به‌روزرسانی تمام عناصر با data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // به‌روزرسانی انتخابگر زبان
    const langSelector = document.getElementById('dashboardLanguage');
    if (langSelector) {
        langSelector.value = lang;
    }
}

// بارگذاری زبان ذخیره شده
function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'fa';
    setLanguage(savedLang);
}

// رویداد تغییر زبان
document.addEventListener('DOMContentLoaded', function() {
    const languageSelector = document.getElementById('dashboardLanguage');
    if (languageSelector) {
        languageSelector.addEventListener('change', function() {
            setLanguage(this.value);
        });
    }
    
    initLanguage();
});