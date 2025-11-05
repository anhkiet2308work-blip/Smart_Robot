import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set')
    return res.status(500).json({ message: 'OpenAI API not configured' })
  }

  try {
    const { message, sensorData } = req.body

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Mock weather data for Vietnam provinces
    const weatherData = {
      'bình thuận': {
        today: { temp: '28-34°C', condition: 'Nắng nóng, có mây', humidity: '65-75%', wind: 'Đông Nam 15-20km/h' },
        tomorrow: { temp: '27-33°C', condition: 'Có mây, khả năng mưa rào nhẹ chiều tối', humidity: '70-80%', wind: 'Đông Nam 10-15km/h' },
        forecast: 'Tuần tới: Nắng nóng ban ngày, mưa rào chiều tối. Nhiệt độ trung bình 28-33°C'
      },
      'hồ chí minh': {
        today: { temp: '26-33°C', condition: 'Nắng, chiều tối có mưa', humidity: '70-85%', wind: 'Nam 10-15km/h' },
        tomorrow: { temp: '26-32°C', condition: 'Có mây, mưa rào và dông', humidity: '75-90%', wind: 'Tây Nam 15-20km/h' },
        forecast: 'Tuần tới: Mưa dông chiều tối, nắng gián đoạn. Nhiệt độ 26-32°C'
      },
      'hà nội': {
        today: { temp: '24-32°C', condition: 'Nắng gián đoạn', humidity: '60-75%', wind: 'Đông Nam 10km/h' },
        tomorrow: { temp: '25-33°C', condition: 'Nắng nóng, ít mây', humidity: '55-70%', wind: 'Đông 10-15km/h' },
        forecast: 'Tuần tới: Nắng nóng, có lúc có mưa. Nhiệt độ 25-34°C'
      },
      'đà nẵng': {
        today: { temp: '25-32°C', condition: 'Nắng đẹp, ít mây', humidity: '65-80%', wind: 'Tây Nam 15km/h' },
        tomorrow: { temp: '26-33°C', condition: 'Nắng, có mây vài nơi', humidity: '60-75%', wind: 'Tây Nam 10-20km/h' },
        forecast: 'Tuần tới: Nắng đẹp, thích hợp du lịch. Nhiệt độ 25-32°C'
      }
    }

    // Create context with sensor data if provided
    let systemMessage = `Bạn là trợ lý AI thông minh cho robot đa chức năng. Robot này có các tính năng:
- Nhảy múa theo nhạc và ánh sáng
- Đo nhiệt độ, độ ẩm không khí
- Giám sát chất lượng không khí
- Lọc không khí và tạo độ ẩm
- Báo cháy và báo trộm
- Đo bụi mịn
- Loa Bluetooth
- Camera giám sát
- Dự báo thời tiết

QUAN TRỌNG: Khi người dùng hỏi về thời tiết, hãy sử dụng dữ liệu sau để trả lời:

DỮ LIỆU THỜI TIẾT HIỆN TẠI:
${JSON.stringify(weatherData, null, 2)}

Khi được hỏi về thời tiết một địa phương (như "thời tiết Bình Thuận", "dự báo thời tiết Bình Thuận ngày mai"), hãy:
1. Tìm tên địa phương trong dữ liệu thời tiết (không phân biệt chữ hoa/thường, bỏ qua dấu)
2. Trả lời chi tiết với nhiệt độ, tình trạng thời tiết, độ ẩm, hướng gió
3. Nếu hỏi "hôm nay" → dùng data.today
4. Nếu hỏi "ngày mai" → dùng data.tomorrow
5. Nếu hỏi "tuần sau" → dùng data.forecast

Ví dụ câu trả lời:
"Dự báo thời tiết Bình Thuận ngày mai: Nhiệt độ 27-33°C, có mây, khả năng mưa rào nhẹ vào chiều tối. Độ ẩm 70-80%, gió Đông Nam 10-15km/h. Tuần tới: Nắng nóng ban ngày, mưa rào chiều tối với nhiệt độ trung bình 28-33°C."

Hãy trả lời bằng tiếng Việt một cách thân thiện, chi tiết và hữu ích.`

    if (sensorData) {
      systemMessage += `\n\nDữ liệu cảm biến hiện tại:
${JSON.stringify(sensorData, null, 2)}`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const reply = completion.choices[0].message.content

    res.status(200).json({ reply })
  } catch (error) {
    console.error('ChatGPT Error:', error)
    res.status(500).json({ 
      message: 'Error communicating with ChatGPT', 
      error: error.message 
    })
  }
}
