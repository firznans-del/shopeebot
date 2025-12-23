import axios from 'axios';
import { 
    sessions, 
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
    
    console.log('🔵 POST /api/check-account');
    
    try {
        const { cookies, sessionId } = req.body;
        
        if (!cookies || Object.keys(cookies).length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cookies kosong. Silakan masukkan cookies yang valid.' 
            });
        }
        
        console.log(`🔍 Checking account with ${Object.keys(cookies).length} cookies`);
        
        // Format cookies untuk request
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
        let accountData = { phone: '-', email: '-', name: '-' };
        
        try {
            // Cek profil dulu
            console.log('📡 Checking profile...');
            const profileResponse = await axios.get(
                'https://shopee.co.id/api/v4/account/get_profile',
                { 
                    headers, 
                    timeout: 10000 
                }
            );

            if (profileResponse.data && 
                profileResponse.data.data && 
                profileResponse.data.data.user_profile) {
                profileData = profileResponse.data.data.user_profile;
                console.log('✅ Profile data received');
            }
        } catch (profileError) {
            console.log('⚠️ Profile check error:', profileError.message);
        }

        try {
            // Cek info akun
            console.log('📡 Checking account info...');
            const accountResponse = await axios.get(
                'https://shopee.co.id/api/v4/account/basic/get_account_info',
                { 
                    headers, 
                    timeout: 10000 
                }
            );

            if (accountResponse.data && accountResponse.data.data) {
                const data = accountResponse.data.data;
                accountData = {
                    phone: data.phone || data.full_phone || data.masked_phone || '-',
                    email: data.email || data.masked_email || '-',
                    name: data.name || '-'
                };
                console.log('✅ Account data received');
            }
        } catch (accountError) {
            console.log('⚠️ Account info check error:', accountError.message);
        }

        const coloredCookies = formatCookiesForWeb(cookies);
        const bashCookies = formatCookiesForBash(cookies);
        
        // Update session
        sessions.userSessions.set(sessionId, {
            cookies,
            coloredCookies,
            bashCookies,
            accountInfo: {
                profile: profileData,
                account: accountData
            },
            timestamp: Date.now()
        });

        console.log('✅ Account check completed successfully');

        res.status(200).json({
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
            coloredCookies,
            bashCookies
        });
        
    } catch (error) {
        console.error('❌ Check account error:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            
            if (error.response.status === 403) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Cookie expired atau tidak valid. Silakan login ulang.' 
                });
            } else if (error.response.status === 401) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Autentikasi gagal. Cookies mungkin salah.' 
                });
            }
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Gagal mengecek akun. Coba lagi.' 
        });
    }
}