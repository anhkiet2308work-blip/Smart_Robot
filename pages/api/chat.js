import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { message, sensorData } = req.body

    if (!message) {
      return res.status(400).json({ message: 'Message is required' })
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

Hãy trả lời bằng tiếng Việt một cách thân thiện và hữu ích.`

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
