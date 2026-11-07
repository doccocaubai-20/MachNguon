"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  workspaceId: string;
  narrators: Array<{ id: string; fullName: string }>;
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
}

export function AudioRecorder({ workspaceId, narrators }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedNarrator, setSelectedNarrator] = useState(narrators[0]?.id || "");
  const [description, setDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Giới hạn ghi âm theo MVP: 10 phút (600 giây)
  const MAX_RECORDING_SECONDS = 600;

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setSeconds(0);
      setAudioUrl(null);
      setAudioBlob(null);
      setStatusMessage("Đang ghi âm giọng kể trực tiếp...");
    } catch (err: any) {
      alert("Không thể truy cập micro. Vui lòng cấp quyền micro cho trình duyệt.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setStatusMessage("Tạm dừng ghi âm.");
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setStatusMessage("Đang tiếp tục ghi âm...");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setStatusMessage("Đã hoàn tất bản thu âm. Hãy nghe lại trước khi lưu vào kho.");
    }
  };

  const resetRecording = () => {
    if (confirm("Bạn có chắc chắn muốn bỏ bản ghi này để thu âm lại?")) {
      setAudioUrl(null);
      setAudioBlob(null);
      setSeconds(0);
      setIsRecording(false);
      setIsPaused(false);
      setStatusMessage(null);
    }
  };

  const handleSaveToWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!audioBlob) return;

    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề cho bản ghi âm.");
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      if (new FormData(e.currentTarget).has("shared_with_family")) {
        formData.set("shared_with_family", "true");
      }
      formData.append("workspace_id", workspaceId);
      formData.append("title", title);
      formData.append("narrator_id", selectedNarrator);
      formData.append("description", description);
      formData.append("duration_seconds", seconds.toString());
      formData.append("file", audioBlob, `recording_${Date.now()}.webm`);

      const res = await fetch(`/api/workspaces/${workspaceId}/assets/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Tải bản ghi âm lên kho thất bại.");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi lưu bản ghi.");
      setIsSaving(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div>
          <h2 className="font-serif font-bold text-lg text-ink">
            Ghi âm lời kể trực tiếp
          </h2>
          <p className="text-xs text-ink-muted">
            Thu âm ngắn 3–10 phút/phiên. Giữ nguyên âm thanh giọng nói gốc không qua chỉnh sửa.
          </p>
        </div>
        <div className="text-right">
          <span className={`font-mono text-2xl font-bold ${isRecording && !isPaused ? "text-terracotta animate-pulse" : "text-ink"}`}>
            {formatTime(seconds)}
          </span>
          <p className="text-[10px] text-ink-muted">Tối đa: 10:00</p>
        </div>
      </div>

      {/* Recording controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        {!isRecording && !audioUrl && (
          <button
            type="button"
            onClick={startRecording}
            className="btn px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white rounded-2xl font-semibold flex items-center gap-2 shadow-sm transition-all text-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            Bắt đầu thu âm
          </button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="btn px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-medium text-xs transition-colors"
              >
                Tạm dừng
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="btn px-5 py-2.5 bg-forest/10 hover:bg-forest/20 text-forest border border-forest/30 rounded-xl font-medium text-xs transition-colors"
              >
                Tiếp tục ghi
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="btn px-5 py-2.5 bg-forest hover:bg-forest-hover text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
            >
              Hoàn tất & Nghe lại
            </button>
          </>
        )}

        {audioUrl && !isRecording && (
          <button
            type="button"
            onClick={resetRecording}
            className="btn px-4 py-2 bg-stone-100 hover:bg-stone-200 text-ink rounded-xl text-xs font-medium transition-colors"
          >
            Ghi âm lại
          </button>
        )}
      </div>

      {statusMessage && (
        <p className="text-center text-xs text-ink-muted italic">{statusMessage}</p>
      )}

      {/* Audio Playback & Form Save */}
      {audioUrl && (
        <form onSubmit={handleSaveToWorkspace} className="space-y-4 pt-4 border-t border-stone-100">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Nghe lại bản thu âm:</label>
            <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink">
                Tiêu đề bản ghi <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bà kể về ngày chuyển về phố cổ..."
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink">Người kể chuyện</label>
              <select
                value={selectedNarrator}
                onChange={(e) => setSelectedNarrator(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="">-- Chưa gán người kể --</option>
                {narrators.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink">Ghi chú bối cảnh</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi âm vào dịp nào, ai cùng ngồi nghe..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-cream-50/50 focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="shared_with_family" />
            Chia sẻ bản ghi với gia đình
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="btn w-full bg-forest hover:bg-forest-hover disabled:bg-stone-300 text-white font-medium py-2.5 rounded-xl text-xs transition-colors shadow-sm"
          >
            {isSaving ? "Đang lưu vào kho tư liệu..." : "Lưu vào kho tư liệu gia đình"}
          </button>
        </form>
      )}
    </div>
  );
}
