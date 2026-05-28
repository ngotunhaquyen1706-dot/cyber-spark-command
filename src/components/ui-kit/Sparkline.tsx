import { useEffect, useState } from "react";

interface SparklineProps {
  color?: string;
  height?: number;
  points?: number;
}

export function Sparkline({ color = "var(--neon)", height = 60, points = 32 }: SparklineProps) {
  const [data, setData] = useState<number[]>(() =>
    Array.from({ length: points }, () => 30 + Math.random() * 70),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setData((d) => [...d.slice(1), 20 + Math.random() * 80]);
    }, 800);
    return () => clearInterval(id);
  }, []);

  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / (max - min || 1)) * 100;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="sl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L100,100 L0,100 Z`} fill="url(#sl-fill)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
