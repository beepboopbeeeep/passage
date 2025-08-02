// worker.js
const KV = PASSAGE_KV; // متغیر محیطی که در کلادفلر تنظیم می‌شود
// هدرهای CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
// توابع کمکی
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
// مدیریت درخواست‌ها
async function handleRequest(request) {
    const url = new URL(request.url);
    const method = request.method;
    
    // مدیریت درخواست‌های OPTIONS
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    // مسیرهای API
    if (url.pathname === '/api/login' && method === 'POST') {
        return handleLogin(request);
    } else if (url.pathname === '/api/users' && method === 'GET') {
        return handleGetUsers(request);
    } else if (url.pathname === '/api/users' && method === 'POST') {
        return handleCreateUser(request);
    } else if (url.pathname.startsWith('/api/users/') && method === 'PUT') {
        return handleUpdateUser(request);
    } else if (url.pathname.startsWith('/api/users/') && method === 'DELETE') {
        return handleDeleteUser(request);
    } else if (url.pathname === '/api/inbounds' && method === 'GET') {
        return handleGetInbounds(request);
    } else if (url.pathname === '/api/inbounds' && method === 'POST') {
        return handleCreateInbound(request);
    } else if (url.pathname.startsWith('/api/inbounds/') && method === 'PUT') {
        return handleUpdateInbound(request);
    } else if (url.pathname.startsWith('/api/inbounds/') && method === 'DELETE') {
        return handleDeleteInbound(request);
    } else if (url.pathname === '/api/stats' && method === 'GET') {
        return handleGetStats(request);
    } else if (url.pathname.startsWith('/api/config/') && method === 'GET') {
        return handleGenerateConfig(request);
    } else if (url.pathname === '/api/settings' && method === 'PUT') {
        return handleUpdateSettings(request);
    } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
}

// Function to consistently extract worker URL
function getWorkerUrl(request) {
    const host = request.headers.get('Host');
    const url = new URL(request.url);
    return `${url.protocol}//${host}`;
}

// ورود کاربر
async function handleLogin(request) {
    try {
        const { username, password } = await request.json();
        const workerUrl = getWorkerUrl(request);
        
        if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password are required' }), { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // دریافت اطلاعات احراز هویت
        const authKey = `auth_${workerUrl}`;
        const authData = await KV.get(authKey);
        
        let auth;
        if (!authData) {
            // ایجاد کاربر پیش‌فرض اگر وجود نداشته باشد
            auth = { username: 'admin', password: 'admin' };
            await KV.put(authKey, JSON.stringify(auth));
        } else {
            auth = JSON.parse(authData);
        }
        
        // بررسی اعتبار
        if (auth.username === username && auth.password === password) {
            const token = generateId();
            await KV.put(`token_${workerUrl}`, token, { expirationTtl: 86400 }); // 24 ساعت
            
            return new Response(JSON.stringify({ 
                success: true, 
                token,
                user: { username: auth.username }
            }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// دریافت لیست کاربران
async function handleGetUsers(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const workerUrl = getWorkerUrl(request);
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // دریافت لیست کاربران
        const usersKey = `users_${workerUrl}`;
        const usersData = await KV.get(usersKey);
        const userIds = usersData ? JSON.parse(usersData) : [];
        
        // دریافت اطلاعات هر کاربر
        const users = [];
        for (const userId of userIds) {
            const userKey = `user_${workerUrl}_${userId}`;
            const userData = await KV.get(userKey);
            if (userData) {
                users.push(JSON.parse(userData));
            }
        }
        
        return new Response(JSON.stringify({ users }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// ایجاد کاربر جدید
async function handleCreateUser(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const workerUrl = getWorkerUrl(request);
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const userData = await request.json();
        const userId = generateId();
        
        // ایجاد کاربر جدید
        const user = {
            id: userId,
            ...userData,
            createdAt: new Date().toISOString(),
            traffic_used: 0,
            traffic_limit: userData.traffic_limit ? parseFloat(userData.traffic_limit) : null,
            status: userData.status || 'active'
        };
        
        // ذخیره کاربر
        await KV.put(`user_${workerUrl}_${userId}`, JSON.stringify(user));
        
        // به‌روزرسانی لیست کاربران
        const usersKey = `users_${workerUrl}`;
        const usersData = await KV.get(usersKey);
        const users = usersData ? JSON.parse(usersData) : [];
        users.push(userId);
        await KV.put(usersKey, JSON.stringify(users));
        
        return new Response(JSON.stringify({ success: true, user }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// به‌روزرسانی کاربر
async function handleUpdateUser(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const userId = url.pathname.split('/').pop();
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const updateData = await request.json();
        
        // دریافت کاربر فعلی
        const userKey = `user_${workerUrl}_${userId}`;
        const userData = await KV.get(userKey);
        if (!userData) {
            return new Response(JSON.stringify({ error: 'User not found' }), { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const user = JSON.parse(userData);
        const updatedUser = { 
            ...user, 
            ...updateData, 
            updatedAt: new Date().toISOString(),
            traffic_limit: updateData.traffic_limit ? parseFloat(updateData.traffic_limit) : null
        };
        
        // ذخیره کاربر به‌روز شده
        await KV.put(userKey, JSON.stringify(updatedUser));
        
        return new Response(JSON.stringify({ success: true, user: updatedUser }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// حذف کاربر
async function handleDeleteUser(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const userId = url.pathname.split('/').pop();
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // حذف کاربر
        await KV.delete(`user_${workerUrl}_${userId}`);
        
        // به‌روزرسانی لیست کاربران
        const usersKey = `users_${workerUrl}`;
        const usersData = await KV.get(usersKey);
        if (usersData) {
            const users = JSON.parse(usersData);
            const updatedUsers = users.filter(id => id !== userId);
            await KV.put(usersKey, JSON.stringify(updatedUsers));
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// دریافت لیست اینباندها
async function handleGetInbounds(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const workerUrl = getWorkerUrl(request);
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // دریافت لیست اینباندها
        const inboundsKey = `inbounds_${workerUrl}`;
        const inboundsData = await KV.get(inboundsKey);
        const inbounds = inboundsData ? JSON.parse(inboundsData) : [];
        
        return new Response(JSON.stringify({ inbounds }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// ایجاد اینباند جدید
async function handleCreateInbound(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const workerUrl = getWorkerUrl(request);
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const inboundData = await request.json();
        const inboundId = generateId();
        
        // ایجاد اینباند جدید
        const inbound = {
            id: inboundId,
            ...inboundData,
            createdAt: new Date().toISOString(),
            status: inboundData.status || 'active'
        };
        
        // ذخیره اینباند
        await KV.put(`inbound_${workerUrl}_${inboundId}`, JSON.stringify(inbound));
        
        // به‌روزرسانی لیست اینباندها
        const inboundsKey = `inbounds_${workerUrl}`;
        const inboundsList = await KV.get(inboundsKey);
        const inbounds = inboundsList ? JSON.parse(inboundsList) : [];
        inbounds.push(inboundId);
        await KV.put(inboundsKey, JSON.stringify(inbounds));
        
        return new Response(JSON.stringify({ success: true, inbound }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// به‌روزرسانی اینباند
async function handleUpdateInbound(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const inboundId = url.pathname.split('/').pop();
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const updateData = await request.json();
        
        // دریافت اینباند فعلی
        const inboundKey = `inbound_${workerUrl}_${inboundId}`;
        const inboundData = await KV.get(inboundKey);
        if (!inboundData) {
            return new Response(JSON.stringify({ error: 'Inbound not found' }), { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const inbound = JSON.parse(inboundData);
        const updatedInbound = { ...inbound, ...updateData, updatedAt: new Date().toISOString() };
        
        // ذخیره اینباند به‌روز شده
        await KV.put(inboundKey, JSON.stringify(updatedInbound));
        
        return new Response(JSON.stringify({ success: true, inbound: updatedInbound }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// حذف اینباند
async function handleDeleteInbound(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const inboundId = url.pathname.split('/').pop();
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // حذف اینباند
        await KV.delete(`inbound_${workerUrl}_${inboundId}`);
        
        // به‌روزرسانی لیست اینباندها
        const inboundsKey = `inbounds_${workerUrl}`;
        const inboundsData = await KV.get(inboundsKey);
        if (inboundsData) {
            const inbounds = JSON.parse(inboundsData);
            const updatedInbounds = inbounds.filter(id => id !== inboundId);
            await KV.put(inboundsKey, JSON.stringify(updatedInbounds));
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// دریافت آمار ترافیک
async function handleGetStats(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const userId = url.searchParams.get('userId');
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // دریافت آمار ترافیک
        const statsKey = `stats_${workerUrl}_${userId}_${formatDate(new Date())}`;
        const statsData = await KV.get(statsKey);
        const stats = statsData ? JSON.parse(statsData) : { traffic: 0, connections: 0 };
        
        return new Response(JSON.stringify({ stats }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// تولید کانفیگ
async function handleGenerateConfig(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const url = new URL(request.url);
        const workerUrl = getWorkerUrl(request);
        const userId = url.pathname.split('/').pop();
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // دریافت اطلاعات کاربر
        const userKey = `user_${workerUrl}_${userId}`;
        const userData = await KV.get(userKey);
        if (!userData) {
            return new Response(JSON.stringify({ error: 'User not found' }), { 
                status: 404, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const user = JSON.parse(userData);
        
        // Check if user is active
        if (!isUserActive(user)) {
            return new Response(JSON.stringify({ error: 'User account is not active' }), { 
                status: 403, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // تولید کانفیگ بر اساس پروتکل
        let config;
        switch (user.protocol) {
            case 'vless':
                config = generateVLESSConfig(url.hostname, user);
                break;
            case 'vmess':
                config = generateVMESSConfig(url.hostname, user);
                break;
            case 'trojan':
                config = generateTrojanConfig(url.hostname, user);
                break;
            case 'shadowsocks':
                config = generateShadowsocksConfig(url.hostname, user);
                break;
            default:
                return new Response(JSON.stringify({ error: 'Invalid protocol' }), { 
                    status: 400, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
        }
        
        return new Response(JSON.stringify({ config }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// توابع تولید کانفیگ
function generateVLESSConfig(workerUrl, user) {
    return {
        v: "2",
        ps: `Passage-${user.username}`,
        add: workerUrl,
        port: user.port || 443,
        id: user.uuid || generateId(),
        aid: 0,
        net: "ws",
        type: "none",
        host: workerUrl,
        path: "/vless",
        tls: "tls",
        sni: workerUrl,
        fp: "chrome"
    };
}
function generateVMESSConfig(workerUrl, user) {
    return {
        v: "2",
        ps: `Passage-${user.username}`,
        add: workerUrl,
        port: user.port || 443,
        id: user.uuid || generateId(),
        aid: 0,
        net: "ws",
        type: "none",
        host: workerUrl,
        path: "/vmess",
        tls: "tls",
        sni: workerUrl
    };
}
function generateTrojanConfig(workerUrl, user) {
    return {
        password: user.password || generateId(),
        sni: workerUrl,
        type: "ws",
        host: workerUrl,
        path: "/trojan",
        tls: "tls"
    };
}
function generateShadowsocksConfig(workerUrl, user) {
    return {
        server: workerUrl,
        server_port: user.port || 443,
        password: user.password || generateId(),
        method: user.method || "chacha20-ietf-poly1305",
        plugin: "v2ray-plugin",
        "plugin-opts": {
            "mode": "websocket",
            "path": "/shadowsocks",
            "tls": "tls",
            "host": workerUrl
        }
    };
}

// Check if user has exceeded traffic limit
function isUserExceededTrafficLimit(user) {
    if (!user.traffic_limit) return false; // No limit set
    const trafficUsedGB = user.traffic_used / (1024 * 1024 * 1024);
    return trafficUsedGB >= user.traffic_limit;
}

// Check if user account is expired
function isUserExpired(user) {
    if (!user.expiry_date) return false; // No expiry date set
    const expiryDate = new Date(user.expiry_date);
    const currentDate = new Date();
    return currentDate > expiryDate;
}

// Check if user account is active
function isUserActive(user) {
    if (user.status !== 'active') return false;
    if (isUserExpired(user)) return false;
    if (isUserExceededTrafficLimit(user)) return false;
    return true;
}

// به‌روزرسانی تنظیمات
async function handleUpdateSettings(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const workerUrl = getWorkerUrl(request);
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        const { username, password } = await request.json();
        
        // به‌روزرسانی اطلاعات احراز هویت
        const authKey = `auth_${workerUrl}`;
        const auth = { username, password };
        await KV.put(authKey, JSON.stringify(auth));
        
        return new Response(JSON.stringify({ success: true }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}
// اجرای ورکر
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});