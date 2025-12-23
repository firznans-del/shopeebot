import axios from 'axios';
import { 
    sessions, 
    parseSetCookies, 
    generateRecTId,
    formatCookiesForWeb,
    formatCookiesForBash 
} from '../../lib/shopee-api.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    console.log('🔵 POST /api/login-qr');
    
    try {
        const { qrcodeId, qrcodeToken, sessionId } = req.body;
        
        if (!qrcodeId || !qrcodeToken) {
            return res.status(400).json({ 
                success: false, 
                error: 'QR Code ID dan Token diperlukan' 
            });
        }
        
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

        console.log('🔐 Logging in with QR...');

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
                timeout: 15000,
                withCredentials: true 
            }
        );

        console.log('✅ Login response received');

        if (response.headers['set-cookie']) {
            let cookies = parseSetCookies(response.headers['set-cookie']);
            
            console.log(`📦 Received ${Object.keys(cookies).length} cookies`);
            
            // Generate REC_T_ID jika tidak ada
            if (!cookies['REC_T_ID']) {
                cookies['REC_T_ID'] = generateRecTId();
            }
            
            // Generate SPC_CLIENTID dari SPC_F
            if (!cookies['SPC_CLIENTID'] && cookies['SPC_F']) {
                cookies['SPC_CLIENTID'] = Buffer.from(cookies['SPC_F']).toString('base64');
            }
            
            // Pastikan SPC_R_T_ID sama dengan SPC_T_ID
            if (!cookies['SPC_R_T_ID'] && cookies['SPC_T_ID']) {
                cookies['SPC_R_T_ID'] = cookies['SPC_T_ID'];
            }
            
            // Pastikan SPC_R_T_IV sama dengan SPC_T_IV
            if (!cookies['SPC_R_T_IV'] && cookies['SPC_T_IV']) {
                cookies['SPC_R_T_IV'] = cookies['SPC_T_IV'];
            }
            
            // Get userid dari response jika SPC_U tidak ada
            if (!cookies['SPC_U'] && response.data && response.data.data && response.data.data.userid) {
                cookies['SPC_U'] = response.data.data.userid.toString();
            }
            
            const coloredCookies = formatCookiesForWeb(cookies);
            const bashCookies = formatCookiesForBash(cookies);
            
            // Simpan cookies untuk session
            sessions.userSessions.set(sessionId, {
                cookies,
                coloredCookies,
                bashCookies,
                timestamp: Date.now()
            });

            console.log(`💾 Session saved: ${sessionId}`);

            res.status(200).json({
                success: true,
                coloredCookies,
                bashCookies,
                rawCookies: cookies
            });
        } else {
            console.log('❌ No cookies received');
            res.status(200).json({ 
                success: false, 
                error: 'Tidak ada cookies yang diterima dari Shopee' 
            });
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Gagal login dengan QR Code. Coba lagi.' 
        });
    }
}