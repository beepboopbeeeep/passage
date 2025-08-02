/**
 * Passage - Cloudflare Worker برای مدیریت کانفیگ‌های V2Ray
 */

// متغیرهای عمومی
let corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400' // 24 ساعت کش Preflight
};

/**
 * تابع اصلی worker
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * مدیریت درخواست‌ها
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // مدیریت Preflight CORS
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  // مسیرهای API
  if (path.startsWith('/api/')) {
    return handleApiRequest(request, path);
  }
  
  // مسیر اشتراک‌ها
  if (path.startsWith('/sub/')) {
    return handleSubscription(request, path);
  }
  
  // صفحه اصلی
  return new Response('Passage Worker is running here', { 
    headers: { 'content-type': 'text/plain' } 
  });
}

/**
 * مدیریت Preflight CORS
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

/**
 * مدیریت درخواست‌های API
 */
async function handleApiRequest(request, path) {
  try {
    // استخراج endpoint
    const endpoint = path.substring(4); // حذف /api
    
    // مسیرهای عمومی (بدون نیاز به احراز هویت)
    if (endpoint === '/login' && request.method === 'POST') {
      return await handleLogin(request);
    }
    
    // سایر مسیرها نیاز به احراز هویت دارند
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // مدیریت endpointهای مختلف
    switch (endpoint) {
      case '/users':
        if (request.method === 'GET') return await handleGetUsers(request);
        if (request.method === 'POST') return await handleCreateUser(request);
        break;
        
      case '/stats':
        if (request.method === 'GET') return await handleGetStats(request);
        break;
        
      case '/inbounds':
        if (request.method === 'GET') return await handleGetInbounds(request);
        if (request.method === 'POST') return await handleCreateInbound(request);
        break;
        
      case '/settings':
        if (request.method === 'PUT') return await handleUpdateSettings(request);
        break;
        
      default:
        // بررسی مسیرهای با پارامتر
        const userMatch = endpoint.match(/^\/users\/(.+)$/);
        const inboundMatch = endpoint.match(/^\/inbounds\/(.+)$/);
        const subMatch = endpoint.match(/^\/subscription\/(.+)$/);
        
        if (userMatch && request.method === 'DELETE') {
          return await handleDeleteUser(request, userMatch[1]);
        } else if (inboundMatch && request.method === 'DELETE') {
          return await handleDeleteInbound(request, inboundMatch[1]);
        } else if (subMatch && request.method === 'GET') {
          return await handleGetSubscription(request, subMatch[1]);
        }
    }
    
    // اگر مسیر یافت نشد
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * مدیریت درخواست اشتراک‌ها
 */
async function handleSubscription(request, path) {
  try {
    const clientId = path.substring(5); // حذف /sub/
    return await generateSubscription(clientId);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to generate subscription' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * احراز هویت کاربر
 */
async function handleLogin(request) {
  try {
    const { username, password } = await request.json();
    
    // دریافت اطلاعات احراز هویت از KV
    const authData = await AUTH.get('admin');
    
    if (!authData) {
      return new Response(JSON.stringify({ error: 'Authentication data not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const auth = JSON.parse(authData);
    
    // بررسی اطلاعات ورود
    if (username === auth.username && password === auth.password) {
      // ایجاد توکن
      const token = generateToken();
      
      // ذخیره توکن در KV
      await TOKENS.put(token, Date.now().toString(), { expirationTtl: 3600 }); // انقضا در 1 ساعت
      
      return new Response(JSON.stringify({ success: true, token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Login failed', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * تولید توکن احراز هویت
 */
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * بررسی توکن احراز هویت
 */
async function verifyToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return { success: false, error: 'Missing Authorization header' };
    }
    
    const token = authHeader.replace('Bearer ', '');
    const tokenData = await TOKENS.get(token);
    
    if (!tokenData) {
      return { success: false, error: 'Invalid token' };
    }
    
    const createdAt = parseInt(tokenData);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 ساعت به میلی‌ثانیه
    
    if (now - createdAt > oneHour) {
      // توکن منقضی شده است
      await TOKENS.delete(token);
      return { success: false, error: 'Token expired' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * دریافت آمار
 */
async function handleGetStats(request) {
  try {
    // دریافت تعداد کاربران
    const usersRaw = await USERS.list();
    const totalClients = usersRaw.keys.length;
    
    // دریافت تعداد اینباندها
    const inboundsRaw = await INBOUNDS.list();
    const activeInbounds = inboundsRaw.keys.length;
    
    // آمار اتصالات فعال (در اینجا یک مقدار ساده)
    const activeConnections = Math.floor(Math.random() * 100);
    
    return new Response(JSON.stringify({
      totalClients,
      activeInbounds,
      activeConnections
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get stats', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * دریافت لیست کاربران
 */
async function handleGetUsers(request) {
  try {
    const usersRaw = await USERS.list();
    const users = [];
    
    for (const key of usersRaw.keys) {
      const userData = await USERS.get(key.name);
      if (userData) {
        users.push(JSON.parse(userData));
      }
    }
    
    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get users', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * ایجاد کاربر جدید
 */
async function handleCreateUser(request) {
  try {
    const userData = await request.json();
    
    // تولید ID یکتا
    const id = crypto.randomUUID();
    
    // تولید UUID برای کاربر
    const uuid = generateUUID();
    
    // ایجاد آبجکت کاربر
    const user = {
      id,
      username: userData.username,
      protocol: userData.protocol,
      uuid,
      password: uuid, // برای پروتکل‌هایی که نیاز به پسورد دارند
      method: 'chacha20-ietf-poly1305', // برای Shadowsocks
      inboundId: '', // باید از لیست اینباندها انتخاب شود
      status: userData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // ذخیره کاربر در KV
    await USERS.put(id, JSON.stringify(user));
    
    return new Response(JSON.stringify({ success: true, user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create user', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * حذف کاربر
 */
async function handleDeleteUser(request, userId) {
  try {
    await USERS.delete(userId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete user', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * دریافت لیست اینباندها
 */
async function handleGetInbounds(request) {
  try {
    const inboundsRaw = await INBOUNDS.list();
    const inbounds = [];
    
    for (const key of inboundsRaw.keys) {
      const inboundData = await INBOUNDS.get(key.name);
      if (inboundData) {
        inbounds.push(JSON.parse(inboundData));
      }
    }
    
    return new Response(JSON.stringify({ inbounds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to get inbounds', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * ایجاد اینباند جدید
 */
async function handleCreateInbound(request) {
  try {
    const inboundData = await request.json();
    
    // تولید ID یکتا
    const id = crypto.randomUUID();
    
    // ایجاد آبجکت اینباند
    const inbound = {
      id,
      inbound_name: inboundData.inbound_name,
      protocol: inboundData.protocol,
      port: inboundData.port,
      network: inboundData.network,
      security: inboundData.security || 'tls',
      type: 'none', // نوع اینباند
      host: '', // باید از تنظیمات گرفته شود
      path: getPathByProtocol(inboundData.protocol, inboundData.network),
      sni: '', // باید از تنظیمات گرفته شود
      fp: 'chrome',
      status: 'فعال',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // ذخیره اینباند در KV
    await INBOUNDS.put(id, JSON.stringify(inbound));
    
    return new Response(JSON.stringify({ success: true, inbound }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create inbound', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * تعیین مسیر بر اساس پروتکل و شبکه
 */
function getPathByProtocol(protocol, network) {
  switch (protocol) {
    case 'vless':
    case 'vmess':
      return network === 'ws' ? '/vless-ws' : '/vless';
    case 'trojan':
      return network === 'ws' ? '/trojan-ws' : '/trojan';
    case 'shadowsocks':
      return network === 'ws' ? '/ss-ws' : '/ss';
    default:
      return '/';
  }
}

/**
 * حذف اینباند
 */
async function handleDeleteInbound(request, inboundId) {
  try {
    await INBOUNDS.delete(inboundId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete inbound', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * به‌روزرسانی تنظیمات (رمز عبور ادمین)
 */
async function handleUpdateSettings(request) {
  try {
    const { password } = await request.json();
    
    // دریافت اطلاعات فعلی
    const authData = await AUTH.get('admin');
    let auth;
    
    // اگر اطلاعات احراز هویت وجود نداشت، ایجاد کن
    if (!authData) {
      auth = {
        username: 'admin',
        password: password
      };
    } else {
      auth = JSON.parse(authData);
      // به‌روزرسانی رمز عبور
      auth.password = password;
    }
    
    // ذخیره در KV
    await AUTH.put('admin', JSON.stringify(auth));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update settings', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * دریافت لینک اشتراک کاربر
 */
async function handleGetSubscription(request, clientId) {
  try {
    const config = await generateUserConfig(clientId);
    if (!config) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(config, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    console.error('Error generating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate subscription', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * تولید کانفیگ کاربر
 */
async function generateUserConfig(clientId) {
  try {
    // دریافت اطلاعات کاربر
    const userData = await USERS.get(clientId);
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    
    // دریافت اطلاعات اینباند (در اینجا اولین اینباند موجود)
    const inboundsRaw = await INBOUNDS.list();
    if (!inboundsRaw.keys.length) return null;
    
    const inboundKey = inboundsRaw.keys[0].name;
    const inboundData = await INBOUNDS.get(inboundKey);
    if (!inboundData) return null;
    
    const inbound = JSON.parse(inboundData);
    
    // تولید کانفیگ بر اساس پروتکل
    let config = '';
    
    switch (user.protocol) {
      case 'vless':
        config = generateVLESSConfig(user, inbound);
        break;
      case 'vmess':
        config = generateVMessConfig(user, inbound);
        break;
      case 'trojan':
        config = generateTrojanConfig(user, inbound);
        break;
      case 'shadowsocks':
        config = generateShadowsocksConfig(user, inbound);
        break;
      default:
        return null;
    }
    
    return config;
  } catch (error) {
    console.error('Error generating user config:', error);
    return null;
  }
}

/**
 * تولید کانفیگ VLESS
 */
function generateVLESSConfig(user, inbound) {
  const config = `vless://${user.uuid}@example.com:443?encryption=none&security=tls&type=ws&host=example.com&path=${encodeURIComponent(inbound.path)}&sni=example.com&fp=chrome#${encodeURIComponent(user.username)}`;
  return config;
}

/**
 * تولید کانفیگ VMess
 */
function generateVMessConfig(user, inbound) {
  const config = {
    v: "2",
    ps: user.username,
    add: "example.com",
    port: "443",
    id: user.uuid,
    aid: "0",
    net: "ws",
    type: "none",
    host: "example.com",
    path: inbound.path,
    tls: "tls",
    sni: "example.com",
    alpn: ""
  };
  
  return "vmess://" + btoa(unescape(encodeURIComponent(JSON.stringify(config))));
}

/**
 * تولید کانفیگ Trojan
 */
function generateTrojanConfig(user, inbound) {
  return `trojan://${user.uuid}@example.com:443?security=tls&type=ws&path=${encodeURIComponent(inbound.path)}&host=example.com&sni=example.com#${encodeURIComponent(user.username)}`;
}

/**
 * تولید کانفیگ Shadowsocks
 */
function generateShadowsocksConfig(user, inbound) {
  const ssConfig = `${user.method}:${user.uuid}@example.com:443`;
  const encodedConfig = btoa(ssConfig);
  return `ss://${encodedConfig}?security=tls&type=ws&path=${encodeURIComponent(inbound.path)}&host=example.com&sni=example.com#${encodeURIComponent(user.username)}`;
}

/**
 * تولید اشتراک کاربر
 */
async function generateSubscription(clientId) {
  try {
    const config = await generateUserConfig(clientId);
    if (!config) {
      return new Response('User not found', { status: 404 });
    }
    
    // کدگذاری Base64
    const encodedConfig = btoa(config);
    
    return new Response(encodedConfig, {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response('Failed to generate subscription', { status: 500 });
  }
}

/**
 * تولید UUIDv4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}