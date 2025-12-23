import axios from 'axios';

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
    
    console.log('🔵 POST /api/check-qr');
    
    try {
        const { qrcodeId, sessionId } = req.body;
        
        if (!qrcodeId) {
            return res.status(400).json({ 
                success: false, 
                error: 'QR Code ID diperlukan' 
            });
        }
        
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
            { 
                headers, 
                timeout: 10000, 
                withCredentials: true 
            }
        );

        if (response.data && response.data.data) {
            const data = response.data.data;
            
            if (data.status === 'CONFIRMED' || data.status === 'confirmed') {
                console.log(`✅ QR Code confirmed: ${qrcodeId}`);
                res.status(200).json({
                    status: 'confirmed',
                    qrcode_token: data.qrcode_token
                });
            } else if (data.status === 'EXPIRED' || data.status === 'expired') {
                console.log(`❌ QR Code expired: ${qrcodeId}`);
                res.status(200).json({ status: 'expired' });
            } else {
                res.status(200).json({ status: 'waiting' });
            }
        } else {
            res.status(200).json({ status: 'waiting' });
        }
    } catch (error) {
        console.error('❌ Check QR error:', error.message);
        res.status(500).json({ 
            status: 'error', 
            error: error.message 
        });
    }
}