import { 
    parseCookiesFromString, 
    generateRecTId 
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
    
    console.log('🔵 POST /api/parse-cookies');
    
    try {
        const { cookieString } = req.body;
        
        if (!cookieString || cookieString.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cookies string kosong' 
            });
        }
        
        const cookies = parseCookiesFromString(cookieString);
        
        console.log(`📊 Parsed ${Object.keys(cookies).length} cookies`);
        
        // Validate required cookies
        const requiredCookies = ['SPC_T_ID', 'SPC_EC'];
        const missingCookies = requiredCookies.filter(cookie => !cookies[cookie]);
        
        if (missingCookies.length > 0) {
            console.log(`❌ Missing cookies: ${missingCookies.join(', ')}`);
            return res.status(400).json({ 
                success: false, 
                error: `Cookies tidak lengkap. Diperlukan: ${missingCookies.join(', ')}`,
                missingCookies 
            });
        }
        
        // Tambahkan REC_T_ID jika tidak ada
        if (!cookies['REC_T_ID']) {
            cookies['REC_T_ID'] = generateRecTId();
        }
        
        // Tambahkan SPC_CLIENTID jika tidak ada
        if (!cookies['SPC_CLIENTID'] && cookies['SPC_F']) {
            cookies['SPC_CLIENTID'] = Buffer.from(cookies['SPC_F']).toString('base64');
        }
        
        res.status(200).json({ 
            success: true, 
            cookies,
            count: Object.keys(cookies).length 
        });
    } catch (error) {
        console.error('❌ Parse cookies error:', error.message);
        res.status(400).json({ 
            success: false, 
            error: 'Format cookies tidak valid. Pastikan format: key=value; key2=value2;' 
        });
    }
}