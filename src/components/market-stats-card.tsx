import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface MarketStatsCardProps {
  marketData: Record<string, any>
  zipCode: string
}

function fmt(key: string, value: any): string | null {
  if (value == null) return null
  const k = key.toLowerCase()
  if (k.includes("price") || k.includes("value")) return formatCurrency(Number(value))
  if (k.includes("ratio") || k.includes("rate")) return `${(Number(value) * 100).toFixed(1)}%`
  if (k.includes("days")) return `${Math.round(Number(value))} days`
  if (k.includes("supply")) return `${Number(value).toFixed(1)} mo`
  if (typeof value === "number") return Number(value).toLocaleString()
  return String(value)
}

function label(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

const PRIORITY_FIELDS = [
  "medianPrice",
  "averagePrice",
  "medianDaysOnMarket",
  "averageDaysOnMarket",
  "saleToListRatio",
  "averageSaleToListRatio",
  "monthsOfSupply",
  "totalListings",
  "newListings",
]

export function MarketStatsCard({ marketData, zipCode }: MarketStatsCardProps) {
  // Flatten one level if data is nested (some Rentcast responses wrap in a key)
  const data: Record<string, any> = marketData?.sale ?? marketData?.data ?? marketData ?? {}

  // Show priority fields first, then anything else that's a scalar
  const entries: [string, string][] = []
  for (const key of PRIORITY_FIELDS) {
    const val = fmt(key, data[key])
    if (val) entries.push([label(key), val])
  }
  for (const [key, value] of Object.entries(data)) {
    if (PRIORITY_FIELDS.includes(key)) continue
    if (typeof value === "object") continue
    if (key === "zipCode" || key === "dataType") continue
    const val = fmt(key, value)
    if (val) entries.push([label(key), val])
  }

  if (!entries.length) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#C9A96E]" />
          {zipCode} Market
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {entries.slice(0, 8).map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-slate-500">{k}</span>
            <span className="font-medium text-[#0F1B2D] dark:text-white">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
