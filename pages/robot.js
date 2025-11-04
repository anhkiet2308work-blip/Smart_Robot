import { useState, useEffect } from 'react'
import Head from 'next/head'
import axios from 'axios'
import SimpleSensorCard from '@/components/SimpleSensorCard'
import SimpleStatusBox from '@/components/SimpleStatusBox'
import AlertPopup from '@/components/AlertPopup'
import { useRouter } from 'next/router'

export default function RobotMode() {
  const router = useRouter()
  const [latestData, setLatestData] = useState({})
  const [activeAlert, setActiveAlert] = useState(null)
  const [dismissedAlerts, setDismissedAlerts] = useState([])

  // Fetch latest sensor data
  const fetchLatestData = async () => {
    try {
      const response = await axios.get('/api/sensors/latest')
      setLatestData(response.data)
      checkForAlerts(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const checkForAlerts = (data) => {
    // ONLY show popup for CRITICAL alerts: fire and thieves (cannot dismiss on robot mode)
    
    // Check fire alarm - CRITICAL
    if (String(data.fire_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('fire_alarm')) {
      setActiveAlert({
        id: 'fire_alarm',
        severity: 'critical',
        icon: '🔥',
        title: 'CẢNH BÁO CHÁY',
        message: 'Phát hiện có cháy! Vui lòng kiểm tra ngay!',
        canDismiss: false // Không thể tắt trên robot mode
      })
      return
    }

    // Check thieves alarm - CRITICAL
    if (String(data.thieves_alarm?.value || '').toUpperCase() === 'ON' && !dismissedAlerts.includes('thieves_alarm')) {
      setActiveAlert({
        id: 'thieves_alarm',
        severity: 'critical',
        icon: '🚨',
        title: 'CẢNH BÁO XÂM NHẬP',
        message: 'Phát hiện có trộm! Cảnh báo an ninh!',
        canDismiss: false // Không thể tắt trên robot mode (LOCKED)
      })
      return
    }

    // NO POPUP for diffuser, music, light - only status boxes
    setActiveAlert(null)
  }

  const handleDismissAlert = async () => {
    if (activeAlert && activeAlert.canDismiss) {
      // Update database to turn OFF (only for dismissable alerts)
      try {
        await axios.post('/api/sensors/update', {
          sensor: activeAlert.id,
          value: 'OFF'
        })
        console.log(`✅ Turned OFF ${activeAlert.id} in database`)
      } catch (error) {
        console.error('Error updating sensor:', error)
      }
      
      setDismissedAlerts([...dismissedAlerts, activeAlert.id])
      setActiveAlert(null)
    }
  }

  const handleDismissStatus = async (id) => {
    console.log('💾 NÚT TẮT - Đang cập nhật database:', id)
    // Update database to turn OFF
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'OFF'
      })
      console.log(`✅ ĐÃ CẬP NHẬT database - Turned OFF ${id}`)
    } catch (error) {
      console.error('❌ LỖI khi cập nhật database:', error)
    }
    
    setDismissedAlerts([...dismissedAlerts, id])
  }

  const handleEnableStatus = async (id) => {
    console.log('💾 NÚT BẬT - Đang cập nhật database:', id)
    // Update database to turn ON
    try {
      await axios.post('/api/sensors/update', {
        sensor: id,
        value: 'ON'
      })
      console.log(`✅ ĐÃ CẬP NHẬT database - Turned ON ${id}`)
      
      // Remove from dismissed list to show alert again
      setDismissedAlerts(dismissedAlerts.filter(item => item !== id))
    } catch (error) {
      console.error('❌ LỖI khi cập nhật database:', error)
    }
  }

  useEffect(() => {
    fetchLatestData()
    const interval = setInterval(fetchLatestData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Head>
        <title>Robot Mode - Smart Robot Dashboard</title>
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
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">🤖 ROBOT MODE</h1>
              <button
                onClick={() => router.push('/user')}
                className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
              >
                Chuyển sang User Mode
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Sensors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SimpleStatusBox
              title="Báo cháy"
              isActive={String(latestData.fire_alarm?.value || '').toUpperCase() === 'ON'}
              canDismiss={false}
            />
            <SimpleStatusBox
              title="Báo trộm"
              isActive={String(latestData.thieves_alarm?.value || '').toUpperCase() === 'ON'}
              canDismiss={false}
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
        </div>
      </div>
    </>
  )
}
