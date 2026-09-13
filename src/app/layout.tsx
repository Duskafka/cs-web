import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CS 지식 뇌 지도',
  description:
    '로컬 마크다운 노트의 위키링크를 파싱해 CS 도메인별 뇌엽 위치에 배치한 3D 지식 그래프.',
};

export const viewport: Viewport = {
  themeColor: '#020617',
  // 모바일에서 캔버스를 드래그할 때 페이지가 확대되지 않도록 한다.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 다크 모드가 기본이자 유일한 테마다 (CLAUDE.md 디자인 규칙).
  return (
    <html lang="ko" className="dark">
      <body className="bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
