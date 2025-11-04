import { useState, useEffect } from 'react'
import Head from 'next/head'
import axios from 'axios'
import SensorCard from '@/components/SensorCard'
import SensorChart from '@/components/SensorChart'
import ChatBox from '@/components/ChatBox'
import StatusIndicator from '@/components/StatusIndicator'
import NotificationCenter from '@/components/NotificationCenter'
import RobotStatusBox from '@/components/RobotStatusBox'
import { 
  generateMockLatestData, 
  generateMockHistoricalData,
  getNotificationMessage,
  getSeverity
} from '@/lib/mockData'

export default function Home() {
  const [latestData, setLatestData] = useState({})
  const [historicalData, setHistoricalData] = useState({})
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [notifications, setNotifications] = useState([])
  const [activeAlerts, setActiveAlerts] = useState([])
  const [useMockData, setUseMockData] = useState(false) // Default to REAL data from Supabase
  const [staticChartData, setStaticChartData] = useState(null) // Static chart data

  // Fetch latest sensor data
  const fetchLatestData = async () => {
    try {
      if (useMockData) {
        // Use mock data for demo
        const mockData = generateMockLatestData()
        setLatestData(mockData)
        checkForAlerts(mockData)
      } else {
        const response = await axios.get('/api/sensors/latest')
        setLatestData(response.data)
        checkForAlerts(response.data)
      }
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching latest data:', error)
      // Fallback to mock data on error
      const mockData = generateMockLatestData()
      setLatestData(mockData)
      checkForAlerts(mockData)
    }
  }

  // Fetch historical data for charts
  const fetchHistoricalData = async () => {
    try {
      if (useMockData) {
        // Use mock data for demo
        setHistoricalData(generateMockHistoricalData())
      } else {
        const response = await axios.get('/api/sensors?limit=20')
        setHistoricalData(response.data)
      }
    } catch (error) {
      console.error('Error fetching historical data:', error)
      // Fallback to mock data on error
      setHistoricalData(generateMockHistoricalData())
    }
  }

  // Generate static chart data (fake data for display)
  const generateStaticChartData = () => {
    const now = new Date()
    const data = {
      temperature: [],
      light: [],
      dust: []
    }

    // Generate 20 data points for each chart
    for (let i = 19; i >= 0; i--) {
      const timestamp = new Date(now - i * 60000) // Every minute
      const timeStr = timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

      // Temperature: 22-28°C with smooth curve
      data.temperature.push({
        time: timeStr,
        value: 25 + Math.sin(i * 0.3) * 3 + Math.random() * 0.5
      })

      // Light: 800-1200 lux with variation
      data.light.push({
        time: timeStr,
        value: 1000 + Math.sin(i * 0.5) * 150 + Math.random() * 50
      })

      // Dust: 10-50 ppm with spikes
      data.dust.push({
        time: timeStr,
        value: 30 + Math.sin(i * 0.4) * 15 + Math.random() * 5
      })
    }

    return data
  }

  // Check for alerts and create notifications (no popup banners)
  const checkForAlerts = (data) => {
    const sensors = [
      { key: 'fire_alarm', icon: '🔥' },
      { key: 'thieves_alarm', icon: '🚨' },
      { key: 'humidity_sensor', icon: '�' },
      { key: 'sound_dance_sensor', icon: '🎵' },
      { key: 'light_dance_sensor', icon: '�' }
    ]

    sensors.forEach(sensor => {
      const sensorData = data[sensor.key]
      const isOn = sensorData && (String(sensorData.value).toUpperCase() === 'ON')
      if (isOn) {
        const message = getNotificationMessage(sensor.key, 'ON')
        const severity = getSeverity(sensor.key, 'ON')
        
        // Add to notifications (only once per unique state)
        const newNotif = {
          id: Date.now() + Math.random(),
          message,
          severity,
          icon: sensor.icon,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          read: false
        }

        setNotifications(prev => {
          // Avoid duplicates - check if same message exists
          const exists = prev.some(n => 
            n.message === message && 
            n.severity === severity
          )
          if (!exists) {
            return [newNotif, ...prev].slice(0, 20) // Keep last 20
          }
          return prev
        })

        // NO ALERT BANNER POPUP - Only notification center
      }
    })
  }

  // Fetch weather data
  const fetchWeather = async () => {
    try {
      const response = await axios.get('/api/weather')
      setWeather(response.data)
    } catch (error) {
      console.error('Error fetching weather:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      
      // Generate static chart data (fake/demo data)
      setStaticChartData(generateStaticChartData())
      
      await Promise.all([
        fetchLatestData(),
        fetchHistoricalData(),
        fetchWeather()
      ])
      setLoading(false)
    }

    loadData()

    // Auto refresh every 30 seconds (not too frequent for charts)
    const interval = setInterval(() => {
      fetchLatestData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard Robot Thông Minh</title>
        <meta name="description" content="Dashboard giám sát robot đa chức năng" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen">
        {/* Header */}
        <header className="backdrop-blur-xl bg-white/30 shadow-lg border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  🤖 Dashboard Robot Thông Minh
                </h1>
                <p className="text-gray-700 mt-1 font-medium">Giám sát và điều khiển robot đa chức năng</p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Demo Mode Toggle */}
                <div className="flex items-center space-x-2 backdrop-blur-sm bg-white/40 rounded-xl px-4 py-2 border border-white/30">
                  <span className="text-sm font-bold text-gray-700">Demo Mode</span>
                  <button
                    onClick={() => setUseMockData(!useMockData)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-inner ${
                      useMockData ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      useMockData ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Notification Center */}
                <NotificationCenter 
                  notifications={notifications}
                  onClear={() => setNotifications([])}
                />

                {/* Last Update */}
                <div className="text-right backdrop-blur-sm bg-white/40 rounded-xl px-4 py-2 border border-white/30">
                  <p className="text-xs text-gray-600 font-medium">Cập nhật lần cuối</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {lastUpdate.toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Row 1: Sensor Cards + Weather */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <SensorCard
              title="Nhiệt độ"
              value={latestData.temperature_sensor?.value || '--'}
              unit="°C"
              color="red"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />

            <SensorCard
              title="Độ ẩm"
              value={latestData.humidity?.value || '--'}
              unit="%"
              color="blue"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              }
            />

            <SensorCard
              title="Ánh sáng"
              value={latestData.light_sensor?.value || '--'}
              unit="lux"
              color="yellow"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />

            <SensorCard
              title="Bụi mịn"
              value={latestData.dust_sensor?.value || '--'}
              unit="ppm"
              color="orange"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              }
            />

            {/* Weather Box */}
            <StatusIndicator
              title="🌤️ Thời tiết"
              color="blue"
              items={weather ? [
                { label: weather.city, status: `${weather.temperature}°C` },
                { label: weather.description, status: `${weather.humidity}%` },
              ] : [{ label: 'Loading...', status: '--' }]}
            />
          </div>

          {/* Row 2: Robot Status - 5 Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <RobotStatusBox
              title="Báo cháy"
              icon="🔥"
              isActive={String(latestData.fire_alarm?.value || '').toUpperCase() === 'ON'}
              type="fire"
            />
            <RobotStatusBox
              title="Báo trộm"
              icon="🚨"
              isActive={String(latestData.thieves_alarm?.value || '').toUpperCase() === 'ON'}
              type="thieves"
            />
            <RobotStatusBox
              title="Xông tinh dầu"
              icon="🌿"
              isActive={String(latestData.humidity_sensor?.value || '').toUpperCase() === 'ON'}
              type="diffuser"
            />
            <RobotStatusBox
              title="Nhảy theo nhạc"
              icon="🎵"
              isActive={String(latestData.sound_dance_sensor?.value || '').toUpperCase() === 'ON'}
              type="music"
            />
            <RobotStatusBox
              title="Nhảy theo ánh sáng"
              icon="💡"
              isActive={String(latestData.light_dance_sensor?.value || '').toUpperCase() === 'ON'}
              type="light"
            />
          </div>

          {/* Row 3: Chart 1 - Full Width (STATIC FAKE DATA) */}
          <div className="mb-8">
            <SensorChart
              data={staticChartData?.temperature || []}
              dataKey="value"
              title="📈 Biểu đồ nhiệt độ"
              color="#ef4444"
              yAxisLabel="Nhiệt độ (°C)"
            />
          </div>

          {/* Row 4: Chart 2 - Full Width (STATIC FAKE DATA) */}
          <div className="mb-8">
            <SensorChart
              data={staticChartData?.light || []}
              dataKey="value"
              title="📈 Biểu đồ ánh sáng"
              color="#f59e0b"
              yAxisLabel="Cường độ (lux)"
            />
          </div>

          {/* Row 5: Chart 3 - Full Width (STATIC FAKE DATA) */}
          <div className="mb-8">
            <SensorChart
              data={staticChartData?.dust || []}
              dataKey="value"
              title="📈 Biểu đồ bụi mịn"
              color="#8b5cf6"
              yAxisLabel="Nồng độ (ppm)"
            />
          </div>

          {/* Row 6: Chat Box - Full Width */}
          <div className="mb-8">
            <ChatBox sensorData={latestData} />
          </div>



          {/* Features List */}
          <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-xl p-8 mb-8 border border-white/20">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
              ✨ Tính năng của Robot
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                '🎵 Nhảy múa theo nhạc',
                '💡 Nhảy theo ánh sáng',
                '🌡️ Đo nhiệt độ',
                '💧 Đo độ ẩm không khí',
                '🌫️ Giám sát chất lượng không khí',
                '🔬 Đo bụi mịn (PM2.5)',
                '🔥 Cảnh báo cháy',
                '🚨 Cảnh báo trộm',
                '🎧 Loa Bluetooth',
                '💨 Lọc không khí',
                '💦 Tạo độ ẩm',
                '📷 Camera giám sát',
                '🤖 Trò chuyện với ChatGPT',
                '🗣️ Giao tiếp giọng nói',
                '🌤️ Dự báo thời tiết',
                '📱 Điều khiển qua app',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-3 backdrop-blur-sm bg-white/40 rounded-xl border border-white/30 hover:bg-white/60 hover:shadow-lg transition-all duration-300">
                  <span className="text-base font-medium text-gray-800">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="backdrop-blur-xl bg-white/30 border-t border-white/20 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <p className="text-gray-700 font-medium">© 2025 Robot Thông Minh Dashboard | Được xây dựng với Next.js, React & Supabase</p>
          </div>
        </footer>
      </main>
    </>
  )
}
