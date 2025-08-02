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