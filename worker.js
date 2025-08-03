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
    
    // مدیریت اتصالات WebSocket برای VLESS
    if (url.pathname.startsWith('/vless/') && method === 'GET') {
        const userId = url.pathname.split('/')[2];
        if (userId) {
            return handleVlessWebSocket(request, userId);
        }
    }
    
    // مدیریت اتصالات WebSocket برای VMess
    if (url.pathname.startsWith('/vmess/') && method === 'GET') {
        const userId = url.pathname.split('/')[2];
        if (userId) {
            return handleVmessWebSocket(request, userId);
        }
    }
    
    // مدیریت اتصالات WebSocket برای Trojan
    if (url.pathname.startsWith('/trojan/') && method === 'GET') {
        const userId = url.pathname.split('/')[2];
        if (userId) {
            return handleTrojanWebSocket(request, userId);
        }
    }
    
    // مدیریت اتصالات WebSocket برای Shadowsocks
    if (url.pathname.startsWith('/shadowsocks/') && method === 'GET') {
        const userId = url.pathname.split('/')[2];
        if (userId) {
            return handleShadowsocksWebSocket(request, userId);
        }
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
        const userId = generateId(); // همیشه یک ID جدید تولید کن
        
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
        
        // Check if URI format is requested
        const format = url.searchParams.get('format') || 'json'; // 'json' or 'uri'
        
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
        if (format === 'uri') {
            // Generate URI format
            switch (user.protocol) {
                case 'vless':
                    config = generateVLESSURI(workerUrl, user);
                    break;
                case 'vmess':
                    config = generateVMESSURI(workerUrl, user);
                    break;
                case 'trojan':
                    config = generateTrojanURI(workerUrl, user);
                    break;
                case 'shadowsocks':
                    config = generateShadowsocksURI(workerUrl, user);
                    break;
                default:
                    return new Response(JSON.stringify({ error: 'Invalid protocol' }), { 
                        status: 400, 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
            }
        } else {
            // Generate JSON format (default)
            switch (user.protocol) {
                case 'vless':
                    config = generateVLESSConfig(workerUrl, user);
                    break;
                case 'vmess':
                    config = generateVMESSConfig(workerUrl, user);
                    break;
                case 'trojan':
                    config = generateTrojanConfig(workerUrl, user);
                    break;
                case 'shadowsocks':
                    config = generateShadowsocksConfig(workerUrl, user);
                    break;
                default:
                    return new Response(JSON.stringify({ error: 'Invalid protocol' }), { 
                        status: 400, 
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                    });
            }
        }
        
        if (format === 'uri') {
            // For URI format, return plain text
            return new Response(config, { 
                headers: { 
                    ...corsHeaders, 
                    'Content-Type': 'text/plain'
                } 
            });
        } else {
            // For JSON format, return JSON
            return new Response(JSON.stringify({ config }), { 
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

// Function to generate VLESS URI format
function generateVLESSURI(workerUrl, user) {
    const uuid = user.uuid || generateId();
    const host = workerUrl;
    const path = "/vless";
    
    // VLESS URI format: vless://uuid@host:port?query#remark
    const params = new URLSearchParams({
        type: "ws",
        security: "tls",
        path: path,
        host: host,
        sni: host,
        fp: "chrome"
    });
    
    const remark = `Passage-${user.username}`;
    return `vless://${uuid}@${host}:443?${params.toString()}#${encodeURIComponent(remark)}`;
}

// Function to generate VMess URI format
function generateVMESSURI(workerUrl, user) {
    const config = generateVMESSConfig(workerUrl, user);
    const configStr = JSON.stringify(config);
    
    // Base64 encode the config
    function base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    
    return "vmess://" + base64Encode(configStr);
}

// Function to generate Trojan URI format
function generateTrojanURI(workerUrl, user) {
    const password = user.password || generateId();
    const host = workerUrl;
    const path = "/trojan";
    
    const params = new URLSearchParams({
        type: "ws",
        security: "tls",
        path: path,
        host: host
    });
    
    const remark = `Passage-${user.username}`;
    return `trojan://${password}@${host}:443?${params.toString()}#${encodeURIComponent(remark)}`;
}

// Function to generate Shadowsocks URI format
function generateShadowsocksURI(workerUrl, user) {
    const password = user.password || generateId();
    const method = user.method || "chacha20-ietf-poly1305";
    const host = workerUrl;
    const path = "/shadowsocks";
    
    // Base64 encode the method:password
    function base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    
    // ss://method:password@host:port#remark
    const encoded = base64Encode(`${method}:${password}`);
    const params = new URLSearchParams({
        plugin: `v2ray-plugin;tls;host=${host};path=${path}`
    });
    
    const remark = `Passage-${user.username}`;
    return `ss://${encoded}@${host}:443?${params.toString()}#${encodeURIComponent(remark)}`;
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

// مدیریت WebSocket برای VLESS
async function handleVlessWebSocket(request, userId) {
    return handleWebSocket(request, userId, 'vless');
}

// مدیریت WebSocket برای VMess
async function handleVmessWebSocket(request, userId) {
    return handleWebSocket(request, userId, 'vmess');
}

// مدیریت WebSocket برای Trojan
async function handleTrojanWebSocket(request, userId) {
    return handleWebSocket(request, userId, 'trojan');
}

// مدیریت WebSocket برای Shadowsocks
async function handleShadowsocksWebSocket(request, userId) {
    return handleWebSocket(request, userId, 'shadowsocks');
}

// تابع عمومی برای مدیریت WebSocket
async function handleWebSocket(request, userId, protocol) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // دریافت اطلاعات کاربر
    const workerUrl = getWorkerUrl(request);
    const userKey = `user_${workerUrl}_${userId}`;
    const userData = await KV.get(userKey);
    
    if (!userData) {
        return new Response('User not found', { status: 404 });
    }
    
    const user = JSON.parse(userData);
    
    // بررسی فعال بودن کاربر
    if (!isUserActive(user)) {
        return new Response('User account is not active', { status: 403 });
    }

    // بررسی تطابق پروتکل
    if (user.protocol !== protocol) {
        return new Response('Protocol mismatch', { status: 400 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    if (protocol === 'vless') {
        // Handle VLESS traffic with full routing implementation
        handleVlessTraffic(server, user, workerUrl, userKey);
    } else {
        // For other protocols, use the existing echo implementation
        server.addEventListener('message', async (event) => {
            try {
                // افزایش ترافیک استفاده شده
                user.traffic_used = (user.traffic_used || 0) + event.data.byteLength;
                await KV.put(userKey, JSON.stringify(user));
                
                // echo پیام به صورت ساده
                server.send(event.data);
            } catch (err) {
                console.error('WebSocket message error:', err);
            }
        });
    }

    server.addEventListener('close', () => {
        client.close();
    });

    server.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        client.close();
    });

    return new Response(null, {
        status: 101,
        webSocket: client,
    });
}

// VLESS WebSocket Routing Implementation (ported from vfarid.js)
async function handleVlessTraffic(webSocket, user, workerUrl, userKey) {
    let address = '';
    let port = 443;
    let remoteSocketWrapper = { value: null };
    let isDns = false;
    
    // Process VLESS header and handle traffic routing
    webSocket.addEventListener('message', async (event) => {
        try {
            if (remoteSocketWrapper.value) {
                // If we already have a remote connection, just forward the data
                const writer = remoteSocketWrapper.value.writable.getWriter();
                await writer.write(event.data);
                writer.releaseLock();
                
                // Update traffic stats
                const userData = await KV.get(userKey);
                if (userData) {
                    const currentUser = JSON.parse(userData);
                    currentUser.traffic_used = (currentUser.traffic_used || 0) + event.data.byteLength;
                    await KV.put(userKey, JSON.stringify(currentUser));
                }
                return;
            }
            
            // Parse VLESS header from the first message
            const chunk = event.data;
            if (!(chunk instanceof ArrayBuffer)) {
                console.error('Invalid data type for VLESS header');
                webSocket.close();
                return;
            }
            
            const vlessBuffer = new Uint8Array(chunk);
            if (vlessBuffer.byteLength < 24) {
                console.error('Invalid VLESS header');
                webSocket.close();
                return;
            }
            
            // Validate user
            const version = new Uint8Array(vlessBuffer.slice(0, 1));
            const userUUID = new Uint8Array(vlessBuffer.slice(1, 17));
            const expectedUUID = parseUUID(user.uuid || user.id);
            
            if (!arraysEqual(userUUID, expectedUUID)) {
                console.error('Invalid user UUID');
                webSocket.close();
                return;
            }
            
            // Parse command
            const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
            const command = new Uint8Array(
                vlessBuffer.slice(18 + optLength, 18 + optLength + 1)
            )[0];
            
            let isUDP = false;
            if (command === 1) {
                // TCP
            } else if (command === 2) {
                isUDP = true;
                // For UDP, we only support DNS (port 53)
                if (port !== 53) {
                    console.error('UDP proxy only enabled for DNS (port 53)');
                    webSocket.close();
                    return;
                }
                isDns = true;
            } else {
                console.error(`Unsupported command: ${command}`);
                webSocket.close();
                return;
            }
            
            // Parse port
            const portIndex = 18 + optLength + 1;
            const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
            port = new DataView(portBuffer).getUint16(0);
            
            // Parse address
            let addressIndex = portIndex + 2;
            const addressBuffer = new Uint8Array(
                vlessBuffer.slice(addressIndex, addressIndex + 1)
            );
            
            const addressType = addressBuffer[0];
            let addressLength = 0;
            let addressValueIndex = addressIndex + 1;
            let addressValue = '';
            
            switch (addressType) {
                case 1: // IPv4
                    addressLength = 4;
                    addressValue = new Uint8Array(
                        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
                    ).join('.');
                    break;
                case 2: // Domain name
                    addressLength = new Uint8Array(
                        vlessBuffer.slice(addressValueIndex, addressValueIndex + 1)
                    )[0];
                    addressValueIndex += 1;
                    addressValue = new TextDecoder().decode(
                        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
                    );
                    break;
                case 3: // IPv6
                    addressLength = 16;
                    const dataView = new DataView(
                        vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
                    );
                    const ipv6 = [];
                    for (let i = 0; i < 8; i++) {
                        ipv6.push(dataView.getUint16(i * 2).toString(16));
                    }
                    addressValue = ipv6.join(':');
                    break;
                default:
                    console.error(`Invalid address type: ${addressType}`);
                    webSocket.close();
                    return;
            }
            
            address = addressValue;
            
            if (!addressValue) {
                console.error('Empty address value');
                webSocket.close();
                return;
            }
            
            // Get raw client data (after VLESS header)
            const rawDataIndex = addressValueIndex + addressLength;
            const rawClientData = vlessBuffer.slice(rawDataIndex);
            
            // Handle DNS over UDP
            if (isDns) {
                // For DNS, we would normally forward to a DNS server
                // But for simplicity, we'll just echo back for now
                console.log('DNS request received - in a full implementation, this would be forwarded to a DNS server');
                
                // Update traffic stats
                const userData = await KV.get(userKey);
                if (userData) {
                    const currentUser = JSON.parse(userData);
                    currentUser.traffic_used = (currentUser.traffic_used || 0) + event.data.byteLength;
                    await KV.put(userKey, JSON.stringify(currentUser));
                }
                
                webSocket.send(event.data);
                return;
            }
            
            // Handle TCP connection
            const vlessResponseHeader = new Uint8Array([version[0], 0]);
            
            // Connect to remote server using Cloudflare's sockets API
            const tcpSocket = connect(address, port);
            remoteSocketWrapper.value = tcpSocket;
            
            // Send initial data
            const writer = tcpSocket.writable.getWriter();
            await writer.write(rawClientData);
            writer.releaseLock();
            
            // Update user traffic
            const userData = await KV.get(userKey);
            if (userData) {
                const currentUser = JSON.parse(userData);
                currentUser.traffic_used = (currentUser.traffic_used || 0) + rawClientData.byteLength;
                await KV.put(userKey, JSON.stringify(currentUser));
            }
            
            // Setup bidirectional data transfer
            // From remote server to WebSocket client
            tcpSocket.readable.pipeTo(new WritableStream({
                async write(chunk) {
                    if (webSocket.readyState !== 1) { // WebSocket OPEN state
                        return;
                    }
                    
                    // Send VLESS response header with first chunk
                    if (vlessResponseHeader) {
                        webSocket.send(await new Blob([vlessResponseHeader, chunk]).arrayBuffer());
                        vlessResponseHeader = null; // Only send header once
                    } else {
                        webSocket.send(chunk);
                    }
                },
                close() {
                    if (webSocket.readyState === 1) {
                        webSocket.close();
                    }
                },
                abort(reason) {
                    if (webSocket.readyState === 1) {
                        webSocket.close();
                    }
                }
            })).catch((error) => {
                console.error('TCP to WebSocket error:', error);
                try {
                    if (webSocket.readyState === 1) {
                        webSocket.close();
                    }
                } catch (e) {
                    console.error('Error closing WebSocket:', e);
                }
            });
            
            // From WebSocket client to remote server
            const messageHandler = async (event2) => {
                if (remoteSocketWrapper.value && remoteSocketWrapper.value.writable) {
                    try {
                        const writer2 = remoteSocketWrapper.value.writable.getWriter();
                        await writer2.write(event2.data);
                        writer2.releaseLock();
                        
                        // Update traffic stats
                        const userData2 = await KV.get(userKey);
                        if (userData2) {
                            const currentUser2 = JSON.parse(userData2);
                            currentUser2.traffic_used = (currentUser2.traffic_used || 0) + event2.data.byteLength;
                            await KV.put(userKey, JSON.stringify(currentUser2));
                        }
                    } catch (error) {
                        console.error('WebSocket to TCP write error:', error);
                    }
                }
            };
            
            webSocket.addEventListener('message', messageHandler);
            
            // Clean up event listener when connection closes
            webSocket.addEventListener('close', () => {
                webSocket.removeEventListener('message', messageHandler);
                if (remoteSocketWrapper.value) {
                    try {
                        remoteSocketWrapper.value.close();
                    } catch (e) {
                        console.error('Error closing TCP socket:', e);
                    }
                }
            });
            
        } catch (error) {
            console.error('Error processing VLESS traffic:', error);
            try {
                if (webSocket.readyState === 1) {
                    webSocket.close();
                }
            } catch (e) {
                console.error('Error closing WebSocket:', e);
            }
        }
    });
}

// Helper functions for VLESS implementation
function parseUUID(uuidString) {
    // Remove dashes and convert to byte array
    const hex = uuidString.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    
    return bytes;
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// اجرای ورکر
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});