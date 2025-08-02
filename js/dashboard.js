// js/dashboard.js
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
            sessionStorage.clear(); // پاک کردن sessionStorage نیز ضروری است
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
        const token = window.PASSAGE_TOKEN;
        
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
        handleApiError(error, 'دریافت آمار داشبورد');
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
        handleApiError(error, 'دریافت لیست کاربران');
    }
}

// به‌روزرسانی جدول کاربران
function updateClientsTable(clients) {
  const tbody = document.getElementById('clientsTableBody');
  tbody.innerHTML = '';
  
  if (!clients || clients.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5" style="text-align: center;">هیچ کاربری یافت نشد</td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  clients.forEach(client => {
    // بررسی وضعیت واقعی کاربر
    let displayStatus = client.status;
    if (client.status === 'active' && client.expiryDate) {
      const now = new Date();
      const expiryDate = new Date(client.expiryDate);
      if (now > expiryDate) {
        displayStatus = 'expired';
      }
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.username || '-'}</td>
      <td>${client.protocol || '-'}</td>
      <td>${client.expiryDate || 'نامحدود'}</td>
      <td>
        <span class="status-badge status-${displayStatus || 'inactive'}">
          ${displayStatus === 'active' ? 'فعال' : displayStatus === 'expired' ? 'منقضی شده' : 'غیرفعال'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn copy" onclick="copyClientConfig('${client.id}')" title="کپی کانفیگ">
            <i class="fas fa-copy"></i>
          </button>
          <button class="action-btn qr" onclick="showQRCode('${client.id}')" title="نمایش QR کد">
            <i class="fas fa-qrcode"></i>
          </button>
          <button class="action-btn delete" onclick="deleteClient('${client.id}')" title="حذف کاربر">
            <i class="fas fa-trash"></i>
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
        handleApiError(error, 'دریافت لیست اینباندها');
    }
}

// به‌روزرسانی جدول اینباندها
function updateInboundsTable(inbounds) {
    const tbody = document.getElementById('inboundsTableBody');
    tbody.innerHTML = '';
    
    if (!inbounds || inbounds.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center;">هیچ اینباندی یافت نشد</td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    inbounds.forEach(inbound => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${inbound.inbound_name || '-'}</td>
            <td>${inbound.protocol || '-'}</td>
            <td>${inbound.port || '-'}</td>
            <td>${inbound.network || '-'}</td>
            <td>${inbound.security || '-'}</td>
            <td>
                <span class="status-badge status-${inbound.status === 'فعال' ? 'active' : 'inactive'}">
                    ${inbound.status || 'نامشخص'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn delete" onclick="deleteInbound('${inbound.id}')" title="حذف اینباند">
                        <i class="fas fa-trash"></i>
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
        handleApiError(error, 'ایجاد کاربر جدید');
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
        handleApiError(error, 'ایجاد اینباند جدید');
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
        handleApiError(error, 'به‌روزرسانی تنظیمات');
    }
}

// کپی کانفیگ کاربر
async function copyClientConfig(clientId) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        // استفاده از endpoint جدید برای دریافت لینک اشتراک
        const response = await makeApiRequest('/api/subscription/' + clientId + '?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (response) {
            // بررسی اینکه آیا response یک رشته است یا یک آبجکت
            let configString;
            if (typeof response === 'string') {
                configString = response;
            } else if (typeof response === 'object') {
                // اگر response یک آبجکت باشد، تبدیل به رشته
                configString = JSON.stringify(response);
            } else {
                showNotification('خطا در دریافت لینک اشتراک: فرمت داده ناشناخته', 'error');
                return;
            }
            
            // کپی لینک اشتراک مستقیم
            navigator.clipboard.writeText(configString).then(() => {
                showNotification('لینک اشتراک با موفقیت کپی شد', 'success');
            }).catch(err => {
                console.error('Copy error:', err);
                showNotification('خطا در کپی کردن لینک اشتراک', 'error');
            });
        } else {
            showNotification('خطا در دریافت لینک اشتراک', 'error');
        }
    } catch (error) {
        handleApiError(error, 'کپی کانفیگ کاربر');
    }
}

// نمایش QR کد
async function showQRCode(clientId) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        // استفاده از endpoint جدید برای دریافت لینک اشتراک
        const response = await makeApiRequest('/api/subscription/' + clientId + '?workerUrl=' + encodeURIComponent(workerUrl));
        
        if (response) {
            // بررسی اینکه آیا response یک رشته است یا یک آبجکت
            let configString;
            if (typeof response === 'string') {
                configString = response;
            } else if (typeof response === 'object') {
                // اگر response یک آبجکت باشد، تبدیل به رشته
                configString = JSON.stringify(response);
            } else {
                showNotification('خطا در دریافت لینک اشتراک: فرمت داده ناشناخته', 'error');
                return;
            }
            
            // ایجاد مودال QR کد
            const qrModal = document.createElement('div');
            qrModal.className = 'modal active';
            qrModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>QR Code کانفیگ</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <div id="qrcode" style="margin: 20px auto;"></div>
                        <div class="config-text" style="word-break: break-all; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-top: 10px;">
                            ${configString}
                        </div>
                        <button class="submit-btn" onclick="copyConfigToClipboard('${configString.replace(/'/g, "\\'")}')">
                            <i class="fas fa-copy"></i> کپی کانفیگ
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(qrModal);
            
            // تولید QR کد
            new QRCode(document.getElementById("qrcode"), {
                text: configString,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // بستن مودال
            qrModal.querySelector('.close-modal').addEventListener('click', () => {
                document.body.removeChild(qrModal);
            });
        } else {
            showNotification('خطا در دریافت لینک اشتراک', 'error');
        }
    } catch (error) {
        handleApiError(error, 'نمایش QR کد');
    }
}

// تبدیل کانفیگ به فرمت استاندارد
function generateConfigString(config) {
    switch (config.v) {
        case "2": // VLESS/VMESS
            if (config.ps && config.ps.includes("vmess")) {
                // VMess config
                const vmessConfig = {
                    v: "2",
                    ps: config.ps,
                    add: config.add,
                    port: config.port,
                    id: config.id,
                    aid: config.aid,
                    net: config.net,
                    type: config.type,
                    host: config.host,
                    path: config.path,
                    tls: config.tls,
                    sni: config.sni
                };
                return `vmess://${btoa(JSON.stringify(vmessConfig))}`;
            } else {
                // VLESS config
                return `vless://${config.id}@${config.add}:${config.port}?encryption=none&security=${config.tls}&sni=${config.sni}&fp=${config.fp || 'chrome'}&type=${config.net}&host=${config.host}&path=${encodeURIComponent(config.path)}#${encodeURIComponent(config.ps)}`;
            }
        
        case "trojan": // Trojan
            return `trojan://${config.password}@${config.host || config.sni}:${config.port || 443}?security=${config.tls}&sni=${config.sni}&type=${config.type || 'ws'}&host=${config.host}&path=${encodeURIComponent(config.path || '/trojan')}#${encodeURIComponent(config.ps)}`;
        
        case "ss": // Shadowsocks
            const ssConfig = {
                method: config.method || 'chacha20-ietf-poly1305',
                password: config.password,
                server: config.server || config.add,
                server_port: config.server_port || config.port || 443
            };
            
            const ssUri = `${ssConfig.method}:${ssConfig.password}@${ssConfig.server}:${ssConfig.server_port}`;
            const ssBase64 = btoa(ssUri);
            
            // افزودن پارامترهای اضافی
            const pluginParams = new URLSearchParams();
            pluginParams.set('security', config.tls || 'tls');
            pluginParams.set('sni', config.sni || config.server || config.add);
            pluginParams.set('type', config.type || 'ws');
            pluginParams.set('host', config.host || config.sni || config.server || config.add);
            pluginParams.set('path', config.path || '/shadowsocks');
            
            return `ss://${ssBase64}?${pluginParams.toString()}#${encodeURIComponent(config.ps)}`;
        
        default:
            return JSON.stringify(config, null, 2);
    }
}

// کپی مستقیم کانفیگ
function copyConfigToClipboard(configString) {
    navigator.clipboard.writeText(configString).then(() => {
        showNotification('کانفیگ با موفقیت کپی شد', 'success');
    }).catch(err => {
        console.error('Copy error:', err);
        showNotification('خطا در کپی کردن کانفیگ', 'error');
    });
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
            handleApiError(error, 'حذف کاربر');
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
            handleApiError(error, 'حذف اینباند');
        }
    }
}

// تابع نمایش نوتیفیکیشن
function showNotification(message, type = 'info') {
    // حذف نوتیفیکیشن‌های قبلی
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'error') icon = 'fa-circle-exclamation';
    else if (type === 'success') icon = 'fa-circle-check';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // انیمیشن نمایش
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
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
    const token = sessionStorage.getItem('token'); // استفاده از sessionStorage به جای window.PASSAGE_TOKEN
    
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
