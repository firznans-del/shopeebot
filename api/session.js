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
    
    console.log(`🔵 ${req.method} /api/session${req.query.sessionId ? '/' + req.query.sessionId : ''}`);
    
    if (req.method === 'GET') {
        // Get session data
        const { sessionId } = req.query;
        
        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID diperlukan' 
            });
        }
        
        const sessionData = sessions.userSessions.get(sessionId);
        if (sessionData) {
            res.status(200).json({ 
                success: true, 
                data: sessionData,
                timestamp: new Date(sessionData.timestamp).toLocaleString('id-ID')
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Session tidak ditemukan' 
            });
        }
    } else if (req.method === 'DELETE') {
        // Clear session
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID diperlukan' 
            });
        }
        
        if (sessions.userSessions.has(sessionId)) {
            sessions.userSessions.delete(sessionId);
            res.status(200).json({ 
                success: true, 
                message: 'Session berhasil dihapus' 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Session tidak ditemukan' 
            });
        }
    } else {
        res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
}