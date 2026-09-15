import RetroTimeline from '@/components/retro/RetroTimeline';
import TabNav from '@/components/ui/TabNav';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { getRetroEntries } from '@/lib/retro';

/**
 * 회고록 탭.
 *
 * 마인드맵과 같은 이유로 정적 생성이다. 콘텐츠가 저장소 안의 마크다운뿐이라
 * 빌드 타임에 한 번만 렌더하면 된다.
 */
export const dynamic = 'force-static';

export default async function RetroPage() {
  const entries = await getRetroEntries();

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      {/* 탭 이름이 곧 이 화면의 제목이라 헤더에는 탭만 둔다. */}
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-surface/80 px-4 py-2.5 backdrop-blur">
        <TabNav />
        <ThemeToggle />
      </header>

      <RetroTimeline entries={entries} />
    </div>
  );
}
