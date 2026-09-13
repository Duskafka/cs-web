'use client';

import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** 현재 검색어에 걸린 노드 수. 검색어가 비어 있으면 null. */
  matchCount: number | null;
}

export default function SearchBar({ value, onChange, matchCount }: SearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="제목, 태그, 본문 검색"
        aria-label="노트 검색"
        className="w-full rounded-lg border border-white/10 bg-slate-900/70 py-2 pl-9 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {matchCount !== null && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {matchCount === 0 ? '일치하는 노트가 없습니다' : `${matchCount}개 일치`}
        </p>
      )}
    </div>
  );
}
