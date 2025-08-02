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
        expired: "منقضی شده",
        edit: "ویرایش",
        delete: "حذف",
        copy: "کپی",
        qr: "QR کد",
        "qr-code": "QR Code کانفیگ",
        
        // خطاها
        "error-network": "خطا در ارتباط با سرور",
        "error-unauthorized": "دسترسی غیرمجاز",
        "error-not-found": "داده مورد نظر یافت نشد",
        "error-server": "خطای سرور داخلی"
    },
    en: {
        // Menu
        dashboard: "Dashboard",
        clients: "Clients",
        inbounds: "Inbounds",
        settings: "Settings",
        about: "About",
        
        // Dashboard
        "total-clients": "Total Clients",
        "active-inbounds": "Active Inbounds",
        "active-connections": "Active Connections",
        "activation-days": "Activation Days",
        
        // Clients
        username: "Username",
        protocol: "Protocol",
        "expiry-date": "Expiry Date",
        status: "Status",
        actions: "Actions",
        "add-client": "Add Client",
        "create-user": "Create User",
        
        // Inbounds
        name: "Name",
        port: "Port",
        network: "Network",
        security: "Security",
        "add-inbound": "Add Inbound",
        "create-inbound": "Create Inbound",
        
        // Settings
        "current-username": "Current Username",
        "new-password": "New Password",
        "confirm-password": "Confirm Password",
        "save-changes": "Save Changes",
        
        // About
        "about-passage": "About Passage",
        "about-desc": "Passage is a powerful management panel for V2Ray configs on Cloudflare Workers.",
        "developed-by": "Developed by Najidevs Team",
        "github-projects": "Our GitHub Projects:",
        
        // General
        logout: "Logout",
        active: "Active",
        inactive: "Inactive",
        expired: "Expired",
        edit: "Edit",
        delete: "Delete",
        copy: "Copy",
        qr: "QR Code",
        "qr-code": "Config QR Code",
        
        // Errors
        "error-network": "Network error",
        "error-unauthorized": "Unauthorized access",
        "error-not-found": "Requested data not found",
        "error-server": "Internal server error"
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

// تابع مدیریت خطا یکنواخت
function handleApiError(error, context = '') {
    const lang = localStorage.getItem('language') || 'fa';
    let message = '';
    
    if (error.name === 'AbortError') {
        message = translations[lang]['error-network'];
    } else if (error.message.includes('401')) {
        message = translations[lang]['error-unauthorized'];
    } else if (error.message.includes('404')) {
        message = translations[lang]['error-not-found'];
    } else if (error.message.includes('500')) {
        message = translations[lang]['error-server'];
    } else {
        message = error.message || translations[lang]['error-network'];
    }
    
    if (context) {
        message = `${context}: ${message}`;
    }
    
    showNotification(message, 'error');
    console.error('API Error:', error);
}