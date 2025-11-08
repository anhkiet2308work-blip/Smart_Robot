import { remoteTriggers } from './remote-update'

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Ensure remoteTriggers is array
    const triggers = Array.isArray(remoteTriggers) ? [...remoteTriggers] : []
    
    if (Array.isArray(remoteTriggers)) {
      remoteTriggers.length = 0
    }
    
    console.log(`📡 Check remote triggers: ${triggers.length} found`)
    
    return res.status(200).json({ triggers })
  }
  
  return res.status(405).json({ message: 'Method not allowed' })
}