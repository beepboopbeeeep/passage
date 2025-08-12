// Global variables
const API_BASE = 'https://collector.judiopu.workers.dev/api'; // This will be replaced with your Cloudflare Worker URL
let currentLang = 'en';
let currentConfigs = [];

// DOM Elements
const elements = {
    currentDate: document.getElementById('current-date'),
    configsContainer: document.getElementById('configs-container'),
    loading: document.getElementById('loading'),
    modal: document.getElementById('config-modal'),
    modalClose: document.getElementById('modal-close'),
    modalTitle: document.getElementById('modal-title'),
    qrCode: document.getElementById('qr-code'),
    copyBtn: document.getElementById('copy-btn'),
    copySubBtn: document.getElementById('copy-sub-btn'),
    configRaw: document.getElementById('config-raw'),
    langToggle: document.getElementById('lang-toggle'),
    totalConfigsCount: document.getElementById('total-configs-count'),
    todayConfigsCount: document.getElementById('today-configs-count'),
    activeConfigsCount: document.getElementById('active-configs-count'),
    donatedConfigsCount: document.getElementById('donated-configs-count'),
    pageTitle: document.getElementById('page-title')
};

// Translations
const translations = {
    en: {
        'page-title': 'Researcher',
        'latest-configs-title': 'Latest Configurations',
        'today-configs-title': 'Today\'s Configurations',
        'active-configs-title': 'Active Configurations',
        'donated-configs-title': 'Donated Configurations',
        'total-configs-title': 'Total Configs',
        'today-configs-link': 'Today\'s Configs',
        'active-configs-link': 'Active Configs',
        'donated-configs-link': 'Donated Configs',
        'back-to-home': 'Back to Home',
        'loading-text': 'Loading configurations...',
        'modal-title': 'Configuration Details',
        'copy-btn': 'Copy Config',
        'copy-sub-btn': 'Copy Subscription Link',
        'donate-btn': 'Donate This Config',
        'footer-text': 'Researcher &copy; 2023',
        'lang-toggle': 'فارسی'
    },
    fa: {
        'page-title': 'محقق',
        'latest-configs-title': 'آخرین کانفیگ‌ها',
        'today-configs-title': 'کانفیگ‌های امروز',
        'active-configs-title': 'کانفیگ‌های فعال',
        'donated-configs-title': 'کانفیگ‌های اهدا شده',
        'total-configs-title': 'کل کانفیگ‌ها',
        'today-configs-link': 'کانفیگ‌های امروز',
        'active-configs-link': 'کانفیگ‌های فعال',
        'donated-configs-link': 'کانفیگ‌های اهدا شده',
        'back-to-home': 'بازگشت به خانه',
        'loading-text': 'در حال بارگذاری کانفیگ‌ها...',
        'modal-title': 'جزئیات کانفیگ',
        'copy-btn': 'کپی کانفیگ',
        'copy-sub-btn': 'کپی لینک سابسکریپشن',
        'donate-btn': 'اهدای این کانفیگ',
        'footer-text': 'محقق &copy; 2023',
        'lang-toggle': 'English'
    }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set current date
    updateCurrentDate();
    
    // Load configurations based on page
    if (window.location.pathname.includes('today.html')) {
        loadTodaysConfigs();
    } else if (window.location.pathname.includes('active.html')) {
        loadActiveConfigs();
    } else if (window.location.pathname.includes('donated.html')) {
        loadDonatedConfigs();
    } else {
        loadLatestConfigs();
        loadConfigCounts();
    }
    
    // Event listeners
    elements.modalClose.addEventListener('click', closeModal);
    elements.langToggle.addEventListener('click', toggleLanguage);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === elements.modal) {
            closeModal();
        }
    });
    
    // Add donate button event listener if it exists
    const donateBtn = document.getElementById('donate-btn');
    if (donateBtn) {
        donateBtn.addEventListener('click', donateConfig);
    }
    
    // Add collect button event listener if it exists
    const collectBtn = document.getElementById('collect-btn');
    if (collectBtn) {
        collectBtn.addEventListener('click', collectNewConfigs);
    }
});

// Update current date display
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    if (currentLang === 'fa') {
        elements.currentDate.textContent = now.toLocaleDateString('fa-IR', options);
    } else {
        elements.currentDate.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Toggle language
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'fa' : 'en';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
    
    // Update body font family
    if (currentLang === 'fa') {
        document.body.style.fontFamily = "'Vazirmatn', 'Oswald', sans-serif";
    } else {
        document.body.style.fontFamily = "'Oswald', 'Vazirmatn', sans-serif";
    }
    
    updateTranslations();
    updateCurrentDate();
}

// Update UI translations
function updateTranslations() {
    // Update all translatable elements
    Object.keys(translations[currentLang]).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = translations[currentLang][key];
        }
    });
    
    // Update language toggle button
    elements.langToggle.textContent = translations[currentLang]['lang-toggle'];
}

// Load latest 10 configs
async function loadLatestConfigs() {
    try {
        const response = await fetch(`${API_BASE}/configs`);
        if (!response.ok) throw new Error('Failed to load configs');
        
        currentConfigs = await response.json();
        renderConfigs(currentConfigs);
    } catch (error) {
        console.error('Error loading configs:', error);
        elements.configsContainer.innerHTML = `
            <div class="loading">
                <p>Error loading configurations. Please try again later.</p>
            </div>
        `;
    }
}

// Load today's configs
async function loadTodaysConfigs() {
    try {
        const response = await fetch(`${API_BASE}/today`);
        if (!response.ok) throw new Error('Failed to load today\'s configs');
        
        currentConfigs = await response.json();
        renderConfigs(currentConfigs);
    } catch (error) {
        console.error('Error loading today\'s configs:', error);
        elements.configsContainer.innerHTML = `
            <div class="loading">
                <p>Error loading today's configurations. Please try again later.</p>
            </div>
        `;
    }
}

// Load active configs
async function loadActiveConfigs() {
    try {
        const response = await fetch(`${API_BASE}/active`);
        if (!response.ok) throw new Error('Failed to load active configs');
        
        currentConfigs = await response.json();
        renderConfigs(currentConfigs);
    } catch (error) {
        console.error('Error loading active configs:', error);
        elements.configsContainer.innerHTML = `
            <div class="loading">
                <p>Error loading active configurations. Please try again later.</p>
            </div>
        `;
    }
}

// Load donated configs
async function loadDonatedConfigs() {
    try {
        const response = await fetch(`${API_BASE}/donated`);
        if (!response.ok) throw new Error('Failed to load donated configs');
        
        currentConfigs = await response.json();
        renderConfigs(currentConfigs);
    } catch (error) {
        console.error('Error loading donated configs:', error);
        elements.configsContainer.innerHTML = `
            <div class="loading">
                <p>Error loading donated configurations. Please try again later.</p>
            </div>
        `;
    }
}

// Load config counts
async function loadConfigCounts() {
    try {
        const response = await fetch(`${API_BASE}/configs/count`);
        if (!response.ok) throw new Error('Failed to load config counts');
        
        const counts = await response.json();
        elements.totalConfigsCount.textContent = counts.total;
        elements.todayConfigsCount.textContent = counts.today;
        if (elements.activeConfigsCount) {
            elements.activeConfigsCount.textContent = counts.active;
        }
        if (elements.donatedConfigsCount) {
            elements.donatedConfigsCount.textContent = counts.donated || 0;
        }
    } catch (error) {
        console.error('Error loading config counts:', error);
    }
}

// Render configs to the page
function renderConfigs(configs) {
    if (configs.length === 0) {
        elements.configsContainer.innerHTML = `
            <div class="loading">
                <p>No configurations found.</p>
            </div>
        `;
        return;
    }
    
    elements.configsContainer.innerHTML = '';
    
    configs.forEach(config => {
        const configElement = createConfigCard(config);
        elements.configsContainer.appendChild(configElement);
    });
}

// Create a config card element
function createConfigCard(config) {
    const card = document.createElement('div');
    card.className = 'config-card';
    card.innerHTML = `
        <div class="config-header">
            <div class="config-title">${config.remark || 'V2Ray Config'}</div>
            <div class="config-flag">${config.flag || '🌐'}</div>
        </div>
        <div class="config-body">
            <div class="config-info">
                <span>📅 ${formatDate(config.collectedAt)}</span>
                <span>📍 ${config.ipLocation || 'Unknown'}</span>
            </div>
            <div class="config-info">
                <span>🔗 ${config.protocol || 'Unknown'}</span>
                <span>${isConfigActive(config) ? '🟢 Active' : '🔴 Inactive'}</span>
            </div>
            <div class="config-actions">
                <button class="action-btn" data-action="copy" data-config="${config.id}">📋 Copy</button>
                <button class="action-btn" data-action="qr" data-config="${config.id}">🔲 QR</button>
                <button class="action-btn" data-action="details" data-config="${config.id}">👁️ Details</button>
                ${!config.donated ? `<button class="donate-btn" data-action="donate" data-config="${config.id}">❤️ Donate</button>` : ''}
            </div>
        </div>
    `;
    
    // Add event listeners to action buttons
    card.querySelectorAll('.action-btn, .donate-btn').forEach(button => {
        button.addEventListener('click', handleConfigAction);
    });
    
    return card;
}

// Check if config is active
function isConfigActive(config) {
    const lastChecked = new Date(config.lastChecked).getTime();
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
    return lastChecked > threeHoursAgo;
}

// Handle config action buttons
function handleConfigAction(event) {
    const action = event.target.dataset.action;
    const configId = event.target.dataset.config;
    
    const config = currentConfigs.find(c => c.id === configId);
    if (!config) return;
    
    switch (action) {
        case 'copy':
            copyToClipboard(config.raw);
            break;
        case 'qr':
            showQRCode(config.raw, config.remark);
            break;
        case 'details':
            showConfigDetails(config);
            break;
        case 'donate':
            donateConfig(config);
            break;
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show a temporary success message
        const originalText = event.target.textContent;
        event.target.textContent = currentLang === 'fa' ? 'کپی شد!' : 'Copied!';
        event.target.style.backgroundColor = 'green';
        setTimeout(() => {
            event.target.textContent = originalText;
            event.target.style.backgroundColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Show error message
        const originalText = event.target.textContent;
        event.target.textContent = currentLang === 'fa' ? 'خطا!' : 'Error!';
        event.target.style.backgroundColor = 'red';
        setTimeout(() => {
            event.target.textContent = originalText;
            event.target.style.backgroundColor = '';
        }, 2000);
    });
}

// Show QR code
function showQRCode(text, title) {
    openModal(title || 'QR Code');
    
    // Clear previous content
    elements.qrCode.innerHTML = '';
    
    // Create a div for QR code
    const qrDiv = document.createElement('div');
    qrDiv.id = 'qr-code-container';
    qrDiv.style.display = 'flex';
    qrDiv.style.justifyContent = 'center';
    elements.qrCode.appendChild(qrDiv);
    
    // Generate QR code using the library
    QRCode.toCanvas(qrDiv, text, {
        width: 200,
        height: 200,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    }, function (error) {
        if (error) {
            console.error('Error generating QR code:', error);
            elements.qrCode.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p>Error generating QR code</p>
                    <div style="background: white; width: 200px; height: 200px; margin: 10px auto; display: flex; align-items: center; justify-content: center;">
                        <span>QR CODE ERROR</span>
                    </div>
                </div>
            `;
        }
    });
    
    // Add text below the QR code
    const info = document.createElement('p');
    info.textContent = currentLang === 'fa' ? 'این کیوآر کد را با کلاینت V2Ray اسکن کنید' : 'Scan this QR code with your V2Ray client';
    info.style.textAlign = 'center';
    info.style.marginTop = '10px';
    elements.qrCode.appendChild(info);
}

// Show config details in modal
function showConfigDetails(config) {
    openModal(config.remark || 'Configuration Details');
    
    // Clear previous QR code
    elements.qrCode.innerHTML = '';
    
    // Show config details
    elements.configRaw.textContent = config.raw;
    
    // Update button data
    elements.copyBtn.onclick = () => copyToClipboard(config.raw);
    elements.copySubBtn.onclick = () => {
        const date = new Date(config.collectedAt).toISOString().split('T')[0];
        const subLink = `${window.location.origin}${API_BASE}/sub/${date}`;
        copyToClipboard(subLink);
    };
    
    // Update donate button
    const donateBtn = document.getElementById('donate-btn');
    if (donateBtn) {
        donateBtn.onclick = () => donateConfig(config);
    }
}

// Donate config
async function donateConfig(config) {
    try {
        const response = await fetch(`${API_BASE}/donate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                configId: config.id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to donate config');
        }
        
        const result = await response.json();
        
        // Show success message
        alert(currentLang === 'fa' ? 'تشکر از اهدا کردن این کانفیگ!' : 'Thank you for donating this config!');
        
        // Update the UI to reflect the donation
        const donateButtons = document.querySelectorAll(`[data-config="${config.id}"][data-action="donate"]`);
        donateButtons.forEach(button => {
            button.parentElement.removeChild(button);
        });
        
        // Close modal if it's open
        closeModal();
        
        // Reload configs to show updated status
        if (window.location.pathname.includes('donated.html')) {
            loadDonatedConfigs();
        } else if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            loadLatestConfigs();
            loadConfigCounts();
        }
    } catch (error) {
        console.error('Error donating config:', error);
        alert(currentLang === 'fa' ? 'خطا در اهدا کانفیگ. لطفا دوباره تلاش کنید.' : 'Error donating config. Please try again.');
    }
}

// Open modal
function openModal(title) {
    elements.modalTitle.textContent = title;
    elements.modal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.modal.style.display = 'none';
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    if (currentLang === 'fa') {
        return date.toLocaleDateString('fa-IR');
    } else {
        return date.toLocaleDateString('en-US');
    }
}

// Collect new configurations from Telegram channels
async function collectNewConfigs() {
    const collectBtn = document.getElementById('collect-btn');
    const originalText = collectBtn.textContent;
    
    try {
        collectBtn.textContent = currentLang === 'fa' ? 'در حال جمع آوری...' : 'Collecting...';
        collectBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/collect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) throw new Error('Failed to collect configs');
        
        const result = await response.json();
        
        // Show success message
        alert(currentLang === 'fa' 
            ? `جمع آوری انجام شد! ${result.collected} کانفیگ جدید اضافه شد.` 
            : `Collection completed! ${result.collected} new configs added.`);
        
        // Reload configs
        loadLatestConfigs();
        loadConfigCounts();
    } catch (error) {
        console.error('Error collecting configs:', error);
        alert(currentLang === 'fa' 
            ? 'خطا در جمع آوری کانفیگ ها. لطفا دوباره تلاش کنید.' 
            : 'Error collecting configs. Please try again.');
    } finally {
        collectBtn.textContent = originalText;
        collectBtn.disabled = false;
    }
}

// Initialize translations
updateTranslations();