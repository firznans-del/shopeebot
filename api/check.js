export default async function handler(req, res) {
  res.json({ 
    status: 'Shopee Bot is running',
    timestamp: new Date().toISOString() 
  });
}
