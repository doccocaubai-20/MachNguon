const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export interface StoryExtractionResult {
  title: string;
  summary: string;
  milestones: Array<{ year?: string; title: string; description: string }>;
  keyLessons: string[];
}

export class GeminiService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model || process.env.GEMINI_MODEL || "gemini-3.5-flash";
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  /**
   * Gọi Google AI Studio API sinh nội dung
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const payload: any = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
        }
      };

      if (systemPrompt) {
        payload.systemInstruction = {
          parts: [{ text: systemPrompt }]
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Gemini API Error] Status ${response.status}: ${await response.text()}`);
        return null;
      }

      const json = await response.json();
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      return text ? text.trim() : null;
    } catch (err: any) {
      console.warn(`[Gemini API Exception]`, err.message || err);
      return null;
    }
  }

  /**
   * Tổng hợp câu trả lời hỏi đáp ký ức gia đình dựa trên các dữ kiện gốc đã truy xuất
   */
  async synthesizeFamilyAnswer(
    question: string,
    citations: Array<{ source_title: string; quote_text: string }>,
    baseAnswer: string,
    hasSufficientData: boolean
  ): Promise<string> {
    if (!this.isAvailable()) return baseAnswer;

    // Nếu không đủ dữ kiện, trả về lời hướng dẫn ấm áp và gợi ý hỏi thêm
    if (!hasSufficientData || citations.length === 0) {
      const systemPrompt = `Bạn là Trợ lý Ký ức Gia đình Mạch Nguồn thông minh, tôn kính, chu đáo. 
Nhiệm vụ: Khi kho dữ liệu gia đình chưa có thông tin đã được kiểm chứng cho câu hỏi của con cháu, hãy trả lời nhã nhặn, giải thích rõ hiện tại kho ký ức gia đình chưa ghi nhận dữ liệu xác thực này, và gợi ý con cháu phỏng vấn hoặc hỏi các bậc cao niên để ghi lại vào Mạch Nguồn. Không tự bịa thông tin.`;
      
      const prompt = `Câu hỏi của thành viên gia đình: "${question}"
Hãy trả lời ngắn gọn (2-3 câu), ấm áp, thân thiện theo phong cách gia đình Việt Nam.`;

      const aiText = await this.generateText(prompt, systemPrompt);
      return aiText || baseAnswer;
    }

    // Khi đã có dữ kiện trích dẫn từ cẩm nang, câu chuyện, người thân hoặc dòng thời gian
    const context = citations
      .map((c, i) => `[Tư liệu ${i + 1}: ${c.source_title}]\n"${c.quote_text}"`)
      .join("\n\n");

    const systemPrompt = `Bạn là Trợ lý Tri thức Ký ức Gia đình Mạch Nguồn. 
Nhiệm vụ: Dựa hoàn toàn vào các tư liệu gốc và trích dẫn được cung cấp để trả lời câu hỏi của con cháu trong gia đình.
Nguyên tắc:
1. Giữ tuyệt đối tính chân thực của dữ kiện (người, năm tháng, bí quyết, nguyên liệu, thao tác).
2. Diễn đạt truyền cảm, ấm áp, văn phong gia đình Việt Nam, vừa gần gũi vừa chuẩn xác.
3. Không tự sáng tác ra sự thật ngoài các tư liệu đã cho.`;

    const prompt = `Các tư liệu gốc xác thực trong kho ký ức gia đình:
${context}

Câu hỏi cần giải đáp: "${question}"

Hãy trả lời thật súc tích, mạch lạc và đầy đủ thông tin:`;

    const aiText = await this.generateText(prompt, systemPrompt);
    return aiText || baseAnswer;
  }

  /**
   * Phân tích văn bản ghi chép/lời kể, trích xuất cấu trúc câu chuyện và bài học gia đình
   */
  async extractStoryInsights(rawNotes: string): Promise<StoryExtractionResult | null> {
    if (!this.isAvailable() || !rawNotes.trim()) return null;

    const systemPrompt = `Bạn là trợ lý biên tập hồi ký gia đình. Bạn nhận được bản ghi âm hoặc ghi chép thô từ người lớn tuổi, và cần trích xuất thành định dạng JSON chuẩn.
Định dạng JSON yêu cầu:
{
  "title": "Tiêu đề trang trọng, giàu cảm xúc",
  "summary": "Tóm tắt 2-3 câu nội dung chính và thông điệp",
  "milestones": [
    { "year": "1972", "title": "Tên mốc sự kiện", "description": "Chi tiết ngắn gọn" }
  ],
  "keyLessons": [
    "Bài học hoặc lời răn dạy của cha ông rút ra từ câu chuyện"
  ]
}
Chỉ trả về JSON thuần túy, không có markdown code blocks hay giải thích ngoài.`;

    const prompt = `Nội dung ghi chép/lời kể thô:\n"""\n${rawNotes}\n"""`;

    const response = await this.generateText(prompt, systemPrompt);
    if (!response) return null;

    try {
      const cleanJson = response.replace(/^```json/m, "").replace(/^```/m, "").trim();
      return JSON.parse(cleanJson);
    } catch {
      return null;
    }
  }

  /**
   * Viết văn tế, hồi ký hoặc bài văn tri ân tiền nhân dựa trên tư liệu
   */
  async composeTribute(topic: string, details: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    const systemPrompt = `Bạn là chuyên gia văn học truyền thống và hồi ký gia phả Việt Nam. Hãy chắp bút một bài viết ý nghĩa, trang trọng, thấm đượm đạo lý "Uống nước nhớ nguồn".`;
    const prompt = `Chủ đề: ${topic}\nChi tiết dữ kiện gia đình:\n${details}\n\nHãy viết một bài tưởng niệm / tri ân hoàn chỉnh:`;

    return await this.generateText(prompt, systemPrompt);
  }
}
