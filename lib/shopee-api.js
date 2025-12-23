import axios from 'axios';

// Global store untuk sessions (in-memory)
const userSessions = new Map();
const qrSessions = new Map();

// Parse cookies dari set-cookie headers
export function parseSetCookies(setCookieHeaders) {
    const cookies = {};
    
    if (!setCookieHeaders) return cookies;
    
    setCookieHeaders.forEach(cookieStr => {
        try {
            const cookiePart = cookieStr.split(';')[0].trim();
            const [key, ...valueParts] = cookiePart.split('=');
            
            if (key && valueParts.length > 0) {
                cookies[key.trim()] = valueParts.join('=').trim();
            }
        } catch (err) {
            console.log('❌ Parse cookie error:', err.message);
        }
    });
    
    return cookies;
}

// Parse cookies dari string input user
export function parseCookiesFromString(cookieString) {
    const cookies = {};
    
    if (!cookieString) return cookies;
    
    // Clean the cookie string
    let cleaned = cookieString.trim();
    
    // Split by semicolon
    const pairs = cleaned.split(';');
    
    pairs.forEach(pair => {
        const trimmed = pair.trim();
        if (trimmed) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                // Only add if not empty
                if (key.trim() && value) {
                    cookies[key.trim()] = value;
                }
            }
        }
    });
    
    return cookies;
}

// Generate REC_T_ID jika tidak ada
export function generateRecTId() {
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

// Format cookies untuk bash/string
export function formatCookiesForBash(cookies) {
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
            result += `${key}=${cookies[key]}; `;
        }
    });
    
    return result.trim().replace(/; $/, '');
}

// Format cookies dengan warna untuk web
export function formatCookiesForWeb(cookies) {
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
                // Tambahkan class untuk styling
                result += `<span class="cookie-spc">${key}=${cookies[key]}</span>; `;
            } else {
                result += `<span class="cookie-other">${key}=${cookies[key]}</span>; `;
            }
        }
    });
    
    return result.trim().replace(/; $/, '');
}

// Store sessions
export const sessions = {
    userSessions,
    qrSessions,
    
    // Cleanup old sessions
    cleanup: () => {
        const now = Date.now();
        const oneHour = 3600000;
        let cleaned = 0;
        
        for (const [sessionId, sessionData] of userSessions.entries()) {
            if (sessionData.timestamp && now - sessionData.timestamp > oneHour) {
                userSessions.delete(sessionId);
                cleaned++;
            }
        }
        
        for (const [sessionId, qrData] of qrSessions.entries()) {
            if (qrData.timestamp && now - qrData.timestamp > 600000) { // 10 menit
                qrSessions.delete(sessionId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired sessions`);
        }
    }
};

// Run cleanup setiap 5 menit
setInterval(sessions.cleanup, 300000);