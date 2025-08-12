// Cloudflare Worker for collecting and serving V2Ray configurations
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
    const allowedOrigins = [url.origin]; // Allow same origin by default
    const origin = request.headers.get('Origin');
    
    const corsHeaders = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    };

    // If origin is allowed or it's a same-origin request, add specific origin
    if (!origin || allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin || url.origin;
    } else {
      // For other cases, use a more restrictive policy
      corsHeaders['Access-Control-Allow-Origin'] = url.origin;
    }

    // Add security headers
    corsHeaders['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; connect-src 'self';";
    corsHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    corsHeaders['X-Content-Type-Options'] = 'nosniff';
    corsHeaders['X-Frame-Options'] = 'DENY';
    corsHeaders['X-XSS-Protection'] = '1; mode=block';

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders 
      });
    }

    // Rate limiting for sensitive endpoints
    if (path === '/api/collect' || path === '/api/cleanup' || path === '/api/donate') {
      const clientIP = request.headers.get('CF-Connecting-IP');
      
      // Create a rate limiter key based on IP and endpoint
      const rateLimitKey = `rate_limit:${clientIP}${path}`;
      
      // Get current count from KV
      const currentCount = await env.COLLECT.get(rateLimitKey);
      const count = currentCount ? parseInt(currentCount) + 1 : 1;
      
      // Set the value back with expiration (if not first request)
      if (count > 1) {
        if (count > 5) { // Limit to 5 requests per minute
          return new Response(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        // First request, set expiration to 1 minute
        await env.COLLECT.put(rateLimitKey, '1', { expirationTtl: 60 });
      }
      
      // Update the count
      await env.COLLECT.put(rateLimitKey, count.toString());
    }

    // API Routes
    if (path === '/api/configs') {
      return handleGetConfigs(env, corsHeaders);
    } else if (path === '/api/today') {
      return handleGetTodaysConfigs(env, corsHeaders);
    } else if (path === '/api/collect') {
      return handleCollectConfigs(env, corsHeaders);
    } else if (path === '/api/active') {
      return handleGetActiveConfigs(env, corsHeaders);
    } else if (path === '/api/donated') {
      return handleGetDonatedConfigs(env, corsHeaders);
    } else if (path.startsWith('/api/sub/')) {
      return handleSubscriptionLink(path, env, corsHeaders);
    } else if (path.startsWith('/api/protocol/')) {
      return handleProtocolFilter(path, env, corsHeaders);
    } else if (path.startsWith('/api/location/')) {
      return handleLocationFilter(path, env, corsHeaders);
    } else if (path === '/api/configs/count') {
      return handleGetConfigCount(env, corsHeaders);
    } else if (path === '/api/cleanup') {
      return handleCleanup(env, corsHeaders);
    } else if (path === '/api/donate') {
      return handleDonateConfig(request, env, corsHeaders);
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

// Handle getting latest 10 configs
async function handleGetConfigs(env, corsHeaders) {
  try {
    // Try to get from cache first
    const cacheKey = 'configs_latest';
    const cached = await env.COLLECT.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const keys = await env.COLLECT.list({ prefix: 'config:', limit: 10 });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        configs.push(JSON.parse(config));
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
    
    // Cache for 5 minutes
    const jsonResponse = JSON.stringify(configs);
    await env.COLLECT.put(cacheKey, jsonResponse, { expirationTtl: 300 });

    return new Response(jsonResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch configs' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle getting today's configs
async function handleGetTodaysConfigs(env, corsHeaders) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        const configDate = new Date(configData.collectedAt);
        configDate.setHours(0, 0, 0, 0);
        
        if (configDate.getTime() === todayTimestamp) {
          configs.push(configData);
        }
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

    return new Response(JSON.stringify(configs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch today\'s configs' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle getting active configs
async function handleGetActiveConfigs(env, corsHeaders) {
  try {
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        // Only include active configs (last checked within the last 3 hours)
        const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
        if (new Date(configData.lastChecked).getTime() > threeHoursAgo) {
          configs.push(configData);
        }
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

    return new Response(JSON.stringify(configs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch active configs' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle getting donated configs
async function handleGetDonatedConfigs(env, corsHeaders) {
  try {
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        // Only include donated configs
        if (configData.donated) {
          configs.push(configData);
        }
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

    return new Response(JSON.stringify(configs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch donated configs' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle subscription links
async function handleSubscriptionLink(path, env, corsHeaders) {
  try {
    const pathParts = path.split('/');
    const dateStr = pathParts[3]; // Extract date from path
    const type = pathParts[4]; // Extract type (optional)
    
    let keys;
    if (type === 'active') {
      // For active configs subscription
      keys = await env.COLLECT.list({ prefix: 'config:' });
    } else if (dateStr === 'donated') {
      // For donated configs subscription
      keys = await env.COLLECT.list({ prefix: 'config:' });
    } else {
      // For date-based subscription
      keys = await env.COLLECT.list({ prefix: `config:${dateStr}` });
    }
    
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        
        if (type === 'active') {
          // Only include active configs
          const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
          if (new Date(configData.lastChecked).getTime() > threeHoursAgo) {
            configs.push(configData.raw);
          }
        } else if (dateStr === 'donated') {
          // Only include donated configs
          if (configData.donated) {
            configs.push(configData.raw);
          }
        } else {
          // Date-based filtering
          configs.push(configData.raw);
        }
      }
    }

    const subscriptionContent = configs.join('\n');
    const encodedContent = btoa(subscriptionContent);

    return new Response(encodedContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/plain',
        'Content-Disposition': 'inline; filename="subscribe.txt"'
      }
    });
  } catch (error) {
    return new Response('Subscription not found', { status: 404 });
  }
}

// Handle protocol filtering
async function handleProtocolFilter(path, env, corsHeaders) {
  try {
    const protocol = path.split('/')[3]; // Extract protocol from path
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        if (configData.protocol === protocol) {
          configs.push(configData);
        }
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

    return new Response(JSON.stringify(configs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch configs by protocol' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle location filtering
async function handleLocationFilter(path, env, corsHeaders) {
  try {
    const location = path.split('/')[3]; // Extract location from path
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    const configs = [];

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        // Only include active configs for location filtering
        const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
        if (configData.ipLocation === location && new Date(configData.lastChecked).getTime() > threeHoursAgo) {
          configs.push(configData);
        }
      }
    }

    // Sort by date (newest first)
    configs.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

    return new Response(JSON.stringify(configs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch configs by location' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle config count
async function handleGetConfigCount(env, corsHeaders) {
  try {
    // Try to get from cache first
    const cacheKey = 'config_counts';
    const cached = await env.COLLECT.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    let total = 0;
    let todayCount = 0;
    let activeCount = 0;
    let donatedCount = 0;

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        total++;
        const configData = JSON.parse(config);
        const configDate = new Date(configData.collectedAt);
        configDate.setHours(0, 0, 0, 0);
        
        if (configDate.getTime() === todayTimestamp) {
          todayCount++;
        }
        
        // Count active configs
        const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
        if (new Date(configData.lastChecked).getTime() > threeHoursAgo) {
          activeCount++;
        }
        
        // Count donated configs
        if (configData.donated) {
          donatedCount++;
        }
      }
    }
    
    const counts = { total, today: todayCount, active: activeCount, donated: donatedCount };
    
    // Cache for 1 minute
    const jsonResponse = JSON.stringify(counts);
    await env.COLLECT.put(cacheKey, jsonResponse, { expirationTtl: 60 });

    return new Response(jsonResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch counts' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle collecting configs from Telegram channels
async function handleCollectConfigs(env, corsHeaders) {
  try {
    // Clear cache before collecting new configs
    await clearCache(env);
    
    // List of Telegram channels to collect from
    // In a real implementation, these would be actual Telegram channel names or IDs
    const telegramChannels = [
      'v2ray_configs',
      'free_vpn_channels', 
      'telegram_proxy_channels'
    ];
    
    let collectedCount = 0;
    let errors = [];
    
    // Process each channel
    for (const channel of telegramChannels) {
      try {
        // Collect configurations from the channel
        const configs = await collectFromChannel(channel, env);
        collectedCount += configs.length;
      } catch (error) {
        console.error(`Error collecting from channel ${channel}:`, error);
        errors.push({
          channel,
          error: error.message
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      message: 'Collection process completed',
      collected: collectedCount,
      errors: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in handleCollectConfigs:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to collect configs',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to clear cache
async function clearCache(env) {
  try {
    await env.COLLECT.delete('configs_latest');
    await env.COLLECT.delete('config_counts');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Helper function to collect configs from a specific Telegram channel
async function collectFromChannel(channel, env) {
  // This function would interface with Telegram API in a real implementation
  // For demonstration, we'll generate sample valid configurations
  
  const configs = [];
  const protocolTypes = ['vmess', 'vless', 'trojan', 'ss'];
  const countries = [
    { code: '🇺🇸', name: 'United States' },
    { code: '🇬🇧', name: 'United Kingdom' },
    { code: '🇩🇪', name: 'Germany' },
    { code: '🇫🇷', name: 'France' },
    { code: '🇯🇵', name: 'Japan' },
    { code: '🇰🇷', name: 'South Korea' },
    { code: '🇸🇬', name: 'Singapore' },
    { code: '🇮🇳', name: 'India' },
    { code: '🇨🇦', name: 'Canada' },
    { code: '🇦🇺', name: 'Australia' }
  ];
  
  // Generate 3-5 sample configurations per channel
  const configCount = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < configCount; i++) {
    const protocol = protocolTypes[Math.floor(Math.random() * protocolTypes.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const timestamp = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)); // Within last week
    
    // Generate a sample config based on protocol
    let rawConfig;
    switch (protocol) {
      case 'vmess':
        rawConfig = `vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJob3N0IjoiZXhhbXBsZS5jb20iLCJpZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCIsIm5ldCI6IndzIiwicGF0aCI6Ii92bWVzcyIsInBvcnQiOjgwLCJwcyI6IlZNRVNTX0NPTkZJR197Y2hhbm5lbH0iLCJ0bHMiOiJub25lIiwidHlwZSI6Im5vbmUiLCJ2IjowfQ==`;
        break;
      case 'vless':
        rawConfig = `vless://00000000-0000-0000-0000-000000000000@example.com:443?encryption=none&security=tls&type=ws&host=example.com&path=/vless#${channel}`;
        break;
      case 'trojan':
        rawConfig = `trojan://password@example.com:443?security=tls&type=tcp#${channel}`;
        break;
      case 'ss':
        rawConfig = `ss://YWVzLTI1Ni1jZmI6cGFzc3dvcmQ@127.0.0.1:8080#${channel}`;
        break;
    }
    
    const config = {
      id: `${channel}-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      raw: rawConfig,
      remark: `${country.code} | ${timestamp.toISOString().split('T')[0]} | @${channel}`,
      flag: country.code,
      ipLocation: country.name,
      protocol: protocol,
      collectedAt: timestamp.toISOString(),
      lastChecked: new Date().toISOString(),
      donated: false
    };
    
    // Validate and store the config
    if (isValidConfig(config)) {
      // Check if config already exists to avoid duplicates
      const existing = await env.COLLECT.get(`config:${config.id}`);
      if (!existing) {
        await env.COLLECT.put(`config:${config.id}`, JSON.stringify(config));
        configs.push(config);
      }
    }
  }
  
  return configs;
}

// Validate configuration data
function isValidConfig(config) {
  // Check if all required fields are present
  if (!config.id || !config.raw || !config.remark || !config.protocol || 
      !config.collectedAt || !config.lastChecked) {
    return false;
  }
  
  // Check if raw config is a valid V2Ray URI
  if (!config.raw.startsWith('vmess://') && 
      !config.raw.startsWith('vless://') && 
      !config.raw.startsWith('trojan://') && 
      !config.raw.startsWith('ss://')) {
    return false;
  }
  
  return true;
}

// Handle cleanup of inactive configs
async function handleCleanup(env, corsHeaders) {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const keys = await env.COLLECT.list({ prefix: 'config:' });
    let deletedCount = 0;

    for (const key of keys.keys) {
      const config = await env.COLLECT.get(key.name);
      if (config) {
        const configData = JSON.parse(config);
        // Delete configs that haven't been checked in over 24 hours
        if (new Date(configData.lastChecked).getTime() < oneDayAgo) {
          await env.COLLECT.delete(key.name);
          deletedCount++;
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Cleanup completed', 
      deleted: deletedCount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to perform cleanup' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handle config donation
async function handleDonateConfig(request, env, corsHeaders) {
  try {
    // Clear cache when a config is donated
    await clearCache(env);
    
    const data = await request.json();
    const configId = data.configId;
    
    // Get the config
    const config = await env.COLLECT.get(`config:${configId}`);
    if (!config) {
      return new Response(JSON.stringify({ error: 'Config not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse and update the config
    const configData = JSON.parse(config);
    configData.donated = true;
    
    // Save the updated config
    await env.COLLECT.put(`config:${configId}`, JSON.stringify(configData));
    
    return new Response(JSON.stringify({ 
      message: 'Config donated successfully',
      config: configData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to donate config' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}