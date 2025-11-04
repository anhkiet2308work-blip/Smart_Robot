import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase client is not initialized')
    return res.status(500).json({ message: 'Database not configured' })
  }

  try {
    // Get the latest reading from each sensor
    const tables = [
      'dust_sensor',
      'fire_alarm',
      'humidity',           // NEW: % humidity from air
      'humidity_sensor',    // ON/OFF for essential oil diffuser
      'light_dance_sensor',
      'light_sensor',
      'sound_dance_sensor',
      'temperature_sensor',
      'thieves_alarm',
    ]

    const latestData = {}

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('ts', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        latestData[table] = data
      }
    }

    res.status(200).json(latestData)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
}
