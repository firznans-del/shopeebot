import axios from 'axios';
import { sessions } from '../../lib/shopee-api.js';

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
    
    console.log('🔵 POST /api/generate-qr');
    
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID diperlukan' 
            });
        }
        
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

        console.log('📡 Generating QR Code...');
        
        const response = await axios.get(
            'https://shopee.co.id/api/v2/authentication/gen_qrcode',
            { 
                headers, 
                timeout: 15000, 
                withCredentials: true 
            }
        );

        if (response.data && response.data.data) {
            const qrcodeData = response.data.data;
            
            // Simpan session
            sessions.qrSessions.set(sessionId, {
                qrcode_id: qrcodeData.qrcode_id,
                timestamp: Date.now()
            });

            console.log(`✅ QR Code generated: ${qrcodeData.qrcode_id}`);
            
            res.status(200).json({
                success: true,
                qrcode_id: qrcodeData.qrcode_id,
                qrcode_base64: qrcodeData.qrcode_base64
            });
        } else {
            throw new Error('Invalid response from Shopee');
        }
    } catch (error) {
        console.error('❌ QR Code error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Gagal membuat QR Code. Coba lagi.' 
        });
    }
}