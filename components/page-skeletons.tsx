import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function CyanSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <Skeleton
      className={cn('bg-cyan-950/55 shadow-[inset_0_0_0_1px_rgba(8,145,178,0.18)]', className)}
      {...props}
    />
  );
}

function AmberSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <Skeleton
      className={cn('bg-amber-950/40 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.18)]', className)}
      {...props}
    />
  );
}

function EmeraldSkeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <Skeleton
      className={cn('bg-emerald-950/40 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]', className)}
      {...props}
    />
  );
}

function SkeletonPills({ count = 3, tone = 'cyan' }: { count?: number; tone?: 'cyan' | 'amber' | 'emerald' }) {
  const Component = tone === 'amber' ? AmberSkeleton : tone === 'emerald' ? EmeraldSkeleton : CyanSkeleton;

  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} className="h-7 w-28 rounded-full" />
      ))}
    </div>
  );
}

function TableLines({ columns, rows }: { columns: string[]; rows: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[960px]">
        <div className="grid gap-3 border-b border-cyan-950/80 px-4 py-3" style={{ gridTemplateColumns: columns.join(' ') }}>
          {columns.map((_, index) => (
            <CyanSkeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="divide-y divide-cyan-950/70">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-3 px-4 py-4"
              style={{ gridTemplateColumns: columns.join(' ') }}
            >
              {columns.map((_, columnIndex) => (
                <CyanSkeleton
                  key={`${rowIndex}-${columnIndex}`}
                  className={columnIndex === 0 ? 'h-5 w-4/5' : 'h-5 w-full'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketTickerSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-1">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="min-w-[148px] rounded-md border border-cyan-900 bg-black/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <CyanSkeleton className="h-4 w-12" />
            <CyanSkeleton className="h-4 w-16" />
          </div>
          <CyanSkeleton className="mt-3 h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EvidenceHealthStripSkeleton() {
  return (
    <div className="grid gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_1.2fr]">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-cyan-900 bg-black/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <CyanSkeleton className="h-4 w-28" />
            <CyanSkeleton className="h-6 w-20 rounded-full" />
          </div>
          <CyanSkeleton className="mt-3 h-4 w-32" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((__, statIndex) => (
              <div key={statIndex}>
                <CyanSkeleton className="h-3 w-10" />
                <CyanSkeleton className="mt-2 h-7 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-2xl border border-cyan-900 bg-cyan-950/10 p-4">
        <CyanSkeleton className="h-4 w-32" />
        <CyanSkeleton className="mt-4 h-6 w-36 rounded-full" />
        <CyanSkeleton className="mt-4 h-4 w-full" />
        <CyanSkeleton className="mt-2 h-4 w-5/6" />
        <CyanSkeleton className="mt-2 h-4 w-2/3" />
      </div>
    </div>
  );
}

export function QDayCountdownSkeleton() {
  return (
    <div>
      <CyanSkeleton className="h-4 w-44" />
      <div className="mt-5">
        <SkeletonPills count={2} />
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-6">
        <CyanSkeleton className="h-20 w-36" />
        <CyanSkeleton className="h-20 w-32" />
      </div>
      <CyanSkeleton className="mt-6 h-4 w-full" />
      <CyanSkeleton className="mt-3 h-4 w-11/12" />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <CyanSkeleton className="h-4 w-28" />
              <CyanSkeleton className="h-6 w-16 rounded-full" />
            </div>
            <CyanSkeleton className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-cyan-950 pt-8">
        <div className="flex gap-3">
          <CyanSkeleton className="h-6 w-20 rounded-full" />
          <AmberSkeleton className="h-6 w-20 rounded-full" />
        </div>
        <CyanSkeleton className="mt-8 h-4 w-3/4" />
        <CyanSkeleton className="mt-3 h-4 w-5/6" />
        <CyanSkeleton className="mt-3 h-4 w-full" />
        <CyanSkeleton className="mt-3 h-4 w-11/12" />
      </div>
    </div>
  );
}

export function RsaDeltaSkeleton() {
  return (
    <div>
      <CyanSkeleton className="h-7 w-40" />
      <div className="mt-5">
        <SkeletonPills count={2} />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index}>
            <CyanSkeleton className="h-4 w-36" />
            <CyanSkeleton className="mt-3 h-14 w-32" />
          </div>
        ))}
      </div>
      <CyanSkeleton className="mt-8 h-4 w-3/4" />
      <CyanSkeleton className="mt-3 h-4 w-5/6" />
      <div className="mt-4 h-3 overflow-hidden rounded-full border border-cyan-700 bg-black/70">
        <CyanSkeleton className="h-full w-2/5 rounded-none" />
      </div>
    </div>
  );
}

export function ThreatMatrixSkeleton() {
  return (
    <div>
      <div className="mb-5">
        <SkeletonPills count={3} />
      </div>
      <div className="flex justify-center">
        <CyanSkeleton className="h-[22rem] w-full max-w-[26rem] rounded-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <CyanSkeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <CyanSkeleton className="h-6 w-16 rounded-full" />
                <CyanSkeleton className="h-6 w-10" />
              </div>
            </div>
            <CyanSkeleton className="mt-3 h-4 w-full" />
            <CyanSkeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-amber-800 bg-black/55 p-5">
        <AmberSkeleton className="h-5 w-3/4" />
        <AmberSkeleton className="mt-3 h-4 w-full" />
        <AmberSkeleton className="mt-2 h-4 w-5/6" />
      </div>
    </div>
  );
}

export function FrontierEvidenceSkeleton() {
  return (
    <div>
      <div className="mb-5">
        <SkeletonPills count={3} />
      </div>
      <TableLines columns={['1.3fr', '1fr', '0.65fr', '1fr', '0.8fr', '0.8fr', '1fr']} rows={5} />
      <CyanSkeleton className="mt-5 h-4 w-3/4" />
    </div>
  );
}

export function RejectedSignalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/10 p-5">
          <CyanSkeleton className="h-4 w-36" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <CyanSkeleton className="h-10 w-20" />
            <CyanSkeleton className="h-6 w-20 rounded-full" />
          </div>
          <CyanSkeleton className="mt-4 h-4 w-full" />
          <CyanSkeleton className="mt-2 h-4 w-5/6" />
        </div>

        <div className="rounded-2xl border border-cyan-900 bg-black/30">
          <div className="border-b border-cyan-950 px-5 py-4">
            <CyanSkeleton className="h-4 w-36" />
          </div>
          <div className="divide-y divide-cyan-950">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                <div>
                  <CyanSkeleton className="h-5 w-3/4" />
                  <CyanSkeleton className="mt-2 h-4 w-1/2" />
                </div>
                <div>
                  <CyanSkeleton className="h-4 w-full" />
                  <CyanSkeleton className="mt-2 h-4 w-4/5" />
                </div>
                <div className="flex gap-2">
                  <CyanSkeleton className="h-6 w-24 rounded-full" />
                  <CyanSkeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <AmberSkeleton className="h-4 w-32" />
          <AmberSkeleton className="h-6 w-24 rounded-full" />
        </div>
        <AmberSkeleton className="mt-3 h-4 w-full" />
        <AmberSkeleton className="mt-2 h-4 w-5/6" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <div key={groupIndex} className="rounded-2xl border border-amber-900/70 bg-amber-950/15 p-4">
              <div className="flex items-center justify-between gap-3 border-b border-amber-900/60 pb-3">
                <div>
                  <AmberSkeleton className="h-4 w-32" />
                  <AmberSkeleton className="mt-2 h-4 w-24" />
                </div>
                <AmberSkeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="mt-4 space-y-4">
                {Array.from({ length: 2 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_auto]">
                    <div>
                      <AmberSkeleton className="h-5 w-3/4" />
                      <AmberSkeleton className="mt-2 h-4 w-1/2" />
                    </div>
                    <AmberSkeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <AmberSkeleton className="h-6 w-20 rounded-full" />
                      <AmberSkeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HardwareLeaderboardSkeleton() {
  return <TableLines columns={['1.3fr', '0.55fr', '0.7fr', '0.8fr', '0.8fr', '1fr', '0.7fr', '1.1fr']} rows={6} />;
}

export function NewsFeedSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-800/70 bg-amber-950/15 p-4">
        <AmberSkeleton className="h-4 w-32" />
        <AmberSkeleton className="mt-2 h-4 w-full" />
        <AmberSkeleton className="mt-2 h-4 w-5/6" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-[1.75rem] border border-cyan-900/60 bg-black/40 p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                <CyanSkeleton className="mt-1 h-7 w-7 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <CyanSkeleton className="h-6 w-3/5" />
                    <AmberSkeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <CyanSkeleton className="mt-3 h-4 w-full" />
                  <CyanSkeleton className="mt-2 h-4 w-11/12" />
                  <div className="mt-6 flex gap-6">
                    <CyanSkeleton className="h-4 w-28" />
                    <CyanSkeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
            <AmberSkeleton className="h-11 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FundingCardSkeleton() {
  return (
    <Card className="border-emerald-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_38%),linear-gradient(180deg,_rgba(6,78,59,0.18),_rgba(0,0,0,0.35))]">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <EmeraldSkeleton className="h-7 w-40 rounded-full" />
          <EmeraldSkeleton className="h-7 w-40 rounded-full" />
        </div>
        <EmeraldSkeleton className="h-8 w-44" />
        <EmeraldSkeleton className="h-4 w-full" />
        <EmeraldSkeleton className="h-4 w-11/12" />
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <EmeraldSkeleton className="h-4 w-full" />
          <EmeraldSkeleton className="mt-2 h-4 w-full" />
          <EmeraldSkeleton className="mt-2 h-4 w-5/6" />
          <div className="mt-5 flex flex-wrap gap-3">
            <EmeraldSkeleton className="h-10 w-40 rounded-xl" />
            <EmeraldSkeleton className="h-10 w-48 rounded-xl" />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-emerald-900/70 bg-black/35 p-4">
                <EmeraldSkeleton className="h-4 w-16" />
                <EmeraldSkeleton className="mt-3 h-4 w-full" />
                <EmeraldSkeleton className="mt-2 h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-900/80 bg-black/45 p-5">
          <EmeraldSkeleton className="h-4 w-28" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <EmeraldSkeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SignupCardSkeleton() {
  return (
    <Card className="border-cyan-900 bg-black/40">
      <CardHeader>
        <CyanSkeleton className="h-7 w-32" />
        <CyanSkeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 md:flex-row">
          <CyanSkeleton className="h-10 flex-1 rounded-xl" />
          <CyanSkeleton className="h-10 w-32 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TerminalPageSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.28),_transparent_45%),linear-gradient(180deg,_#020617,_#000000_38%,_#020617)] text-white">
      <header className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CyanSkeleton className="h-6 w-6 rounded-full" />
              <div>
                <CyanSkeleton className="h-6 w-36" />
                <CyanSkeleton className="mt-2 h-4 w-44" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CyanSkeleton className="h-10 w-24 rounded-xl" />
              <CyanSkeleton className="h-10 w-24 rounded-xl" />
              <CyanSkeleton className="h-7 w-28 rounded-full" />
            </div>
          </div>

          <div className="mt-4 border-y border-cyan-950 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <CyanSkeleton className="h-4 w-52" />
              <CyanSkeleton className="h-6 w-16 rounded-full" />
            </div>
            <MarketTickerSkeleton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <CyanSkeleton className="h-7 w-40 rounded-full" />
            <CyanSkeleton className="h-4 w-72" />
          </div>
          <div className="mt-4">
            <EvidenceHealthStripSkeleton />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
          <Card className="border-cyan-900 bg-black/40">
            <CardContent className="p-8">
              <QDayCountdownSkeleton />
            </CardContent>
          </Card>

          <Card className="border-cyan-500/70 bg-cyan-950/35">
            <CardContent className="p-8">
              <RsaDeltaSkeleton />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <Card className="border-cyan-900 bg-black/40">
            <CardHeader>
              <CyanSkeleton className="h-7 w-48" />
              <CyanSkeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <ThreatMatrixSkeleton />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6">
          <Card className="border-cyan-900 bg-black/40">
            <CardHeader>
              <CyanSkeleton className="h-7 w-48" />
              <CyanSkeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <FrontierEvidenceSkeleton />
            </CardContent>
          </Card>

          <Card className="border-amber-800/70 bg-black/40">
            <CardHeader>
              <AmberSkeleton className="h-7 w-60" />
              <AmberSkeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <RejectedSignalsSkeleton />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <AmberSkeleton className="h-7 w-28 rounded-full" />
            <CyanSkeleton className="h-4 w-80" />
          </div>

          <Card className="border-cyan-900 bg-black/40">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CyanSkeleton className="h-7 w-60" />
                <AmberSkeleton className="h-7 w-36 rounded-full" />
              </div>
              <CyanSkeleton className="h-4 w-[36rem]" />
            </CardHeader>
            <CardContent>
              <HardwareLeaderboardSkeleton />
            </CardContent>
          </Card>

          <Card className="border-cyan-900 bg-black/40">
            <CardHeader>
              <CyanSkeleton className="h-7 w-48" />
              <CyanSkeleton className="h-4 w-[32rem]" />
            </CardHeader>
            <CardContent>
              <NewsFeedSkeleton />
            </CardContent>
          </Card>

          <FundingCardSkeleton />
          <SignupCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ContactPageSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(180deg,_#020617,_#000000_42%,_#020617)] text-white">
      <header className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <CyanSkeleton className="h-6 w-6 rounded-full" />
            <div>
              <CyanSkeleton className="h-6 w-36" />
              <CyanSkeleton className="mt-2 h-4 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CyanSkeleton className="h-10 w-28 rounded-xl" />
            <CyanSkeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
            <CardHeader className="border-b border-cyan-950/80">
              <SkeletonPills count={3} />
              <CyanSkeleton className="h-12 w-full max-w-4xl" />
              <CyanSkeleton className="h-4 w-full" />
              <CyanSkeleton className="h-4 w-11/12" />
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <CyanSkeleton className="h-4 w-full" />
              <CyanSkeleton className="h-4 w-full" />
              <CyanSkeleton className="h-4 w-4/5" />
              <div className="flex flex-wrap gap-3">
                <CyanSkeleton className="h-10 w-28 rounded-xl" />
                <CyanSkeleton className="h-10 w-32 rounded-xl" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                    <CyanSkeleton className="h-4 w-16" />
                    <CyanSkeleton className="mt-3 h-4 w-full" />
                    <CyanSkeleton className="mt-2 h-4 w-4/5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-950/15">
            <CardHeader className="border-b border-emerald-950/80">
              <EmeraldSkeleton className="h-7 w-36" />
              <EmeraldSkeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <EmeraldSkeleton className="h-4 w-full" />
              <EmeraldSkeleton className="h-4 w-full" />
              <EmeraldSkeleton className="h-4 w-5/6" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <EmeraldSkeleton key={index} className="h-4 w-full" />
                ))}
              </div>
              <div className="rounded-xl border border-emerald-900/80 bg-black/35 p-4">
                <EmeraldSkeleton className="h-4 w-24" />
                <EmeraldSkeleton className="mt-3 h-4 w-full" />
                <EmeraldSkeleton className="mt-2 h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-cyan-950 bg-black/50">
              <CardHeader>
                <CyanSkeleton className="h-7 w-40" />
              </CardHeader>
              <CardContent>
                <CyanSkeleton className="h-4 w-full" />
                <CyanSkeleton className="mt-2 h-4 w-full" />
                <CyanSkeleton className="mt-2 h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-cyan-950 bg-black/50">
            <CardHeader>
              <CyanSkeleton className="h-7 w-32" />
              <CyanSkeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                  <div className="flex items-center gap-3">
                    <CyanSkeleton className="h-5 w-5 rounded-full" />
                    <div>
                      <CyanSkeleton className="h-4 w-24" />
                      <CyanSkeleton className="mt-2 h-4 w-40" />
                    </div>
                  </div>
                  <CyanSkeleton className="mt-3 h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-800 bg-amber-950/10">
            <CardHeader>
              <AmberSkeleton className="h-7 w-40" />
              <AmberSkeleton className="h-4 w-4/5" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-amber-900/80 bg-black/35 p-4">
                  <AmberSkeleton className="h-4 w-full" />
                  <AmberSkeleton className="mt-2 h-4 w-5/6" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

export function WhitepaperPageSkeleton() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(17,94,89,0.28),_transparent_40%),linear-gradient(180deg,_#020617,_#000000_32%,_#020617)] text-white">
      <header className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <CyanSkeleton className="h-6 w-6 rounded-full" />
            <div>
              <CyanSkeleton className="h-6 w-40" />
              <CyanSkeleton className="mt-2 h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CyanSkeleton className="h-10 w-28 rounded-xl" />
            <CyanSkeleton className="h-10 w-24 rounded-xl" />
            <EmeraldSkeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <Card className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
              <CardHeader className="border-b border-cyan-950/80">
                <SkeletonPills count={3} />
                <CyanSkeleton className="h-12 w-full max-w-5xl" />
                <CyanSkeleton className="h-4 w-full" />
                <CyanSkeleton className="h-4 w-11/12" />
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                      <CyanSkeleton className="h-4 w-28" />
                      <CyanSkeleton className="mt-3 h-4 w-full" />
                      <CyanSkeleton className="mt-2 h-4 w-5/6" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
                <CardHeader className="border-b border-cyan-950/80">
                  <CyanSkeleton className="h-4 w-24" />
                  <CyanSkeleton className="h-8 w-52" />
                  <CyanSkeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <CyanSkeleton className="h-4 w-full" />
                  <CyanSkeleton className="h-4 w-full" />
                  <CyanSkeleton className="h-4 w-11/12" />
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((__, panelIndex) => (
                      <div key={panelIndex} className="rounded-xl border border-cyan-950 bg-black/50 p-5">
                        <CyanSkeleton className="h-4 w-36" />
                        <CyanSkeleton className="mt-4 h-4 w-full" />
                        <CyanSkeleton className="mt-2 h-4 w-5/6" />
                        <CyanSkeleton className="mt-2 h-4 w-4/5" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-cyan-950 bg-black/60">
              <CardHeader>
                <CyanSkeleton className="h-7 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <CyanSkeleton key={index} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>

            <Card className="border-cyan-950 bg-black/60">
              <CardHeader>
                <CyanSkeleton className="h-7 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <CyanSkeleton className="h-4 w-full" />
                <CyanSkeleton className="h-4 w-5/6" />
                <CyanSkeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
