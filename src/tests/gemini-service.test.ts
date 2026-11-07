import { describe, it, expect } from "vitest";
import { GeminiService } from "@/lib/server/gemini.service";

describe("GeminiService Integration", () => {
  it("should be available with configured API key", () => {
    const service = new GeminiService();
    expect(service.isAvailable()).toBe(true);
  });

  it("should generate a response from gemini-3.5-flash", async () => {
    const service = new GeminiService();
    const result = await service.generateText("Xin chào, hãy trả lời đúng 3 từ: Mạch Nguồn AI");
    console.log("Gemini response:", result);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  }, 30000);

  it("should synthesize family answer with citations", async () => {
    const service = new GeminiService();
    const answer = await service.synthesizeFamilyAnswer(
      "Bí quyết pha bột bánh gối của bà Mai là gì?",
      [
        {
          source_title: "Cẩm nang Bánh gối gia truyền",
          quote_text: "Tỷ lệ: 500g bột mì hoa ngọc lan, 50g bột gạo tẻ, 1 quả trứng gà, 50g bơ lạt đun chảy.",
        },
      ],
      "Tỷ lệ bột...",
      true
    );
    console.log("Synthesized answer:", answer);
    expect(answer).toBeTruthy();
  }, 30000);
});
