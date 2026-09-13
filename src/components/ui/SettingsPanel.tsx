'use client';

import { useSettingsStore } from '@/store/settingsStore';

interface ChoiceProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** 한 줄짜리 선택 스위치. 설명 줄 없이 이름과 선택지만 둔다. */
function Choice<T extends string>({ label, value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-[13px] text-slate-300">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex shrink-0 rounded-lg border border-white/10 p-0.5"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`rounded-md px-2 py-0.5 text-[11px] transition ${
                active ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 사이트 설정.
 *
 * 값은 localStorage 에 남아 다음 방문에도 이어진다. 기기마다 따로 저장된다.
 */
export default function SettingsPanel() {
  const renderMode = useSettingsStore((state) => state.renderMode);
  const contentWidth = useSettingsStore((state) => state.contentWidth);
  const setRenderMode = useSettingsStore((state) => state.setRenderMode);
  const setContentWidth = useSettingsStore((state) => state.setContentWidth);

  return (
    <section>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        설정
      </h2>

      <div className="space-y-2">
        <Choice
          label="그래프"
          value={renderMode}
          options={[
            { value: '3d', label: '3D' },
            { value: '2d', label: '2D' },
          ]}
          onChange={setRenderMode}
        />
        <Choice
          label="노트 본문"
          value={contentWidth}
          options={[
            { value: 'reading', label: '읽기 폭' },
            { value: 'full', label: '전체 폭' },
          ]}
          onChange={setContentWidth}
        />
      </div>
    </section>
  );
}
