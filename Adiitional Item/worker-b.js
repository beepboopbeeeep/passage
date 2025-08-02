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
        const workerUrl = new URL(request.url).searchParams.get('workerUrl');
        
        // بررسی توکن
        const storedToken = await KV.get(`token_${workerUrl}`);
        if (storedToken !== token) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }
        
        // بررسی وجود workerUrl
        if (!workerUrl) {
            return new Response(JSON.stringify({ error: 'Missing workerUrl' }), { 
                status: 400, 
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