document.addEventListener('DOMContentLoaded', function() {
    // دریافت اطلاعات از API
    fetchDashboardData();
    
    // محاسبه و نمایش روزهای فعال‌سازی
    updateActivationDays();
    
    // تب‌ها
    const tabLinks = document.querySelectorAll('.nav-menu a');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('pageTitle');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // حذف کلاس active از همه تب‌ها
            tabLinks.forEach(l => l.parentElement.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // افزودن کلاس active به تب فعلی
            this.parentElement.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // به‌روزرسانی عنوان صفحه
            const titleText = this.querySelector('span').textContent;
            pageTitle.textContent = titleText;
            
            // بارگذاری داده‌های تب
            if (tabId === 'clients') {
                fetchClients();
            } else if (tabId === 'inbounds') {
                fetchInbounds();
            }
        });
    });
    
    // منوی موبایل
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // تغییر تم
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');
        const icon = this.querySelector('svg');
        if (body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
    
    // خروج
    const logoutBtn = document.getElementById('logoutBtn');
    
    logoutBtn.addEventListener('click', function() {
        if (confirm(translations[localStorage.getItem('language') || 'fa'].logout + '?')) {
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
    
    // مودال‌ها
    const addClientBtn = document.getElementById('addClientBtn');
    const addInboundBtn = document.getElementById('addInboundBtn');
    const addClientModal = document.getElementById('addClientModal');
    const addInboundModal = document.getElementById('addInboundModal');
    const closeModals = document.querySelectorAll('.close-modal');
    
    addClientBtn.addEventListener('click', function() {
        addClientModal.classList.add('active');
    });
    
    addInboundBtn.addEventListener('click', function() {
        addInboundModal.classList.add('active');
    });
    
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // فرم‌ها
    const addClientForm = document.getElementById('addClientForm');
    const addInboundForm = document.getElementById('addInboundForm');
    
    addClientForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createClient(Object.fromEntries(new FormData(this)));
        this.reset();
        addClientModal.classList.remove('active');
    });
    
    addInboundForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createInbound(Object.fromEntries(new FormData(this)));
        this.reset();
        addInboundModal.classList.remove('active');
    });
    
    // تنظیمات
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    saveSettingsBtn.addEventListener('click', function() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword && newPassword === confirmPassword) {
            updateSettings({ password: newPassword });
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification('رمز عبورها مطابقت ندارند', 'error');
        }
    });
});
// به‌روزرسانی روزهای فعال‌سازی
function updateActivationDays() {
    const activationDate = localStorage.getItem('activationDate');
    if (activationDate) {
        const activation = new Date(activationDate);
        const now = new Date();
        const diffTime = Math.abs(now - activation);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        document.getElementById('activationDays').textContent = diffDays;
    } else {
        document.getElementById('activationDays').textContent = '0';
    }
}
// دریافت داده‌های داشبورد
async function fetchDashboardData() {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const token = localStorage.getItem('token');
        
        if (!workerUrl || !token) {
            window.location.href = 'index.html';
            return;
        }
        
        // دریافت آمار کلی
        const response = await makeApiRequest('/api/stats?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (response) {
            updateDashboardStats(response);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}
// به‌روزرسانی آمار داشبورد
function updateDashboardStats(data) {
    document.getElementById('totalClients').textContent = data.totalClients || 0;
    document.getElementById('activeInbounds').textContent = data.activeInbounds || 0;
    document.getElementById('activeConnections').textContent = data.activeConnections || 0;
}
// دریافت لیست کاربران
async function fetchClients() {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/users?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (data) {
            updateClientsTable(data.users);
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
    }
}
// به‌روزرسانی جدول کاربران
function updateClientsTable(clients) {
    const tbody = document.getElementById('clientsTableBody');
    tbody.innerHTML = '';
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.username}</td>
            <td>${client.protocol}</td>
            <td>${client.expiryDate || 'نامحدود'}</td>
            <td>
                <span class="status-badge status-${client.status}">
                    ${client.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editClient('${client.id}')">
                        <svg class="fa-solid fa-edit" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
                    </button>
                    <button class="action-btn copy" onclick="copyClientConfig('${client.id}')">
                        <svg class="fa-solid fa-copy" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
                    </button>
                    <button class="action-btn delete" onclick="deleteClient('${client.id}')">
                        <svg class="fa-solid fa-trash" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}
// دریافت لیست اینباندها
async function fetchInbounds() {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/inbounds?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (data) {
            updateInboundsTable(data.inbounds);
        }
    } catch (error) {
        console.error('Error fetching inbounds:', error);
    }
}
// به‌روزرسانی جدول اینباندها
function updateInboundsTable(inbounds) {
    const tbody = document.getElementById('inboundsTableBody');
    tbody.innerHTML = '';
    
    inbounds.forEach(inbound => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${inbound.inbound_name}</td>
            <td>${inbound.protocol}</td>
            <td>${inbound.port}</td>
            <td>${inbound.network}</td>
            <td>${inbound.security}</td>
            <td>
                <span class="status-badge status-${inbound.status}">
                    ${inbound.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editInbound('${inbound.id}')">
                        <svg class="fa-solid fa-edit" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
                    </button>
                    <button class="action-btn delete" onclick="deleteInbound('${inbound.id}')">
                        <svg class="fa-solid fa-trash" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}
// ایجاد کاربر جدید
async function createClient(clientData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/users?workerUrl=' + encodeURIComponent(workerUrl), {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        
        fetchClients();
        fetchDashboardData();
        showNotification('کاربر با موفقیت ایجاد شد', 'success');
    } catch (error) {
        console.error('Error creating client:', error);
    }
}
// ایجاد اینباند جدید
async function createInbound(inboundData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/inbounds?workerUrl=' + encodeURIComponent(workerUrl), {
            method: 'POST',
            body: JSON.stringify(inboundData)
        });
        
        fetchInbounds();
        fetchDashboardData();
        showNotification('اینباند با موفقیت ایجاد شد', 'success');
    } catch (error) {
        console.error('Error creating inbound:', error);
    }
}
// به‌روزرسانی تنظیمات
async function updateSettings(settingsData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/settings?workerUrl=' + encodeURIComponent(workerUrl), {
            method: 'PUT',
            body: JSON.stringify(settingsData)
        });
        
        showNotification('تنظیمات با موفقیت ذخیره شد', 'success');
    } catch (error) {
        console.error('Error updating settings:', error);
    }
}
// کپی کانفیگ کاربر
async function copyClientConfig(clientId) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/config/' + clientId + '?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (data) {
            const config = JSON.stringify(data.config, null, 2);
            
            // کپی در کلیپ‌بورد
            navigator.clipboard.writeText(config).then(() => {
                showNotification('کانفیگ با موفقیت کپی شد', 'success');
            });
        }
    } catch (error) {
        console.error('Error copying client config:', error);
    }
}
// حذف کاربر
async function deleteClient(clientId) {
    if (confirm('آیا از حذف این کاربر مطمئن هستید؟')) {
        try {
            const workerUrl = localStorage.getItem('workerUrl');
            await makeApiRequest('/api/users/' + clientId + '?workerUrl=' + encodeURIComponent(workerUrl), {
                method: 'DELETE'
            });
            
            fetchClients();
            fetchDashboardData();
            showNotification('کاربر با موفقیت حذف شد', 'success');
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    }
}
// حذف اینباند
async function deleteInbound(inboundId) {
    if (confirm('آیا از حذف این اینباند مطمئن هستید؟')) {
        try {
            const workerUrl = localStorage.getItem('workerUrl');
            await makeApiRequest('/api/inbounds/' + inboundId + '?workerUrl=' + encodeURIComponent(workerUrl), {
                method: 'DELETE'
            });
            
            fetchInbounds();
            fetchDashboardData();
            showNotification('اینباند با موفقیت حذف شد', 'success');
        } catch (error) {
            console.error('Error deleting inbound:', error);
        }
    }
}
// تابع نمایش نوتیفیکیشن
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'error') icon = 'fa-circle-exclamation';
    else if (type === 'success') icon = 'fa-circle-check';
    
    notification.innerHTML = `
        <svg class="fa-solid ${icon}" style="width: 16px; height: 16px;" aria-hidden="true"></svg>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
// تابع عمومی برای درخواست‌های API
async function makeApiRequest(url, options = {}) {
    const workerUrl = localStorage.getItem('workerUrl');
    const token = localStorage.getItem('token');
    
    if (!workerUrl || !token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
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
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        if (error.name === 'AbortError') {
            showNotification('خطا در ارتباط با سرور (timeout)', 'error');
        } else {
            showNotification('خطا در ارتباط با سرور', 'error');
        }
        throw error;
    }
}