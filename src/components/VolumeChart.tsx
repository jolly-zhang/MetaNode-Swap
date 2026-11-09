"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";

type VolumePoint = {
  bucket: string;
  volume: number | string;
  fee: number | string;
};

type VolumeResponse = {
  range: string;
  caption: string;
  points: VolumePoint[];
};

const RANGES = [
  { id: "1h", label: "1小时" },
  { id: "1d", label: "1天" },
  { id: "1w", label: "1周" },
  { id: "1m", label: "1个月" },
  { id: "1y", label: "1年" },
  { id: "all", label: "全部" },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const twoDecimals = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatVolume(value: number, digits: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) return `${sign}US$${(abs / 100_000_000).toFixed(digits)}亿`;
  if (abs >= 10_000) return `${sign}US$${(abs / 10_000).toFixed(digits)}万`;
  return `${sign}US$${twoDecimals.format(abs)}`;
}

function formatBucket(bucket: string, range: RangeId) {
  const date = new Date(bucket);
  if (range === "1h" || range === "1d") {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (range === "1y") return `${date.getFullYear()}/${date.getMonth() + 1}`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatHoverTime(bucket: string, range: RangeId) {
  const date = new Date(bucket);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (range === "1y") return `${year}年${month}月`;
  if (range === "1w" || range === "1m" || range === "all") return `${year}年${month}月${day}日`;
  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${year}年${month}月${day}日 ${time}`;
}

function labelInterval(count: number) {
  if (count <= 8) return 0;
  if (count <= 14) return 1;
  return Math.max(1, Math.ceil(count / 6) - 1);
}

export default function VolumeChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<RangeId>("1h");
  const [caption, setCaption] = useState("过去 1 小时");
  const [points, setPoints] = useState<VolumePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch('/api/logs/volume?range=${range');
        if (!res.ok) throw new Error("交易量加载失败");
        const data = (await res.json()) as VolumeResponse;
        if (!ignore) {
          setHoveredIndex(null);
          setCaption(data.caption);
          setPoints(data.points ?? []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "交易量加载失败");
          setPoints([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [range]);

  const total = useMemo(
    () => points.reduce((sum, point) => sum + Number(point.volume || 0), 0),
    [points]
  );

  useEffect(() => {
    const el = chartRef.current;
    if (!el || points.length === 0) return;

    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    const labels = points.map((point) => formatBucket(point.bucket, range));
    const values = points.map((point) => Number(point.volume) || 0);
    const peak = Math.max(...values, 0);

    chart.setOption(
      {
        grid: { left: 8, right: 72, top: 16, bottom: 28, containLabel: false },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow",
            shadowStyle: { color: "rgba(0, 0, 0, 0.04)" },
          },
          backgroundColor: "#fff",
          borderColor: "#e5e7eb",
          borderWidth: 1,
          padding: [8, 14],
          extraCssText: "border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);",
          textStyle: { color: "#222", fontSize: 14 },
          formatter: (items: unknown) => {
            const item = Array.isArray(items) ? items[0] : null;
            const index = item && typeof item === "object" && "dataIndex" in item
              ? Number((item as { dataIndex?: number }).dataIndex)
              : 0;
            const fee = Number(points[index]?.fee) || 0;
            return `费用： ${formatVolume(fee, 2)}`;
          },
        },
        xAxis: {
          type: "category",
          data: labels,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "#ececec" } },
          axisLabel: {
            color: "#9ca3af",
            interval: labelInterval(labels.length),
            hideOverlap: true,
          },
        },
        yAxis: {
          type: "value",
          position: "right",
          splitNumber: 8,
          axisLabel: {
            color: "#9ca3af",
            formatter: (value: number) => formatVolume(value, 2),
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { type: "dotted", color: "#ededed" } },
          max: peak === 0 ? 1 : undefined,
        },
        series: [
          {
            type: "bar",
            data: values,
            barCategoryGap: "32%",
            itemStyle: { color: "#FF37C7", borderRadius: 0 },
          },
        ],
      },
      true
    );

    let lastIndex = -1;
    const updateHover = (index: number | null) => {
      const next = index == null ? -1 : index;
      if (next === lastIndex) return;
      lastIndex = next;
      setHoveredIndex(index);
    };
    const onMove = (event: { offsetX: number; offsetY: number }) => {
      const point = [event.offsetX, event.offsetY];
      if (!chart.containPixel({ gridIndex: 0 }, point)) {
        updateHover(null);
        return;
      }
      const converted = chart.convertFromPixel({ seriesIndex: 0 }, point);
      const index = Array.isArray(converted) ? Number(converted[0]) : Number(converted);
      if (!Number.isInteger(index) || index < 0 || index >= points.length) {
        updateHover(null);
        return;
      }
      updateHover(index);
    };
    const onLeave = () => updateHover(null);
    chart.getZr().on("mousemove", onMove);
    chart.getZr().on("globalout", onLeave);

    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      chart.getZr().off("mousemove", onMove);
      chart.getZr().off("globalout", onLeave);
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [points, range]);

  const hovered = hoveredIndex == null ? null : points[hoveredIndex];
  const headline = hovered ? Number(hovered.volume) || 0 : total;
  const subline = hovered ? formatHoverTime(hovered.bucket, range) : caption;

  return (
    <section className="mb-8 px-2">
      <p className="text-3xl font-semibold tracking-tight">{formatVolume(headline, 1)}</p>
      <p className="mt-1 text-sm text-gray-500">{subline}</p>
      {error ? <p className="mt-4 text-sm">{error}</p> : null}
      <div
        ref={chartRef}
        className="mt-2 h-[320px] w-full"
        style={{ visibility: points.length === 0 ? "hidden" : "visible" }}
      />
      {loading && points.length === 0 ? <p className="text-sm text-gray-500">加载中…</p> : null}
      {!loading && !error && points.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">这个时间段还没有成交</p>
      ) : null}
      <div className="mt-2 flex justify-end">
        <div className="inline-flex items-center rounded-full border border-gray-200 p-1 text-sm">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={
                item.id === range
                  ? "rounded-full bg-white px-3 py-1 font-medium text-black shadow-sm"
                  : "px-3 py-1 text-gray-500"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
