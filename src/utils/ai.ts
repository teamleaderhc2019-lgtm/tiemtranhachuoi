/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { MenuItem } from '../types';

// Fallback direct HTTP Fetch to ensure 100% uptime and resilience against bundle quirks
async function callGeminiDirect(apiKey: string, prompt: string, systemInstruction?: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
    ...(systemInstruction ? {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`Google API Error: ${message}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Phản hồi từ Gemini không có nội dung chữ.');
  }
  return text;
}

/**
 * Returns the effective API Key. Priorities:
 * 1. Saved custom key in localStorage (from Admin Panel settings)
 * 2. Vite environment variable
 */
export function getGeminiApiKey(customKey?: string): string | null {
  if (customKey && customKey.trim().length > 10) {
    return customKey.trim();
  }
  const localSaved = localStorage.getItem('TEAFLOW_CUSTOM_GEMINI_KEY');
  if (localSaved && localSaved.trim().length > 10) {
    return localSaved.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') {
    return envKey;
  }
  return null;
}

/**
 * AI Drink recommendation engine for Customer Panel
 */
export async function recommendDrinks(
  menu: MenuItem[],
  userMessage: string,
  history: { role: 'user' | 'model'; text: string }[],
  customKey?: string
): Promise<string> {
  const apiKey = getGeminiApiKey(customKey);
  if (!apiKey) {
    return `⚠️ **Không tìm thấy API Key Gemini!**\n\nVui lòng cấu hình API Key của bạn trong **Bảng Quản Trị > Tab Cơ sở dữ liệu & AI** để bắt đầu trò chuyện cùng Trợ lý Trà sữa AI.`;
  }

  // Build menu list for AI context
  const menuContext = menu
    .map(
      (item) =>
        `- **[ID: ${item.id}] ${item.name}**: Giá ${item.price.toLocaleString()}đ. Nhóm: ${item.category}. Mô tả: ${item.description}`
    )
    .join('\n');

  const systemInstruction = `Bạn là Trợ lý Pha chế AI (AI TeaFlow Barista) siêu dễ thương, thân thiện của quán trà sữa cao cấp TeaFlow POS SECURE. 
Nhiệm vụ của bạn là tư vấn nhiệt tình và gợi ý các món nước có thực tế trong thực đơn của quán dựa trên yêu cầu, tâm trạng hoặc khẩu vị của khách.

ĐÂY LÀ THỰC ĐƠN THỰC TẾ CỦA QUÁN:
${menuContext}

LƯU Ý QUAN TRỌNG VỀ ĐỊNH DẠNG ĐẶC BIỆT:
- Bạn CHỈ được phép tư vấn và đề xuất các món nước CÓ THỰC trong thực đơn trên (đúng ID và đúng tên món).
- Khi bạn gợi ý món nước nào đó từ thực đơn, bạn BẮT BUỘC phải đính kèm nút hành động đặt hàng nhanh có cú pháp đặc biệt sau đây ở cuối mỗi món nước:
  \`[ORDER:ID_MON_NUOC]\`
  Ví dụ: Bạn gợi ý món "Trà Đào Cam Sả" có ID là \`m_dao_camsa\`, hãy viết: "Tôi đề xuất món Trà Đào Cam Sả thơm mát... [ORDER:m_dao_camsa]"
  Nút đặc biệt này sẽ được hệ thống hiển thị thành nút bấm tương tác thực tế giúp khách hàng click đặt nhanh cực kỳ chuyên nghiệp. Không chèn mã ORDER cho các món không tồn tại.
- Hãy trả lời ngắn gọn, vui vẻ, thân thiện bằng tiếng Việt, chia các món nước thành danh sách rõ ràng, dễ nhìn. Khuyên khách hàng về đá/đường phù hợp (ví dụ: ít ngọt cho người ăn kiêng).`;

  // Construct history conversation
  const historyPrompt = history
    .map((h) => `${h.role === 'user' ? 'Khách hàng' : 'Trợ lý AI'}: ${h.text}`)
    .join('\n');

  const fullPrompt = `${historyPrompt}\nKhách hàng: ${userMessage}\nTrợ lý AI:`;

  try {
    // Attempt via direct HTTP Fetch which is fast, lightweight, and bypasses bundle bugs
    return await callGeminiDirect(apiKey, fullPrompt, systemInstruction);
  } catch (err: any) {
    console.error("Gemini direct call error, falling back", err);
    
    // In case of SDK usage check
    try {
      // Dynamic import to prevent bundler errors if @google/genai is not behaving
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      });
      return response.text || "Phản hồi trống.";
    } catch (sdkErr: any) {
      console.error("Gemini SDK call error too", sdkErr);
      return `❌ **Lỗi giao tiếp AI**: ${err.message || 'Không thể kết nối dịch vụ Google Gemini API.'}`;
    }
  }
}

/**
 * AI Business analyst engine for Admin Panel
 */
export async function analyzeBusiness(reportData: any, customKey?: string): Promise<string> {
  const apiKey = getGeminiApiKey(customKey);
  if (!apiKey) {
    return `⚠️ **Không tìm thấy API Key Gemini!**\n\nVui lòng cấu hình API Key của bạn trong **Cơ sở dữ liệu & AI** để bắt đầu phân tích dữ liệu kinh doanh.`;
  }

  const systemInstruction = `Bạn là Trợ lý Giám đốc Kinh doanh AI (AI Business Analyst Director) chuyên nghiệp, có đầu óc chiến lược dành cho quán trà sữa TeaFlow.
Nhiệm vụ của bạn là đọc báo cáo bán hàng, hao hụt nguyên vật liệu và tài chính để đưa ra những phân tích sắc bén, sâu sắc, thực tiễn và dễ hiểu giúp chủ quán tối ưu doanh thu.

ĐỊNH DẠNG PHẢN HỒI:
- Trả lời bằng tiếng Việt văn phong trang trọng, chuyên nghiệp, cấu trúc rõ ràng sử dụng Markdown (H2, H3, bảng biểu, in đậm).
- Sử dụng các ký hiệu biểu tượng cảm xúc (emoji) hợp lý để báo cáo trực quan sinh động.
- Cấu trúc gồm 4 phần:
  1. 📈 **Đánh giá sức khỏe tài chính tổng quát** (Nhận xét về Doanh thu, Chi phí, Lợi nhuận ròng, tỷ suất lợi nhuận).
  2. 🧋 **Phân tích Xu hướng tiêu thụ Đồ uống** (Nhận diện món bán tốt nhất dựa trên hao vật liệu).
  3. ⚠️ **Cảnh báo tồn kho & Chu kỳ cạn kiệt nguyên liệu** (Chỉ ra nguyên vật liệu nào sắp cạn kiệt và ước tính số ngày cần bổ sung dựa trên tốc độ tiêu thụ).
  4. 💡 **Đề xuất hành động thực tiễn** (Ví dụ: chạy combo ưu đãi nào, thay đổi công thức hoặc giá bán thế nào để tăng biên lợi nhuận).`;

  const prompt = `Hãy phân tích dữ liệu kinh doanh thực tế hiện tại của quán trà sữa dưới đây và lập báo cáo chi tiết:
  
${JSON.stringify(reportData, null, 2)}

Hãy phân tích thật chi tiết, có con số thực tế đi kèm từ dữ liệu trên.`;

  try {
    return await callGeminiDirect(apiKey, prompt, systemInstruction);
  } catch (err: any) {
    console.error("Gemini Business Direct Call Error", err);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.4,
          maxOutputTokens: 2048,
        }
      });
      return response.text || "Phản hồi trống.";
    } catch (sdkErr: any) {
      return `❌ **Lỗi phân tích AI**: ${err.message || 'Không thể kết nối đến máy chủ AI.'}`;
    }
  }
}
