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
      console.log('🔄 Fetching sensor data from /api/sensors/latest...')
      const response = await axios.get('/api/sensors/latest')
      console.log('✅ Response received:', response.status)
      
      // Check if response has _meta (new format)
      if (response.data._meta) {
        console.log('📊 Meta info:', response.data._meta)
        if (response.data._meta.errors && response.data._meta.errors.length > 0) {
          console.error('⚠️ API returned errors:', response.data._meta.errors)
        }
      }
      
      // Remove _meta before setting data
      const { _meta, ...sensorData } = response.data
      
      if (!sensorData || Object.keys(sensorData).length === 0) {
        console.warn('⚠️ Empty data received from API')
        console.warn('⚠️ This usually means:')
        console.warn('  1. Environment variables not set on Vercel')
        console.warn('  2. Database has no data')
        console.warn('  3. Supabase connection failed')
      } else {
        console.log('✅ Received data for', Object.keys(sensorData).length, 'sensors')
      }
      
      setLatestData(sensorData)
      checkForAlerts(sensorData)
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
    }
  }

  const speakAlert = (text, alertId) => {
    if (typeof window !== 'undefined') {
      // Chỉ đọc 1 lần cho mỗi lần cảnh báo được kích hoạt
      if (hasSpokenAlert[alertId]) return
      
      console.log(`🚨 Alert speaking: ${alertId} - "${text}"`)
      
      // Use our API proxy for TTS
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}`
      
      const audio = new Audio(audioUrl)
      
      audio.onloadeddata = () => {
        console.log(`📥 Alert audio loaded: ${alertId}`)
      }
      
      audio.onended = () => {
        console.log(`✅ Alert spoken: ${alertId}`)
        setHasSpokenAlert(prev => ({ ...prev, [alertId]: true }))
      }
      
      audio.onerror = (e) => {
        console.error(`❌ Alert TTS error for ${alertId}:`, e)
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
    // ĐIỀU KIỆN HIỆN POPUP:
    // 1. Cảnh báo đang ON trong database
    // 2. KHÔNG phải thay đổi thủ công từ user
    // 3. Giá trị thay đổi từ OFF -> ON (remote trigger)
    
    // Check fire alarm - CRITICAL (User can dismiss)
    const fireValue = String(data.fire_alarm?.value || '').toUpperCase()
    const lastFireValue = lastRemoteValues.fire_alarm || 'OFF'
    
    if (fireValue === 'ON' 
        && !dismissedAlerts.includes('fire_alarm')
        && !temporarilyHiddenPopups.includes('fire_alarm')
        && !manualToggleInProgress
        && lastFireValue !== 'ON') { // Chỉ popup khi thay đổi từ OFF -> ON
      
      console.log('🔥 FIRE ALARM TRIGGERED by remote JSON')
      setActiveAlert({
        id: 'fire_alarm',
        severity: 'critical',
        icon: '🔥',
        title: 'CẢNH BÁO CHÁY',
        message: 'Phát hiện có cháy! Vui lòng kiểm tra ngay!',
        canDismiss: true
      })
      // Phát âm thanh cảnh báo cháy
      speakAlert('Cảnh báo cháy! Phát hiện có lửa! Vui lòng kiểm tra ngay!', 'fire_alarm')
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
        && lastThievesValue !== 'ON') { // Chỉ popup khi thay đổi từ OFF -> ON
      
      console.log('🚨 THIEVES ALARM TRIGGERED by remote JSON')
      setActiveAlert({
        id: 'thieves_alarm',
        severity: 'critical',
        icon: '🚨',
        title: 'CẢNH BÁO XÂM NHẬP',
        message: 'Phát hiện có trộm! Cảnh báo an ninh!',
        canDismiss: true
      })
      // Phát âm thanh cảnh báo trộm
      speakAlert('Cảnh báo xâm nhập! Phát hiện có trộm! Cảnh báo an ninh!', 'thieves_alarm')
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
      console.log('🚫 POPUP ĐÓNG - KHÔNG cập nhật database:', alertId)
      // CHỈ đóng popup - KHÔNG cập nhật database
      // Tạm ẩn popup trong 60 giây (1 phút), sau đó sẽ hiện lại nếu database vẫn ON
      setTemporarilyHiddenPopups([...temporarilyHiddenPopups, alertId])
      setActiveAlert(null)
      
      // Sau 60 giây (1 phút), cho phép popup hiện lại
      setTimeout(() => {
        setTemporarilyHiddenPopups(prev => prev.filter(id => id !== alertId))
      }, 60000)
    }
  }

  const handleDismissStatus = async (id) => {
    console.log('💾 NÚT TẮT - Đang cập nhật database:', id)
    
    // Đánh dấu là thay đổi thủ công - KHÔNG hiện popup
    setManualToggleInProgress(true)
    
    // Update database to turn OFF
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'OFF'
      })
      console.log(`✅ ĐÃ CẬP NHẬT database - Turned OFF ${id}`)
      
      // Cập nhật lastRemoteValues để không popup khi poll
      setLastRemoteValues(prev => ({ ...prev, [id]: 'OFF' }))
    } catch (error) {
      console.error('❌ LỖI khi cập nhật database:', error)
    }
    
    setDismissedAlerts([...dismissedAlerts, id])
    // Reset trạng thái đã đọc để có thể đọc lại khi bật lại
    setHasSpokenAlert(prev => ({ ...prev, [id]: false }))
    
    // Reset flag sau 1 giây
    setTimeout(() => setManualToggleInProgress(false), 1000)
  }

  const handleEnableStatus = async (id) => {
    console.log('💾 NÚT BẬT - Đang cập nhật database:', id)
    
    // Đánh dấu là thay đổi thủ công - KHÔNG hiện popup
    setManualToggleInProgress(true)
    
    // Update database to turn ON
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'ON'
      })
      console.log(`✅ Turned ON ${id} in database`)
      
      // Cập nhật lastRemoteValues để không popup khi poll
      setLastRemoteValues(prev => ({ ...prev, [id]: 'ON' }))
      
      // Remove from dismissed list to show alert again
      setDismissedAlerts(dismissedAlerts.filter(item => item !== id))
    } catch (error) {
      console.error('Error updating sensor:', error)
    }
    
    // Reset flag sau 1 giây
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">👤 USER MODE</h1>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Sensors */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <SimpleSensorCard
              title="Nhiệt độ"
              value={latestData.temperature_sensor?.value || '--'}
              unit="°C"
            />
            <SimpleSensorCard
              title="Độ ẩm"
              value={latestData.humidity?.value || '--'}
              unit="%"
            />
            <SimpleSensorCard
              title="Ánh sáng"
              value={latestData.light_sensor?.value || '--'}
              unit="lux"
            />
            <SimpleSensorCard
              title="Bụi mịn"
              value={latestData.dust_sensor?.value || '--'}
              unit="ppm"
            />
          </div>

          {/* Status Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <SimpleStatusBox
              title="Báo cháy"
              isActive={String(latestData.fire_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('fire_alarm')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('fire_alarm')}
              onEnable={() => handleEnableStatus('fire_alarm')}
            />
            <SimpleStatusBox
              title="Báo trộm"
              isActive={String(latestData.thieves_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('thieves_alarm')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('thieves_alarm')}
              onEnable={() => handleEnableStatus('thieves_alarm')}
            />
            <SimpleStatusBox
              title="Xông tinh dầu"
              isActive={String(latestData.humidity_sensor?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('humidity_sensor')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('humidity_sensor')}
              onEnable={() => handleEnableStatus('humidity_sensor')}
            />
            <SimpleStatusBox
              title="Nhảy theo nhạc"
              isActive={String(latestData.sound_dance_sensor?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('sound_dance_sensor')}
              canDismiss={true}
              onDismiss={() => handleDismissStatus('sound_dance_sensor')}
              onEnable={() => handleEnableStatus('sound_dance_sensor')}
            />
            <SimpleStatusBox
              title="Nhảy theo ánh sáng"
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
