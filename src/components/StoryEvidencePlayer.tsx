"use client";

import { useState, useRef } from "react";
import { StoryEvidenceRef, TranscriptSegment } from "@/contracts/story.contract";

interface Props {
  audioPath: string | null;
  audioTitle?: string | null;
  evidenceRefs: StoryEvidenceRef[];
  transcriptSegments: TranscriptSegment[];
}

export function StoryEvidencePlayer({
  audioPath,
  audioTitle,
  evidenceRefs,
  transcriptSegments,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const formatSeconds = (sec: number | null | undefined) => {
    if (sec === null || sec === undefined) return "00:00";
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const jumpToTime = (startTime: number | null | undefined, id?: string) => {
    if (!audioRef.current || startTime === null || startTime === undefined) return;
    audioRef.current.currentTime = startTime;
    audioRef.current.play();
    if (id) setActiveSegmentId(id);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  if (!audioPath) {
    return (
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-ink-muted">
        Câu chuyện này hiện chưa liên kết với bản ghi âm giọng nói.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audio Player Stick / Card */}
      <div className="bg-cream-100 border border-cream-200 rounded-2xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase text-forest bg-forest/10 px-2 py-0.5 rounded border border-forest/20">
              Ghi âm gốc
            </span>
            <span className="text-xs font-serif font-bold text-ink">
              {audioTitle || "Bản ghi âm giọng kể nguồn gốc"}
            </span>
          </div>
          <span className="font-mono text-xs text-terracotta font-semibold">
            {formatSeconds(currentTime)}
          </span>
        </div>

        <audio
          ref={audioRef}
          src={audioPath}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-10 rounded-xl"
        />
        <p className="text-[11px] text-ink-muted">
          Hướng dẫn: Bấm vào mốc thời gian để nghe đoạn âm thanh bằng chứng đối chiếu.
        </p>
      </div>

      {/* Trích dẫn Bằng chứng Đối soát (Evidence Quotes) */}
      {evidenceRefs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-sm text-ink">
            Đoạn trích dẫn đối chiếu nguồn gốc ({evidenceRefs.length})
          </h3>
          <div className="space-y-2">
            {evidenceRefs.map((ref) => {
              const start = ref.start_time_seconds ? Number(ref.start_time_seconds) : null;
              const isCurrent =
                start !== null &&
                currentTime >= start &&
                (ref.end_time_seconds ? currentTime <= Number(ref.end_time_seconds) : true);

              return (
                <div
                  key={ref.id}
                  onClick={() => jumpToTime(start, ref.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isCurrent
                      ? "bg-forest/10 border-forest text-forest shadow-xs font-medium"
                      : "bg-white border-stone-200 hover:border-forest/40 text-ink"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="italic leading-relaxed">"{ref.quote_text}"</p>
                  </div>
                  {start !== null && (
                    <button
                      type="button"
                      className="shrink-0 font-mono text-[11px] bg-cream-100 hover:bg-cream-200 text-forest px-2.5 py-1 rounded-lg border border-cream-200 font-semibold transition-colors"
                    >
                      {formatSeconds(start)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript Chi Tiết Từng Câu */}
      {transcriptSegments.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-serif font-bold text-sm text-ink">
            Bản chép lời nguyên văn (Transcript) ({transcriptSegments.length} đoạn)
          </h3>
          <div className="divide-y divide-stone-100 bg-white border border-stone-200 rounded-2xl p-4 space-y-2 max-h-80 overflow-y-auto">
            {transcriptSegments.map((seg) => {
              const start = Number(seg.start_time_seconds);
              const end = Number(seg.end_time_seconds);
              const isPlaying = currentTime >= start && currentTime <= end;

              return (
                <div
                  key={seg.id}
                  onClick={() => jumpToTime(start, seg.id)}
                  className={`py-2 px-2 rounded-lg cursor-pointer transition-colors flex items-start gap-3 text-xs ${
                    isPlaying ? "bg-cream-100 text-forest font-medium" : "hover:bg-stone-50 text-ink-muted"
                  }`}
                >
                  <span className="font-mono text-[10px] text-terracotta shrink-0 pt-0.5">
                    [{formatSeconds(start)}]
                  </span>
                  <div>
                    {seg.speaker && (
                      <strong className="text-ink mr-1.5">{seg.speaker}:</strong>
                    )}
                    <span>{seg.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
