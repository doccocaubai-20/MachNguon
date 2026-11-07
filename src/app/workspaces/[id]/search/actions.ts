"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/server/db";
import { SearchService } from "@/lib/server/search.service";
import { SearchResultType } from "@/contracts/search.contract";
import { GeminiService } from "@/lib/server/gemini.service";

export async function askQuestionAction(
  workspaceId: string,
  question: string,
  enableAi: boolean = true
) {
  try {
    const user = await getCurrentUser();
    const db = await getDb();
    const service = new SearchService(db);
    const result = await service.askQuestion(user.id, workspaceId, question, { enableAi });
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể thực hiện hỏi đáp" };
  }
}

export async function searchVaultAction(
  workspaceId: string,
  query: string,
  type?: SearchResultType
) {
  try {
    const user = await getCurrentUser();
    const db = await getDb();
    const service = new SearchService(db);
    const results = await service.search(user.id, workspaceId, { query, type });
    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message || "Tìm kiếm thất bại" };
  }
}

export async function runBenchmarkAction(workspaceId: string) {
  try {
    const user = await getCurrentUser();
    const db = await getDb();
    const service = new SearchService(db);
    const result = await service.runBenchmark20Questions(user.id, workspaceId);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể chạy benchmark" };
  }
}

export async function checkAiStatusAction() {
  const gemini = new GeminiService();
  return {
    available: gemini.isAvailable(),
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  };
}

export async function extractStoryWithAiAction(rawNotes: string) {
  try {
    await getCurrentUser();
    const gemini = new GeminiService();
    if (!gemini.isAvailable()) {
      return { success: false, error: "AI chưa được cấu hình API key" };
    }
    const result = await gemini.extractStoryInsights(rawNotes);
    if (!result) {
      return { success: false, error: "Không thể trích xuất cấu trúc câu chuyện từ nội dung đã cung cấp" };
    }
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi xử lý AI" };
  }
}

export async function composeTributeWithAiAction(topic: string, details: string) {
  try {
    await getCurrentUser();
    const gemini = new GeminiService();
    if (!gemini.isAvailable()) {
      return { success: false, error: "AI chưa được cấu hình API key" };
    }
    const result = await gemini.composeTribute(topic, details);
    if (!result) {
      return { success: false, error: "Không thể chắp bút bài tri ân từ AI" };
    }
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi xử lý AI" };
  }
}
