'use client';

import { CATEGORY_ORDER, LOBES } from '@/lib/brainLobeMap';
import type { CategoryId } from '@/types/graph';

export interface CategoryFilterProps {
  activeCategories: Set<CategoryId>;
  countByCategory: Record<CategoryId, number>;
  onToggle: (category: CategoryId) => void;
  onReset: () => void;
}

/**
 * 카테고리 필터.
 *
 * 끈 카테고리의 노드는 그래프에서 제거하지 않고 흐려지기만 한다. 노드를 빼면
 * 힘 시뮬레이션이 다시 요동쳐 사용자가 보던 뇌 형태가 무너지기 때문이다.
 */
export default function CategoryFilter({
  activeCategories,
  countByCategory,
  onToggle,
  onReset,
}: CategoryFilterProps) {
  const allOn = activeCategories.size === CATEGORY_ORDER.length;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          카테고리
        </h2>
        {!allOn && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-cyan-400 transition hover:text-cyan-300"
          >
            전체 보기
          </button>
        )}
      </div>

      <ul className="space-y-1">
        {CATEGORY_ORDER.map((id) => {
          const lobe = LOBES[id];
          const active = activeCategories.has(id);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onToggle(id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                  active ? 'bg-white/5 hover:bg-white/10' : 'opacity-40 hover:opacity-70'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition"
                  style={{
                    backgroundColor: lobe.color,
                    boxShadow: active ? `0 0 8px ${lobe.color}` : 'none',
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200">
                  {lobe.label}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                  {countByCategory[id] ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
