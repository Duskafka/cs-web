'use client';

import { Brain, GitFork, Link2, Sparkles } from 'lucide-react';
import type { GraphStats } from '@/types/graph';

export interface StatsHeaderProps {
  stats: GraphStats;
  /** 모바일에서는 2D 모드로 동작 중임을 알린다. */
  reducedMode: boolean;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className="text-slate-500">{icon}</span>
      <span className="tabular-nums text-slate-200">{value}</span>
      <span className="hidden text-slate-500 sm:inline">{label}</span>
    </div>
  );
}

export default function StatsHeader({ stats, reducedMode }: StatsHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/60 px-4 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <Brain className="h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
        <h1 className="truncate text-sm font-semibold tracking-tight text-slate-100">
          CS 지식 뇌 지도
        </h1>
        {reducedMode && (
          <span className="shrink-0 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
            2D 모드
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs">
        <Stat icon={<Sparkles className="h-3.5 w-3.5" />} label="노트" value={stats.noteCount} />
        <Stat icon={<Link2 className="h-3.5 w-3.5" />} label="연결" value={stats.linkCount} />
        <Stat icon={<GitFork className="h-3.5 w-3.5" />} label="미작성" value={stats.ghostCount} />
      </div>
    </header>
  );
}
