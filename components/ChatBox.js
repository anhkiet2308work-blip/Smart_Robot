import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function ChatBox({ sensorData }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Helper function to get best Vietnamese voice
  const getVietnameseVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    
    // Priority: Google > Microsoft > any vi-VN
    const googleVi = voices.find(v => v.lang === 'vi-VN' && v.name.toLowerCase().includes('google'))
    const microsoftVi = voices.find(v => v.lang === 'vi-VN' && v.name.toLowerCase().includes('microsoft'))
    const anyVi = voices.find(v => v.lang === 'vi-VN')
    const viLang = voices.find(v => v.lang.startsWith('vi'))
    
    return googleVi || microsoftVi || anyVi || viLang || null
  }

  // Load voices for Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const viVoices = voices.filter(v => v.lang.startsWith('vi'))
        
        console.log(` Total voices: ${voices.length}, Vietnamese: ${viVoices.length}`)
        viVoices.forEach(v => console.log(`   ${v.name} (${v.lang})`))
        
        if (viVoices.length === 0) {
          console.error(' Không tìm thấy giọng tiếng Việt!')
          console.error(' Cài đặt: Windows Settings > Time & Language > Speech > Add voices')
        }
      }
      
      loadVoices()
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }
  }, [])

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'vi-VN'
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
        setTimeout(() => {
          if (transcript.trim()) handleSendMessage(transcript)
        }, 500)
      }
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognitionInstance.onend = () => setIsListening(false)
      setRecognition(recognitionInstance)
    }
  }, [])

  const speakText = (text) => {
    if (!isSpeechEnabled || !text) return
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        const viVoice = getVietnameseVoice()
        
        if (viVoice) {
          utterance.voice = viVoice
          utterance.lang = viVoice.lang
          console.log(` Using: ${viVoice.name} (${viVoice.lang})`)
        } else {
          utterance.lang = 'vi-VN'
          console.warn(' No Vietnamese voice, forcing vi-VN lang')
        }
        
        utterance.rate = 0.95
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = (e) => {
          console.error('Speech error:', e.error)
          setIsSpeaking(false)
        }
        
        window.speechSynthesis.speak(utterance)
      }, 150)
    }
  }

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
    setIsSpeechEnabled(!isSpeechEnabled)
  }

  const toggleListening = () => {
    if (!recognition) {
      alert('Trình duyệt không hỗ trợ nhận dạng giọng nói')
      return
    }
    if (isListening) {
      recognition.stop()
    } else {
      recognition.start()
    }
    setIsListening(!isListening)
  }

  const handleSendMessage = async (message) => {
    const textToSend = message || input
    if (!textToSend.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: textToSend }])
    setInput('')
    setLoading(true)

    try {
      const response = await axios.post('/api/chat', { message: textToSend, sensorData })
      const botReply = response.data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: botReply }])
      speakText(botReply)
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, đã có lỗi xảy ra.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-6 md:p-8 flex flex-col h-[500px] sm:h-[600px] border border-white/20">
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="truncate">Chat với Robot AI</span>
        </h3>
        
        <button onClick={toggleSpeech} className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-semibold ${isSpeechEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
          {isSpeechEnabled ? <><span className="text-base sm:text-lg"></span><span className="hidden sm:inline">{isSpeaking ? 'Đang đọc...' : 'Âm thanh bật'}</span></> : <><span className="text-base sm:text-lg"></span><span className="hidden sm:inline">Âm thanh tắt</span></>}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-3 sm:mb-6 space-y-2 sm:space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-8 sm:mt-16">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4"></div>
            <p className="text-base sm:text-xl font-bold px-2">Xin chào! Tôi là trợ lý AI của robot.</p>
            <p className="text-sm sm:text-base mt-2 sm:mt-3 px-4">Hãy hỏi tôi về dữ liệu cảm biến, thời tiết, hoặc điều khiển robot!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 shadow-md ${msg.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-white/90 text-gray-800 border border-white/40'}`}>
              <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 sm:gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(input))} placeholder="Nhập hoặc nhấn mic..." className="flex-1 backdrop-blur-sm bg-white/50 border border-white/30 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all" disabled={loading} />
        <button onClick={toggleListening} disabled={loading} className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 font-semibold text-sm sm:text-base ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/70 text-gray-700 hover:bg-white'}`}>
          {isListening ? <span className="hidden sm:inline"> Đang nghe...</span> : ''}
        </button>
        <button onClick={() => handleSendMessage(input)} disabled={loading || !input.trim()} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-sm sm:text-base whitespace-nowrap">Gửi</button>
      </div>
    </div>
  )
}
