import { lazy, Suspense, type ComponentProps } from "react";
import type { SimpleLineChart as LineType, SimpleBarChart as BarType, SimplePieChart as PieType } from "./basic-charts";

export type { SeriesPoint, PieSlice } from "./basic-charts";

// Recharts është bibliotekë e rëndë: ngarkohet vetëm kur grafiku shfaqet realisht.
const LazyLine = lazy(async () => ({ default: (await import("./basic-charts")).SimpleLineChart }));
const LazyBar = lazy(async () => ({ default: (await import("./basic-charts")).SimpleBarChart }));
const LazyPie = lazy(async () => ({ default: (await import("./basic-charts")).SimplePieChart }));

function ChartFallback({ height = 240 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-muted/50"
      style={{ height }}
      role="status"
      aria-label="Duke ngarkuar grafikun"
    />
  );
}

export function LineChartBlock(props: ComponentProps<typeof LineType>) {
  return (
    <Suspense fallback={<ChartFallback height={props.height ?? 240} />}>
      <LazyLine {...props} />
    </Suspense>
  );
}

export function BarChartBlock(props: ComponentProps<typeof BarType>) {
  return (
    <Suspense fallback={<ChartFallback height={props.height ?? 240} />}>
      <LazyBar {...props} />
    </Suspense>
  );
}

export function PieChartBlock(props: ComponentProps<typeof PieType>) {
  return (
    <Suspense fallback={<ChartFallback height={props.height ?? 240} />}>
      <LazyPie {...props} />
    </Suspense>
  );
}
