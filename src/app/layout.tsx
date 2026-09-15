import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CS 지식 뇌 지도',
  description:
    '로컬 마크다운 노트의 위키링크를 파싱해 CS 도메인별 뇌엽 위치에 배치한 3D 지식 그래프.',
};

export const viewport: Viewport = {
  themeColor: '#f4f8f4',
  // 모바일에서 캔버스를 드래그할 때 페이지가 확대되지 않도록 한다.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * 저장된 테마를 첫 페인트 전에 적용한다.
 *
 * 기본값이 데이모드이므로 서버가 보내는 HTML 에는 dark 클래스가 없다. React 가
 * 하이드레이션한 뒤에 클래스를 붙이면 다크 사용자는 새로고침할 때마다 흰 화면이
 * 한 번 번쩍인다. 그래서 스타일이 적용되기 전에 동기적으로 실행한다.
 * 저장 키는 settingsStore 의 STORAGE_KEY 와 같아야 한다.
 */
const THEME_SCRIPT = `try{if(JSON.parse(localStorage.getItem('cs-brain-map:settings')||'{}').theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 위 스크립트가 <html> 의 클래스를 건드리므로 하이드레이션 경고를 억제한다.
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-fg antialiased">{children}</body>
    </html>
  );
}
