// Simple static mapping to provide GI-related insights for detected foods.
// This is intentionally small and conservative — meant as a helpful hint only,
// not medical advice. Use in conjunction with a clinician for diagnosis.

const FOOD_MAP = {
    strawberries: { flags: ['chất-xơ', 'vitamin-c'], advice: 'Giàu vitamin C và chất chống oxy hóa. Ăn với lượng vừa phải, có thể gây kích ứng ở trẻ nhạy cảm.' },
    "strawberry": { flags: ['chất-xơ', 'vitamin-c'], advice: 'Giàu vitamin C và chất chống oxy hóa. Ăn với lượng vừa phải, có thể gây kích ứng ở trẻ nhạy cảm.' },
    "chicken drumstick": { flags: ['protein', 'thịt-trắng'], advice: 'Thịt gà dễ tiêu hóa hơn thịt đỏ. Nên nướng hoặc luộc, tránh chiên rán.' },
    "chicken": { flags: ['protein', 'thịt-trắng'], advice: 'Thịt gà dễ tiêu hóa hơn thịt đỏ. Nên nướng hoặc luộc, tránh chiên rán.' },
    "cucumber": { flags: ['nhiều-nước', 'dễ-tiêu'], advice: 'Dưa chuột giàu nước, dễ tiêu hóa và có tác dụng làm mát. Nên gọt vỏ để dễ tiêu hóa hơn.' },
    "cucumber slices": { flags: ['nhiều-nước', 'dễ-tiêu'], advice: 'Dưa chuột giàu nước, dễ tiêu hóa và có tác dụng làm mát. Nên gọt vỏ để dễ tiêu hóa hơn.' },
    rice: { flags: ['ít-chất-xơ'], advice: 'Dễ tiêu hóa, tốt cho dạ dày khó chịu.' },
    "white rice": { flags: ['ít-chất-xơ'], advice: 'Dễ tiêu hóa, tốt cho dạ dày khó chịu.' },
    bread: { flags: ['gluten', 'ít-chất-xơ'], advice: 'Nếu nhạy cảm với gluten, nên chọn bánh mì không gluten hoặc nướng giòn để dễ tiêu hóa.' },
    banana: { flags: ['ít-chất-xơ', 'kali'], advice: 'Chuối dễ tiêu hóa và giúp cân bằng điện giải.' },
    apple: { flags: ['chất-xơ'], advice: 'Nhiều chất xơ - có thể gây đầy hơi ở trẻ nhạy cảm; nên ăn táo chín.' },
    milk: { flags: ['sữa'], advice: 'Sữa có thể làm nặng hơn các triệu chứng ở trẻ không dung nạp lactose; nên dùng sữa không lactose.' },
    cheese: { flags: ['sữa', 'béo'], advice: 'Các sản phẩm từ sữa nhiều chất béo có thể khó tiêu hóa; nên dùng ít.' },
    potato: { flags: ['tinh-bột'], advice: 'Thường dễ tiêu hóa khi luộc hoặc nghiền.' },
    fried: { flags: ['nhiều-dầu-mỡ'], advice: 'Thức ăn chiên rán thường khó tiêu - nên tránh khi đang khó chịu.' },
    "fried chicken": { flags: ['nhiều-dầu-mỡ'], advice: 'Nhiều chất béo - có thể gây khó tiêu.' },
    beef: { flags: ['béo', 'protein'], advice: 'Thịt đỏ có thể khó tiêu; nên chọn phần nạc và ăn ít.' },
    fish: { flags: ['protein', 'nhẹ'], advice: 'Thường dễ tiêu hơn thịt đỏ; nên hấp hoặc nướng.' },
    egg: { flags: ['protein'], advice: 'Trứng thường dễ tiêu hóa; cần theo dõi dị ứng ở từng trẻ.' },
    soup: { flags: ['bổ-sung-nước', 'nhẹ'], advice: 'Súp nóng, có nước dùng thường dễ chịu cho dạ dày.' },
    noodle: { flags: ['tinh-bột'], advice: 'Nên chọn mì với nước dùng đơn giản, không cay.' }
};

export function getInsightsForFood(name) {
    if (!name) return null;
    const key = name.toLowerCase();
    // try exact match
    if (FOOD_MAP[key]) return FOOD_MAP[key];
    // try to find a keyword in the name
    for (const term of Object.keys(FOOD_MAP)) {
        if (key.includes(term)) return FOOD_MAP[term];
    }
    return { flags: [], advice: 'Chưa có hướng dẫn cụ thể cho thực phẩm này.' };
}

export function aggregateInsights(foodItems = []) {
    const items = foodItems.map((f) => ({ name: f, insight: getInsightsForFood(f) }));
    return items;
}

export default {
    getInsightsForFood,
    aggregateInsights
};