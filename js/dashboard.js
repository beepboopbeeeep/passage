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
        const icon = this.querySelector('i');
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
        if (confirm(window.translations[localStorage.getItem('language') || 'fa'].logout + '?')) {
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
    
    // Search functionality
    const searchClients = document.getElementById('searchClients');
    const searchInbounds = document.getElementById('searchInbounds');
    
    if (searchClients) {
        searchClients.addEventListener('input', function() {
            filterClients(this.value);
        });
    }
    
    if (searchInbounds) {
        searchInbounds.addEventListener('input', function() {
            filterInbounds(this.value);
        });
    }
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
        
        // دریافت لیست کاربران برای آمار
        const usersData = await makeApiRequest('/api/users');
        
        if (usersData) {
            const users = usersData.users;
            const totalClients = users.length;
            const activeClients = users.filter(user => user.status === 'active').length;
            
            // Update dashboard stats
            document.getElementById('totalClients').textContent = totalClients;
            document.getElementById('activeConnections').textContent = activeClients;
            
            // Update total traffic
            updateTotalTraffic(users);
        }
        
        // دریافت لیست اینباندها برای آمار
        const inboundsData = await makeApiRequest('/api/inbounds');
        
        if (inboundsData) {
            const inbounds = inboundsData.inbounds;
            const activeInbounds = inbounds.filter(inbound => inbound.status === 'active').length;
            
            // Update dashboard stats
            document.getElementById('activeInbounds').textContent = activeInbounds;
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

// Update total traffic display
function updateTotalTraffic(users) {
    const totalTrafficElement = document.getElementById('totalTraffic');
    if (totalTrafficElement) {
        const totalTraffic = users.reduce((sum, user) => {
            return sum + (user.traffic_used || 0);
        }, 0);
        
        const totalTrafficGB = (totalTraffic / (1024 * 1024 * 1024)).toFixed(2);
        totalTrafficElement.textContent = totalTrafficGB + ' GB';
    }
}

// دریافت لیست کاربران
async function fetchClients() {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/users');
        
        if (data) {
            updateClientsTable(data.users);
            // Update total traffic on dashboard
            updateTotalTraffic(data.users);
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
        // Format traffic data for display
        const trafficUsed = client.traffic_used ? (client.traffic_used / (1024 * 1024 * 1024)).toFixed(2) : '0';
        const trafficLimit = client.traffic_limit ? client.traffic_limit : 'نامحدود';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.username}</td>
            <td>${client.protocol}</td>
            <td>${client.expiry_date || 'نامحدود'}</td>
            <td>${trafficUsed} GB</td>
            <td>${trafficLimit !== 'نامحدود' ? trafficLimit + ' GB' : trafficLimit}</td>
            <td>
                <span class="status-badge status-${client.status}">
                    ${client.status === 'active' ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editClient('${client.id}')">
                        <i class="fas fa-edit" style="width: 16px; height: 16px;" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn copy" onclick="copyClientConfig('${client.id}')">
                        <i class="fas fa-copy" style="width: 16px; height: 16px;" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteClient('${client.id}')">
                        <i class="fas fa-trash" style="width: 16px; height: 16px;" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        `;
        row.dataset.clientId = client.id;
        row.dataset.username = client.username;
        row.dataset.protocol = client.protocol;
        tbody.appendChild(row);
    });
}

// Filter clients based on search term
function filterClients(searchTerm) {
    const rows = document.querySelectorAll('#clientsTableBody tr');
    searchTerm = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const username = row.dataset.username.toLowerCase();
        const protocol = row.dataset.protocol.toLowerCase();
        const matches = username.includes(searchTerm) || protocol.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}

// دریافت لیست اینباندها
async function fetchInbounds() {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/inbounds');
        
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
                        <i class="fas fa-edit" style="width: 16px; height: 16px;" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteInbound('${inbound.id}')">
                        <i class="fas fa-trash" style="width: 16px; height: 16px;" aria-hidden="true"></i>
                    </button>
                </div>
            </td>
        `;
        row.dataset.inboundId = inbound.id;
        row.dataset.inboundName = inbound.inbound_name;
        row.dataset.protocol = inbound.protocol;
        tbody.appendChild(row);
    });
}

// Filter inbounds based on search term
function filterInbounds(searchTerm) {
    const rows = document.querySelectorAll('#inboundsTableBody tr');
    searchTerm = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const inboundName = row.dataset.inboundName.toLowerCase();
        const protocol = row.dataset.protocol.toLowerCase();
        const matches = inboundName.includes(searchTerm) || protocol.includes(searchTerm);
        row.style.display = matches ? '' : 'none';
    });
}
// ایجاد کاربر جدید
async function createClient(clientData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
        
        fetchClients();
        fetchDashboardData();
        showNotification('کاربر با موفقیت ایجاد شد', 'success');
    } catch (error) {
        console.error('Error creating client:', error);
        showNotification('خطا در ایجاد کاربر', 'error');
    }
}
// ایجاد اینباند جدید
async function createInbound(inboundData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/inbounds', {
            method: 'POST',
            body: JSON.stringify(inboundData)
        });
        
        fetchInbounds();
        fetchDashboardData();
        showNotification('اینباند با موفقیت ایجاد شد', 'success');
    } catch (error) {
        console.error('Error creating inbound:', error);
        showNotification('خطا در ایجاد اینباند', 'error');
    }
}
// به‌روزرسانی تنظیمات
async function updateSettings(settingsData) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        await makeApiRequest('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settingsData)
        });
        
        showNotification('تنظیمات با موفقیت ذخیره شد', 'success');
    } catch (error) {
        console.error('Error updating settings:', error);
        showNotification('خطا در ذخیره تنظیمات', 'error');
    }
}
// کپی کانفیگ کاربر
async function copyClientConfig(clientId) {
    try {
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest('/api/config/' + clientId);
        
        if (data) {
            const config = JSON.stringify(data.config, null, 2);
            
            // کپی در کلیپ‌بورد
            navigator.clipboard.writeText(config).then(() => {
                showNotification('کانفیگ با موفقیت کپی شد', 'success');
            }).catch(err => {
                showNotification('خطا در کپی کانفیگ', 'error');
                console.error('Clipboard write failed:', err);
            });
        }
    } catch (error) {
        console.error('Error copying client config:', error);
        showNotification('خطا در دریافت کانفیگ', 'error');
    }
}
// حذف کاربر
async function deleteClient(clientId) {
    if (confirm('آیا از حذف این کاربر مطمئن هستید؟')) {
        try {
            const workerUrl = localStorage.getItem('workerUrl');
            await makeApiRequest('/api/users/' + clientId, {
                method: 'DELETE'
            });
            
            fetchClients();
            fetchDashboardData();
            showNotification('کاربر با موفقیت حذف شد', 'success');
        } catch (error) {
            console.error('Error deleting client:', error);
            showNotification('خطا در حذف کاربر', 'error');
        }
    }
}
// حذف اینباند
async function deleteInbound(inboundId) {
    if (confirm('آیا از حذف این اینباند مطمئن هستید؟')) {
        try {
            const workerUrl = localStorage.getItem('workerUrl');
            await makeApiRequest('/api/inbounds/' + inboundId, {
                method: 'DELETE'
            });
            
            fetchInbounds();
            fetchDashboardData();
            showNotification('اینباند با موفقیت حذف شد', 'success');
        } catch (error) {
            console.error('Error deleting inbound:', error);
            showNotification('خطا در حذف اینباند', 'error');
        }
    }
}
// ویرایش کاربر
async function editClient(clientId) {
    try {
        // Get current client data
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest(`/api/users`);
        const client = data.users.find(u => u.id === clientId);
        
        if (!client) {
            showNotification('کاربر یافت نشد', 'error');
            return;
        }
        
        // Create a modal for editing
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'editClientModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>ویرایش کاربر</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editClientForm">
                        <input type="hidden" name="id" value="${client.id}">
                        <div class="form-group">
                            <label>نام کاربری</label>
                            <input type="text" name="username" value="${client.username}" required>
                        </div>
                        <div class="form-group">
                            <label>پروتکل</label>
                            <select name="protocol" required>
                                <option value="vless" ${client.protocol === 'vless' ? 'selected' : ''}>VLESS</option>
                                <option value="vmess" ${client.protocol === 'vmess' ? 'selected' : ''}>VMESS</option>
                                <option value="trojan" ${client.protocol === 'trojan' ? 'selected' : ''}>Trojan</option>
                                <option value="shadowsocks" ${client.protocol === 'shadowsocks' ? 'selected' : ''}>Shadowsocks</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>تاریخ انقضا</label>
                            <input type="date" name="expiry_date" value="${client.expiry_date || ''}">
                        </div>
                        <div class="form-group">
                            <label>محدودیت ترافیک (GB)</label>
                            <input type="number" name="traffic_limit" min="0" step="0.1" value="${client.traffic_limit || ''}" placeholder="0 برای نامحدود">
                        </div>
                        <div class="form-group">
                            <label>وضعیت</label>
                            <select name="status">
                                <option value="active" ${client.status === 'active' ? 'selected' : ''}>فعال</option>
                                <option value="inactive" ${client.status === 'inactive' ? 'selected' : ''}>غیرفعال</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">
                            <i class="fas fa-save"></i>
                            <span>ذخیره تغییرات</span>
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
        
        const editForm = modal.querySelector('#editClientForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            const clientData = Object.fromEntries(formData.entries());
            
            try {
                await makeApiRequest(`/api/users/${clientData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(clientData)
                });
                
                showNotification('کاربر با موفقیت به‌روزرسانی شد', 'success');
                document.body.removeChild(modal);
                fetchClients(); // Refresh the client list
                fetchDashboardData(); // Refresh dashboard stats
            } catch (error) {
                showNotification('خطا در به‌روزرسانی کاربر', 'error');
            }
        });
    } catch (error) {
        console.error('Error editing client:', error);
        showNotification('خطا در دریافت اطلاعات کاربر', 'error');
    }
}

// ویرایش اینباند
async function editInbound(inboundId) {
    try {
        // Get current inbound data
        const workerUrl = localStorage.getItem('workerUrl');
        const data = await makeApiRequest(`/api/inbounds`);
        const inbound = data.inbounds.find(i => i.id === inboundId);
        
        if (!inbound) {
            showNotification('اینباند یافت نشد', 'error');
            return;
        }
        
        // Create a modal for editing
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'editInboundModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>ویرایش اینباند</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editInboundForm">
                        <input type="hidden" name="id" value="${inbound.id}">
                        <div class="form-group">
                            <label>نام اینباند</label>
                            <input type="text" name="inbound_name" value="${inbound.inbound_name}" required>
                        </div>
                        <div class="form-group">
                            <label>پروتکل</label>
                            <select name="protocol" required>
                                <option value="vless" ${inbound.protocol === 'vless' ? 'selected' : ''}>VLESS</option>
                                <option value="vmess" ${inbound.protocol === 'vmess' ? 'selected' : ''}>VMESS</option>
                                <option value="trojan" ${inbound.protocol === 'trojan' ? 'selected' : ''}>Trojan</option>
                                <option value="shadowsocks" ${inbound.protocol === 'shadowsocks' ? 'selected' : ''}>Shadowsocks</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>پورت</label>
                            <select name="port" required>
                                <option value="443" ${inbound.port === '443' ? 'selected' : ''}>443 (TLS)</option>
                                <option value="2053" ${inbound.port === '2053' ? 'selected' : ''}>2053 (TLS)</option>
                                <option value="2096" ${inbound.port === '2096' ? 'selected' : ''}>2096 (TLS)</option>
                                <option value="8443" ${inbound.port === '8443' ? 'selected' : ''}>8443 (TLS)</option>
                                <option value="80" ${inbound.port === '80' ? 'selected' : ''}>80 (Non-TLS)</option>
                                <option value="8080" ${inbound.port === '8080' ? 'selected' : ''}>8080 (Non-TLS)</option>
                                <option value="8880" ${inbound.port === '8880' ? 'selected' : ''}>8880 (Non-TLS)</option>
                                <option value="2052" ${inbound.port === '2052' ? 'selected' : ''}>2052 (Non-TLS)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>شبکه</label>
                            <select name="network" required>
                                <option value="ws" ${inbound.network === 'ws' ? 'selected' : ''}>WebSocket</option>
                                <option value="grpc" ${inbound.network === 'grpc' ? 'selected' : ''}>gRPC</option>
                                <option value="tcp" ${inbound.network === 'tcp' ? 'selected' : ''}>TCP</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>امنیت</label>
                            <select name="security">
                                <option value="tls" ${inbound.security === 'tls' ? 'selected' : ''}>TLS</option>
                                <option value="none" ${inbound.security === 'none' ? 'selected' : ''}>None</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>وضعیت</label>
                            <select name="status">
                                <option value="active" ${inbound.status === 'active' ? 'selected' : ''}>فعال</option>
                                <option value="inactive" ${inbound.status === 'inactive' ? 'selected' : ''}>غیرفعال</option>
                            </select>
                        </div>
                        <button type="submit" class="submit-btn">
                            <i class="fas fa-save"></i>
                            <span>ذخیره تغییرات</span>
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
        
        const editForm = modal.querySelector('#editInboundForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            const inboundData = Object.fromEntries(formData.entries());
            
            try {
                await makeApiRequest(`/api/inbounds/${inboundData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(inboundData)
                });
                
                showNotification('اینباند با موفقیت به‌روزرسانی شد', 'success');
                document.body.removeChild(modal);
                fetchInbounds(); // Refresh the inbound list
                fetchDashboardData(); // Refresh dashboard stats
            } catch (error) {
                showNotification('خطا در به‌روزرسانی اینباند', 'error');
            }
        });
    } catch (error) {
        console.error('Error editing inbound:', error);
        showNotification('خطا در دریافت اطلاعات اینباند', 'error');
    }
}
// تابع نمایش نوتیفیکیشن
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    else if (type === 'success') icon = 'fa-check-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
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
    
    // Redirect to login if no worker URL or token
    if (!workerUrl || !token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // Construct full URL with worker URL
        const fullUrl = `${workerUrl}${url}`;
        
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // If unauthorized, redirect to login
        if (response.status === 401) {
            localStorage.removeItem('token');
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