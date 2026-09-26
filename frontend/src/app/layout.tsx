import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '在线考试系统',
  description: '功能完善的在线考试系统，支持题库管理、智能组卷、在线答题和自动阅卷',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
