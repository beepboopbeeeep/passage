document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    
    // تغییر حالت نمایش رمز عبور
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
    
    // ارسال فرم ورود
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const workerUrl = document.getElementById('workerUrl').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // ذخیره اطلاعات ورود به جز توکن
        localStorage.setItem('workerUrl', workerUrl);
        localStorage.setItem('username', username);
        
        // شبیه‌سازی ورود موفق
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    });
    
    // بارگذاری زبان
    initLanguage();
});

// تابع عمومی برای درخواست‌های API
async function makeApiRequest(url, options = {}) {
    const workerUrl = localStorage.getItem('workerUrl');
    const token = sessionStorage.getItem('token'); // استفاده از sessionStorage به جای localStorage
    
    if (!workerUrl || !token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // افزایش timeout به 15 ثانیه
        
        const response = await fetch(`${workerUrl}${url}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 401) {
            // توکن منقضی شده
            localStorage.clear();
            sessionStorage.clear(); // پاک کردن sessionStorage نیز ضروری است
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const text = await response.text();
        if (!text) {
            return null;
        }
        
        // بررسی اینکه آیا پاسخ یک JSON معتبر است یا نه
        try {
            return JSON.parse(text);
        } catch (jsonError) {
            // اگر تجزیه JSON ناموفق بود، خود متن را برگردان
            console.warn('Response is not valid JSON:', text);
            return text;
        }
    } catch (error) {
        console.error('API request failed:', error);
        if (error.name === 'AbortError') {
            showNotification('خطا در ارتباط با سرور (timeout)', 'error');
        } else {
            showNotification('خطا در ارتباط با سرور: ' + error.message, 'error');
        }
        throw error;
    }
}