const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store sessions
const userSessions = new Map();
const qrSessions = new Map();

// Parse cookies dari set-cookie headers
function parseSetCookies(setCookieHeaders) {
  const cookies = {};
  
  if (!setCookieHeaders) return cookies;
  
  setCookieHeaders.forEach(cookieStr => {
    try {
      const cookiePart = cookieStr.split(';')[0].trim();
      const [key, ...valueParts] = cookiePart.split('=');
      
      if (key && valueParts.length > 0) {
        cookies[key] = valueParts.join('=');
      }
    } catch (err) {
      console.log('❌ Parse cookie error:', err.message);
    }
  });
  
  return cookies;
}

// Generate REC_T_ID jika tidak ada
function generateRecTId() {
  const hex = '0123456789abcdef';
  let result = '';
  
  for (let i = 0; i < 8; i++) result += hex[Math.floor(Math.random() * 16)];
  result += '-';
  for (let i = 0; i < 4; i++) result += hex[Math.floor(Math.random() * 16)];
  result += '-11f0-';
  for (let i = 0; i < 4; i++) result += hex[Math.floor(Math.random() * 16)];
  result += '-';
  for (let i = 0; i < 12; i++) result += hex[Math.floor(Math.random() * 16)];
  
  return result;
}

// Format cookies dengan warna untuk web
function formatCookiesForWeb(cookies) {
  const cookieOrder = [
    'REC_T_ID',
    'SPC_R_T_ID',
    'SPC_R_T_IV',
    'SPC_T_ID',
    'SPC_T_IV',
    'SPC_SI',
    'SPC_SEC_SI',
    'SPC_F',
    'SPC_ST',
    'SPC_EC',
    'SPC_CLIENTID',
    'SPC_U'
  ];
  
  let result = '';
  cookieOrder.forEach(key => {
    if (cookies[key]) {
      if (key.startsWith('SPC_')) {
        result += `<span class="cookie-spc">${key}=${cookies[key]}</span>; `;
      } else {
        result += `<span class="cookie-other">${key}=${cookies[key]}</span>; `;
      }
    }
  });
  
  return result.trim().replace(/; $/, '');
}

// =================== ROUTES ===================

// Serve main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Generate QR Code
app.post('/api/generate-qr', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://shopee.co.id/buyer/login',
      'Origin': 'https://shopee.co.id',
      'X-API-Source': 'pc',
      'X-Shopee-Language': 'id',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    };

    const response = await axios.get(
      'https://shopee.co.id/api/v2/authentication/gen_qrcode',
      { headers, timeout: 15000 }
    );

    if (response.data && response.data.data) {
      const qrcodeData = response.data.data;
      
      qrSessions.set(sessionId, {
        qrcode_id: qrcodeData.qrcode_id,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        qrcode_id: qrcodeData.qrcode_id,
        qrcode_base64: qrcodeData.qrcode_base64
      });
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    console.error('QR Code error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Check QR Status
app.post('/api/check-qr', async (req, res) => {
  try {
    const { qrcodeId, sessionId } = req.body;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://shopee.co.id/buyer/login/qr',
      'X-API-Source': 'pc',
      'X-Shopee-Language': 'id',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const response = await axios.get(
      `https://shopee.co.id/api/v2/authentication/qrcode_status?qrcode_id=${encodeURIComponent(qrcodeId)}`,
      { headers, timeout: 10000 }
    );

    if (response.data && response.data.data) {
      const data = response.data.data;
      
      if (data.status === 'CONFIRMED' || data.status === 'confirmed') {
        res.json({
          status: 'confirmed',
          qrcode_token: data.qrcode_token
        });
      } else if (data.status === 'EXPIRED' || data.status === 'expired') {
        res.json({ status: 'expired' });
      } else {
        res.json({ status: 'waiting' });
      }
    } else {
      res.json({ status: 'waiting' });
    }
  } catch (error) {
    console.error('Check QR error:', error.message);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// API: Login with QR
app.post('/api/login-qr', async (req, res) => {
  try {
    const { qrcodeId, qrcodeToken, sessionId } = req.body;
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      'Referer': 'https://shopee.co.id/buyer/login/qr',
      'Origin': 'https://shopee.co.id',
      'X-API-Source': 'pc',
      'X-Shopee-Language': 'id',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const response = await axios.post(
      'https://shopee.co.id/api/v2/authentication/qrcode_login',
      { 
        qrcode_id: qrcodeId,
        qrcode_token: qrcodeToken,
        device_info: {
          device_id: `web_${Date.now()}`,
          device_type: 'web',
          device_name: 'Chrome',
          device_model: 'PC',
          device_os: 'Windows'
        }
      },
      { 
        headers, 
        timeout: 15000
      }
    );

    if (response.headers['set-cookie']) {
      let cookies = parseSetCookies(response.headers['set-cookie']);
      
      if (!cookies['REC_T_ID']) {
        cookies['REC_T_ID'] = generateRecTId();
      }
      
      if (!cookies['SPC_CLIENTID'] && cookies['SPC_F']) {
        cookies['SPC_CLIENTID'] = Buffer.from(cookies['SPC_F']).toString('base64');
      }
      
      if (!cookies['SPC_R_T_ID'] && cookies['SPC_T_ID']) {
        cookies['SPC_R_T_ID'] = cookies['SPC_T_ID'];
      }
      
      if (!cookies['SPC_R_T_IV'] && cookies['SPC_T_IV']) {
        cookies['SPC_R_T_IV'] = cookies['SPC_T_IV'];
      }
      
      if (!cookies['SPC_U'] && response.data && response.data.data && response.data.data.userid) {
        cookies['SPC_U'] = response.data.data.userid.toString();
      }
      
      const coloredCookies = formatCookiesForWeb(cookies);
      
      userSessions.set(sessionId, {
        cookies,
        coloredCookies,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        coloredCookies,
        rawCookies: cookies
      });
    } else {
      res.json({ success: false, error: 'No cookies received' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Check Account
app.post('/api/check-account', async (req, res) => {
  try {
    const { cookies, sessionId } = req.body;
    
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': cookieString,
      'Referer': 'https://shopee.co.id/user/account/profile',
      'X-API-Source': 'pc',
      'X-Shopee-Language': 'id',
      'X-Requested-With': 'XMLHttpRequest'
    };

    let profileData = null;
    try {
      const profileResponse = await axios.get(
        'https://shopee.co.id/api/v4/account/get_profile',
        { headers, timeout: 10000 }
      );

      if (profileResponse.data && profileResponse.data.data && profileResponse.data.data.user_profile) {
        profileData = profileResponse.data.data.user_profile;
      }
    } catch (profileError) {
      console.log('Profile check error:', profileError.message);
    }

    let accountData = { phone: '-', email: '-', name: '-' };
    try {
      const accountResponse = await axios.get(
        'https://shopee.co.id/api/v4/account/basic/get_account_info',
        { headers, timeout: 10000 }
      );

      if (accountResponse.data && accountResponse.data.data) {
        const data = accountResponse.data.data;
        accountData = {
          phone: data.phone || data.full_phone || data.masked_phone || '-',
          email: data.email || data.masked_email || '-',
          name: data.name || '-'
        };
      }
    } catch (accountError) {
      console.log('Account info check error:', accountError.message);
    }

    const coloredCookies = formatCookiesForWeb(cookies);
    
    userSessions.set(sessionId, {
      cookies,
      coloredCookies,
      accountInfo: {
        profile: profileData,
        account: accountData
      },
      timestamp: Date.now()
    });

    res.json({
      success: true,
      profile: profileData ? {
        userid: profileData.userid,
        shopid: profileData.shopid,
        username: profileData.username || '-',
        nickname: profileData.nickname || '-',
        gender: profileData.gender === 1 ? 'Laki-laki' : 
               profileData.gender === 2 ? 'Perempuan' : '-'
      } : null,
      account: accountData,
      coloredCookies
    });
    
  } catch (error) {
    console.error('Check account error:', error.message);
    if (error.response && error.response.status === 403) {
      res.json({ success: false, error: 'Cookie expired atau tidak valid' });
    } else {
      res.json({ success: false, error: error.message });
    }
  }
});

// API: Parse cookies string
app.post('/api/parse-cookies', (req, res) => {
  try {
    const { cookieString } = req.body;
    
    const cookies = {};
    const pairs = cookieString.split(';');
    
    pairs.forEach(pair => {
      const trimmed = pair.trim();
      if (trimmed) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          cookies[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    const requiredCookies = ['SPC_T_ID', 'SPC_EC'];
    const missingCookies = requiredCookies.filter(cookie => !cookies[cookie]);
    
    if (missingCookies.length > 0) {
      return res.json({ 
        success: false, 
        error: `Cookies tidak lengkap. Diperlukan: ${missingCookies.join(', ')}` 
      });
    }
    
    res.json({ success: true, cookies });
  } catch (error) {
    res.json({ success: false, error: 'Format cookies tidak valid' });
  }
});

// API: Get session data
app.get('/api/session/:sessionId', (req, res) => {
  const sessionData = userSessions.get(req.params.sessionId);
  if (sessionData) {
    res.json({ success: true, data: sessionData });
  } else {
    res.json({ success: false, error: 'Session not found' });
  }
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    sessions: userSessions.size,
    qrSessions: qrSessions.size
  });
});

// Cleanup old sessions setiap 5 menit
setInterval(() => {
  const now = Date.now();
  const oneHour = 3600000;
  
  for (const [sessionId, sessionData] of userSessions.entries()) {
    if (sessionData.timestamp && now - sessionData.timestamp > oneHour) {
      userSessions.delete(sessionId);
    }
  }
  
  for (const [sessionId, qrData] of qrSessions.entries()) {
    if (qrData.timestamp && now - qrData.timestamp > 600000) {
      qrSessions.delete(sessionId);
    }
  }
}, 300000);

// Catch all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export untuk Vercel
module.exports = app;
