'use client';

import { useReportWebVitals } from 'next/web-vitals';

// Định nghĩa kiểu dữ liệu chuẩn cho metric tránh lỗi TypeScript
type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

export function WebVitals() {
  useReportWebVitals((metric: Metric) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });

  return null;
}