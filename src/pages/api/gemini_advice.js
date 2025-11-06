// Server-side proxy to call Google Gemini (Generative Language) API.
// This keeps the API key server-side instead of exposing it to the browser.

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Phương thức không được phép' });  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'Thiếu khóa API trên máy chủ' });
  }

  try {
    const { note, emotion, severity, time } = req.body || {};

    const prompt = `Cung cấp lời khuyên hỗ trợ nhẹ nhàng, không mang tính chẩn đoán cho phụ huynh có con gặp vấn đề về tiêu hóa.\n
Ghi chú triệu chứng: ${note}\nCảm xúc quan sát được: ${emotion}\nMức độ: ${severity}\nThời gian: ${time}\n
Đề xuất các biện pháp hỗ trợ ngay lập tức (uống nước, thực phẩm nên tránh, thực phẩm nên dùng), và khi nào cần đi khám. Giữ ngắn gọn (3-5 điểm chính) và viết cho phụ huynh.`;

    // Call Google's Gemini API
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const body = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    const apiRes = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ success: false, message: 'Lỗi API từ hệ thống bên ngoài' });
    }

    const apiData = await apiRes.json();

    // Extract text from Gemini API response
    let advice = '';
    if (apiData && apiData.candidates && apiData.candidates[0] && apiData.candidates[0].content) {
      advice = apiData.candidates[0].content.parts[0].text;
    } else {
      // Fallback: stringify whole response
      console.error('Unexpected API response structure:', apiData);
      advice = 'Xin lỗi, có lỗi xảy ra khi xử lý phản hồi từ AI. Vui lòng thử lại sau.';
    }

    return res.status(200).json({ success: true, advice });
  } catch (err) {
    console.error('Server error when calling Gemini:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
  }
}
