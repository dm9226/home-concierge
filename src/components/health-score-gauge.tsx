"use client"

import { cn, getHealthScoreLabel } from "@/lib/utils"

interface HealthScoreGaugeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  showTrend?: boolean
  trendDelta?: number
  className?: string
}

export function HealthScoreGauge({
  score,
  size = "md",
  showLabel = true,
  showTrend,
  trendDelta,
  className,
}: HealthScoreGaugeProps) {
  const sizes = {
    sm: { dim: 100, r: 35, strokeWidth: 6, fontSize: 22, subSize: 10 },
    md: { dim: 140, r: 52, strokeWidth: 8, fontSize: 32, subSize: 13 },
    lg: { dim: 180, r: 68, strokeWidth: 10, fontSize: 42, subSize: 16 },
  }

  const { dim, r, strokeWidth, fontSize, subSize } = sizes[size]
  const cx = dim / 2
  const cy = dim / 2
  const circumference = 2 * Math.PI * r
  const arcLength = circumference * (250 / 360)
  const fillLength = arcLength * (Math.min(Math.max(score, 0), 100) / 100)
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626"
  const textColor =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500"

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={dim}
        height={dim * 0.75}
        viewBox={`0 0 ${dim} ${dim * 0.75}`}
        aria-label={`Home Health Score: ${score} out of 100`}
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(145 ${cx} ${cx})`}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${fillLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(145 ${cx} ${cx})`}
          style={{ transition: "stroke-dasharray 1s ease-in-out" }}
        />
        <text
          x={cx}
          y={cx + 8}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill={color}
          fontFamily="var(--font-display), Georgia, serif"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cx + subSize + 12}
          textAnchor="middle"
          fontSize={subSize}
          fill="#94a3b8"
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          / 100
        </text>
      </svg>
      {showLabel && (
        <p className={cn("mt-1 font-medium text-sm", textColor)}>{getHealthScoreLabel(score)}</p>
      )}
      {showTrend && trendDelta !== undefined && (
        <p
          className={cn(
            "text-xs mt-0.5",
            trendDelta > 0
              ? "text-emerald-600"
              : trendDelta < 0
                ? "text-red-500"
                : "text-slate-400"
          )}
        >
          {trendDelta > 0 ? "+" : ""}
          {trendDelta} pts last 30 days
        </p>
      )}
    </div>
  )
}
