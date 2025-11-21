import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

// Function to detect food and digestive insights from a base64 encoded image
async function detectFoodAndDigestiveInsights(base64Image) {
    const apiKey = env.GOOGLE_AI_API_KEY || env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Extract MIME type and pure base64 data from the image string
    const match = base64Image.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error('Định dạng dữ liệu hình ảnh không hợp lệ.');
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
    Hãy nhận diện món ăn trong hình và phân tích các yếu tố ảnh hưởng đến tiêu hóa của trẻ em.
    Vui lòng trả về kết quả dưới dạng JSON thuần túy (không có markdown block) với cấu trúc sau:
    {
        "items": ["món ăn 1", "món ăn 2"],
        "total_calories": xx,
        "digestive_analysis": {
            "fodmap_level": "Low/Medium/High",
            "fiber_content": "Low/Medium/High",
            "allergens": ["Gluten", "Lactose", "Nuts", "Soy", "None"],
            "texture": "Soft/Crunchy/Mixed/Liquid",
            "digestibility_score": 1-10 (10 là dễ tiêu hóa nhất),
            "micronutrients": {
                "iron": "Low/Medium/High",
                "zinc": "Low/Medium/High",
                "vitamin_d": "Low/Medium/High"
            },
            "warnings": ["Cảnh báo 1", "Cảnh báo 2"]
        }
    }
    Chỉ trả về JSON, không bao gồm nội dung khác.
    `;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}, ${await response.text()}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
            console.error('Raw response:', text);
            throw new Error('Không tìm thấy JSON hợp lệ trong phản hồi.');
        }

        const jsonStr = text.substring(startIndex, endIndex + 1);

        let parsedData;
        try {
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            console.error('JSON Parse Error:', e);
            console.error('Raw JSON string:', jsonStr);
            try {
                const cleaned = jsonStr.replace(/```json/g, '').replace(/```/g, '');
                parsedData = JSON.parse(cleaned);
            } catch (e2) {
                throw new Error(`JSON Parse error: ${e.message}`);
            }
        }

        return {
            items: parsedData.items,
            count: parsedData.total_calories,
            digestive_analysis: parsedData.digestive_analysis,
            success: true
        };
    } catch (error) {
        console.error('API call failed:', error);
        throw new Error(`Failed to analyze food: ${error.message}`);
    }
}

export async function POST({ request }) {
    try {
        const { image } = await request.json();
        const result = await detectFoodAndDigestiveInsights(image);
        return json(result);
    } catch (error) {
        return json({ success: false, message: error.message }, { status: 500 });
    }
}