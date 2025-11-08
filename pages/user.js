import { useState, useEffect } from 'react'
import Head from 'next/head'
import axios from 'axios'
import SimpleSensorCard from '@/components/SimpleSensorCard'
import SimpleStatusBox from '@/components/SimpleStatusBox'
import AlertPopup from '@/components/AlertPopup'
import CameraStream from '@/components/CameraStream'
import ChatBox from '@/components/ChatBox'
import { useRouter } from 'next/router'

export default function UserMode() {
  const router = useRouter()
  const [latestData, setLatestData] = useState({})
  const [activeAlert, setActiveAlert] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState([])
  const [temporarilyHiddenPopups, setTemporarilyHiddenPopups] = useState([])
  const [hasSpokenAlert, setHasSpokenAlert] = useState({})
  const [manualToggleInProgress, setManualToggleInProgress] = useState(false)
  const [lastRemoteValues, setLastRemoteValues] = useState({})

  // Fetch latest sensor data
  const fetchLatestData = async () => {
    try {
      console.log('≡ƒöä Fetching sensor data from /api/sensors/latest...')
      const response = await axios.get('/api/sensors/latest')
      console.log('Γ£à Response received:', response.status)
      
      // Check if response has _meta (new format)
      if (response.data._meta) {
        console.log('≡ƒôè Meta info:', response.data._meta)
        if (response.data._meta.errors && response.data._meta.errors.length > 0) {
          console.error('ΓÜá∩╕Å API returned errors:', response.data._meta.errors)
        }
      }
      
      // Remove _meta before setting data
      const { _meta, ...sensorData } = response.data
      
      if (!sensorData || Object.keys(sensorData).length === 0) {
        console.warn('ΓÜá∩╕Å Empty data received from API')
        console.warn('ΓÜá∩╕Å This usually means:')
        console.warn('  1. Environment variables not set on Vercel')
        console.warn('  2. Database has no data')
        console.warn('  3. Supabase connection failed')
      } else {
        console.log('Γ£à Received data for', Object.keys(sensorData).length, 'sensors')
      }
      
      setLatestData(sensorData)
      checkForAlerts(sensorData)
    } catch (error) {
      console.error('Γ¥î Error fetching data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
    }
  }

  const speakAlert = (text, alertId) => {
    if (typeof window !== 'undefined') {
      // Chß╗ë ─æß╗ìc 1 lß║ºn cho mß╗ùi lß║ºn cß║únh b├ío ─æ╞░ß╗úc k├¡ch hoß║ít
      if (hasSpokenAlert[alertId]) return
      
      console.log(`≡ƒÜ¿ Alert speaking: ${alertId} - "${text}"`)
      
      // Use our API proxy for TTS
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}`
      
      const audio = new Audio(audioUrl)
      
      audio.onloadeddata = () => {
        console.log(`≡ƒôÑ Alert audio loaded: ${alertId}`)
      }
      
      audio.onended = () => {
        console.log(`Γ£à Alert spoken: ${alertId}`)
        setHasSpokenAlert(prev => ({ ...prev, [alertId]: true }))
      }
      
      audio.onerror = (e) => {
        console.error(`Γ¥î Alert TTS error for ${alertId}:`, e)
        setHasSpokenAlert(prev => ({ ...prev, [alertId]: true }))
      }
      
      audio.play().catch(err => {
        console.error('Alert audio play failed:', err)
        setHasSpokenAlert(prev => ({ ...prev, [alertId]: true }))
      })
    }
  }

  const checkForAlerts = (data) => {
    // ONLY show popup for CRITICAL alerts: fire and thieves
    // ─ÉIß╗ÇU KIß╗åN HIß╗åN POPUP:
    // 1. Cß║únh b├ío ─æang ON trong database
    // 2. KH├öNG phß║úi thay ─æß╗òi thß╗º c├┤ng tß╗½ user
    // 3. Gi├í trß╗ï thay ─æß╗òi tß╗½ OFF -> ON (remote trigger)
    
    // Check fire alarm - CRITICAL (User can dismiss)
    const fireValue = String(data.fire_alarm?.value || '').toUpperCase()
    const lastFireValue = lastRemoteValues.fire_alarm || 'OFF'
    
    if (fireValue === 'ON' 
        && !dismissedAlerts.includes('fire_alarm')
        && !temporarilyHiddenPopups.includes('fire_alarm')
        && !manualToggleInProgress
        && lastFireValue !== 'ON') { // Chß╗ë popup khi thay ─æß╗òi tß╗½ OFF -> ON
      
      console.log('≡ƒöÑ FIRE ALARM TRIGGERED by remote JSON')
      setActiveAlert({
        id: 'fire_alarm',
        severity: 'critical',
        icon: '≡ƒöÑ',
        title: 'Cß║óNH B├üO CH├üY',
        message: 'Ph├ít hiß╗çn c├│ ch├íy! Vui l├▓ng kiß╗âm tra ngay!',
        canDismiss: true
      })
      // Ph├ít ├óm thanh cß║únh b├ío ch├íy
      speakAlert('Cß║únh b├ío ch├íy! Ph├ít hiß╗çn c├│ lß╗¡a! Vui l├▓ng kiß╗âm tra ngay!', 'fire_alarm')
      setLastRemoteValues(prev => ({ ...prev, fire_alarm: 'ON' }))
      return
    }

    // Check thieves alarm - CRITICAL (User can dismiss)
    const thievesValue = String(data.thieves_alarm?.value || '').toUpperCase()
    const lastThievesValue = lastRemoteValues.thieves_alarm || 'OFF'
    
    if (thievesValue === 'ON' 
        && !dismissedAlerts.includes('thieves_alarm')
        && !temporarilyHiddenPopups.includes('thieves_alarm')
        && !manualToggleInProgress
        && lastThievesValue !== 'ON') { // Chß╗ë popup khi thay ─æß╗òi tß╗½ OFF -> ON
      
      console.log('≡ƒÜ¿ THIEVES ALARM TRIGGERED by remote JSON')
      setActiveAlert({
        id: 'thieves_alarm',
        severity: 'critical',
        icon: '≡ƒÜ¿',
        title: 'Cß║óNH B├üO X├éM NHß║¼P',
        message: 'Ph├ít hiß╗çn c├│ trß╗Öm! Cß║únh b├ío an ninh!',
        canDismiss: true
      })
      // Ph├ít ├óm thanh cß║únh b├ío trß╗Öm
      speakAlert('Cß║únh b├ío x├óm nhß║¡p! Ph├ít hiß╗çn c├│ trß╗Öm! Cß║únh b├ío an ninh!', 'thieves_alarm')
      setLastRemoteValues(prev => ({ ...prev, thieves_alarm: 'ON' }))
      return
    }

    // Update lastRemoteValues for next comparison
    if (fireValue !== lastFireValue) {
      setLastRemoteValues(prev => ({ ...prev, fire_alarm: fireValue }))
    }
    if (thievesValue !== lastThievesValue) {
      setLastRemoteValues(prev => ({ ...prev, thieves_alarm: thievesValue }))
    }

    // NO POPUP for diffuser, music, light - only status boxes
    setActiveAlert(null)
  }

  const handleDismissAlert = () => {
    if (activeAlert) {
      const alertId = activeAlert.id
      console.log('≡ƒÜ½ POPUP ─É├ôNG - KH├öNG cß║¡p nhß║¡t database:', alertId)
      // CHß╗ê ─æ├│ng popup - KH├öNG cß║¡p nhß║¡t database
      // Tß║ím ß║⌐n popup trong 60 gi├óy (1 ph├║t), sau ─æ├│ sß║╜ hiß╗çn lß║íi nß║┐u database vß║½n ON
      setTemporarilyHiddenPopups([...temporarilyHiddenPopups, alertId])
      setActiveAlert(null)
      
      // Sau 60 gi├óy (1 ph├║t), cho ph├⌐p popup hiß╗çn lß║íi
      setTimeout(() => {
        setTemporarilyHiddenPopups(prev => prev.filter(id => id !== alertId))
      }, 60000)
    }
  }

  const handleDismissStatus = async (id) => {
    console.log('≡ƒÆ╛ N├ÜT Tß║«T - ─Éang cß║¡p nhß║¡t database:', id)
    
    // ─É├ính dß║Ñu l├á thay ─æß╗òi thß╗º c├┤ng - KH├öNG hiß╗çn popup
    setManualToggleInProgress(true)
    
    // Update database to turn OFF
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'OFF'
      })
      console.log(`Γ£à ─É├â Cß║¼P NHß║¼T database - Turned OFF ${id}`)
      
      // Cß║¡p nhß║¡t lastRemoteValues ─æß╗â kh├┤ng popup khi poll
      setLastRemoteValues(prev => ({ ...prev, [id]: 'OFF' }))
    } catch (error) {
      console.error('Γ¥î Lß╗ûI khi cß║¡p nhß║¡t database:', error)
    }
    
    setDismissedAlerts([...dismissedAlerts, id])
    // Reset trß║íng th├íi ─æ├ú ─æß╗ìc ─æß╗â c├│ thß╗â ─æß╗ìc lß║íi khi bß║¡t lß║íi
    setHasSpokenAlert(prev => ({ ...prev, [id]: false }))
    
    // Reset flag sau 1 gi├óy
    setTimeout(() => setManualToggleInProgress(false), 1000)
  }

  const handleEnableStatus = async (id) => {
    console.log('≡ƒÆ╛ N├ÜT Bß║¼T - ─Éang cß║¡p nhß║¡t database:', id)
    
    // ─É├ính dß║Ñu l├á thay ─æß╗òi thß╗º c├┤ng - KH├öNG hiß╗çn popup
    setManualToggleInProgress(true)
    
    // Update database to turn ON
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'ON'
      })
      console.log(`Γ£à Turned ON ${id} in database`)
      
      // Cß║¡p nhß║¡t lastRemoteValues ─æß╗â kh├┤ng popup khi poll
      setLastRemoteValues(prev => ({ ...prev, [id]: 'ON' }))
      
      // Remove from dismissed list to show alert again
      setDismissedAlerts(dismissedAlerts.filter(item => item !== id))
    } catch (error) {
      console.error('Error updating sensor:', error)
    }
    
    // Reset flag sau 1 gi├óy
    setTimeout(() => setManualToggleInProgress(false), 1000)
  }

  useEffect(() => {
    fetchLatestData()
    const interval = setInterval(fetchLatestData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Head>
        <title>User Mode - Smart Robot Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
        {/* Alert Popup */}
        {activeAlert && (
          <AlertPopup
            alert={activeAlert}
            onDismiss={handleDismissAlert}
            canDismiss={activeAlert.canDismiss}
          />
        )}

        {/* Header */}
        <header className="bg-white/30 backdrop-blur-md shadow-lg">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-center">
              <h1 className="text-xl sm:text-2xl font-bold text-white">≡ƒæñ USER MODE</h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Sensors */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <SimpleSensorCard
              title="Nhiß╗çt ─æß╗Ö"
              value={latestData.temperature_sensor?.value || '--'}
              unit="┬░C"
            />
            <SimpleSensorCard
              title="─Éß╗Ö ß║⌐m"
              value={latestData.humidity?.value || '--'}
              unit="%"
            />
            <SimpleSensorCard
              title="├ünh s├íng"
              value={latestData.light_sensor?.value || '--'}
              unit="lux"
            />
            <SimpleSensorCard
              title="Bß╗Ñi mß╗ïn"
              value={latestData.dust_sensor?.value || '--'}
              unit="ppm"
            />
          </div>

          {/* Status Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <SimpleStatusBox
              title="B├ío ch├íy"
              isActive={String(latestData.fire_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('fire_alarm')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('fire_alarm')}
              onEnable={() => handleEnableStatus('fire_alarm')}
            />
            <SimpleStatusBox
              title="B├ío trß╗Öm"
              isActive={String(latestData.thieves_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('thieves_alarm')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('thieves_alarm')}
              onEnable={() => handleEnableStatus('thieves_alarm')}
            />
            <SimpleStatusBox
              title="X├┤ng tinh dß║ºu"
              isActive={String(latestData.humidity_sensor?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('humidity_sensor')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('humidity_sensor')}
              onEnable={() => handleEnableStatus('humidity_sensor')}
            />
            <SimpleStatusBox
              title="Nhß║úy theo nhß║íc"
              isActive={String(latestData.sound_dance_sensor?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('sound_dance_sensor')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('sound_dance_sensor')}
              onEnable={() => handleEnableStatus('sound_dance_sensor')}
            />
            <SimpleStatusBox
              title="Nhß║úy theo ├ính s├íng"
              isActive={String(latestData.light_dance_sensor?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('light_dance_sensor')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('light_dance_sensor')}
              onEnable={() => handleEnableStatus('light_dance_sensor')}
            />
          </div>

          {/* Camera Stream */}
          <div className="mb-6">
            <CameraStream streamUrl="" />
          </div>

          {/* Chat Box */}
          <ChatBox sensorData={latestData} />
        </div>
      </div>
    </>
  )
}
