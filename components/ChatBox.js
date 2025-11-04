import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export default function ChatBox({ sensorData }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'vi-VN' // Vietnamese language
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => prev + (prev ? ' ' : '') + transcript)
        setIsListening(false)
      }
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognitionInstance.onend = () => {
        setIsListening(false)
      }
      
      setRecognition(recognitionInstance)
    }
  }, [])

  const toggleListening = () => {
    if (!recognition) {
      alert('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói')
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await axios.post('/api/chat', {
        message: input,
        sensorData,
      })

      const botMessage = { role: 'assistant', content: response.data.reply }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = { 
        role: 'assistant', 
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.' 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl p-8 flex flex-col h-[600px] border border-white/20">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6 flex items-center">
        <svg className="w-8 h-8 mr-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Chat với Robot AI
      </h3>
      
      <div className="flex-1 overflow-y-auto mb-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-16">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-xl font-bold">Xin chào! Tôi là trợ lý AI của robot.</p>
            <p className="text-base mt-3">Hãy hỏi tôi về dữ liệu cảm biến, thời tiết, hoặc điều khiển robot!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[60%] rounded-xl px-5 py-3 shadow-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-white/90 text-gray-800 border border-white/40'
              }`}
            >
              <p className="whitespace-pre-wrap text-base">{msg.content}</p>
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

      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn hoặc nhấn mic..."
          className="flex-1 backdrop-blur-sm bg-white/50 border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
          disabled={loading}
        />
        <button
          onClick={toggleListening}
          disabled={loading}
          className={`px-4 py-3 rounded-xl transition-all duration-300 font-semibold ${
            isListening 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-white/70 text-gray-700 hover:bg-white'
          }`}
          title={isListening ? 'Đang nghe...' : 'Nhấn để nói'}
        >
          {isListening ? '🎤 Đang nghe...' : '🎤'}
        </button>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold"
        >
          Gửi
        </button>
      </div>
    </div>
  )
}
