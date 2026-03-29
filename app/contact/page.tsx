import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  HandCoins,
  Mail,
  Radar,
  Rocket,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Contact | XQBTS Terminal',
  description:
    'Contact 3DDev SMC PVT about XQBTS Terminal access, partnerships, and funding conversations.',
  keywords: [
    'contact xqbts',
    'quantum threat intelligence partnership',
    'quantum security startup funding',
    'xqbts funding inquiry',
  ],
  alternates: {
    canonical: '/contact',
  },
}

const contactChannels = [
  {
    label: 'Owner company',
    value: '3DDev SMC PVT',
    note: 'XQBTS Terminal is owned and operated by 3DDev SMC PVT.',
    icon: Building2,
  },
  {
    label: 'Primary email',
    value: 'info.3ddev@gmail.com',
    note: 'Best path for strategic, partnership, and funding discussions.',
    icon: Mail,
  },
]

const fundingPriorities = [
  {
    title: 'Broaden the signal layer',
    description:
      'Expand benchmark coverage, increase ingestion depth, and harden methodology versioning around the frontier evidence base.',
    icon: Radar,
  },
  {
    title: 'Ship operator workflows',
    description:
      'Build reporting, alerting, enterprise views, and analyst-facing distribution flows on top of the live terminal.',
    icon: ShieldCheck,
  },
  {
    title: 'Accelerate execution',
    description:
      'Move faster on product iteration, design polish, source integrations, and commercial readiness without diluting the core model.',
    icon: Rocket,
  },
]

const backingPaths = [
  'Angel or seed capital for focused product development',
  'Strategic backing from cybersecurity, infra, or quantum-adjacent operators',
  'Commercial partnerships for premium intelligence access or pilot deployments',
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(180deg,_#020617,_#000000_42%,_#020617)] text-white">
      <header className="sticky top-0 z-40 border-b border-cyan-950 bg-black/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-cyan-300" />
            <div>
              <h1 className="font-mono text-xl font-bold text-cyan-300">Contact XQBTS</h1>
              <p className="font-mono text-xs tracking-[0.2em] text-gray-500">
                [PARTNERSHIPS / FUNDING / OWNER DETAILS]
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Terminal
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
            >
              <Link href="/whitepaper">Whitepaper</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-cyan-900 bg-black/45 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_24px_80px_rgba(6,182,212,0.08)]">
            <CardHeader className="border-b border-cyan-950/80">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-cyan-700 bg-cyan-700/10 text-cyan-300">
                  Contact
                </Badge>
                <Badge variant="outline" className="border-emerald-700 bg-emerald-700/10 text-emerald-300">
                  Funding Open
                </Badge>
                <Badge variant="outline" className="border-amber-700 bg-amber-700/10 text-amber-300">
                  Owner: 3DDev SMC PVT
                </Badge>
              </div>
              <CardTitle className="max-w-4xl text-4xl leading-tight text-white">
                Back XQBTS while it is still early, focused, and building a differentiated quantum-threat
                intelligence product.
              </CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7 text-gray-400">
                XQBTS Terminal already turns frontier benchmark curation, Q-Day estimation, and HNDL
                exposure modeling into a public product surface. Funding helps turn that operating core
                into a faster, broader, more commercially deployable intelligence platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <p className="max-w-3xl text-base leading-8 text-gray-300">
                If you want to support the build, sponsor roadmap execution, explore a strategic
                partnership, or discuss early-stage backing, reach out directly. The project is owned by{' '}
                <span className="font-semibold text-white">3DDev SMC PVT</span> and the primary contact is{' '}
                <span className="font-semibold text-cyan-200">info.3ddev@gmail.com</span>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-cyan-500 text-black hover:bg-cyan-400">
                  <a href="mailto:info.3ddev@gmail.com?subject=XQBTS%20Funding%20Inquiry">
                    <Mail className="h-4 w-4" />
                    Email Now
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-cyan-900 bg-black text-cyan-300 hover:bg-cyan-950/40 hover:text-cyan-200"
                >
                  <Link href="/">View live terminal</Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">OWNER</p>
                  <p className="mt-3 text-sm leading-6 text-gray-300">3DDev SMC PVT</p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">EMAIL</p>
                  <p className="mt-3 text-sm leading-6 text-gray-300">info.3ddev@gmail.com</p>
                </div>
                <div className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                  <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">LOOKING FOR</p>
                  <p className="mt-3 text-sm leading-6 text-gray-300">Funding, strategic backing, and pilot partners</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-800 bg-emerald-950/15">
            <CardHeader className="border-b border-emerald-950/80">
              <CardTitle className="flex items-center gap-2 text-emerald-300">
                <HandCoins className="h-5 w-5" />
                Fund XQBTS
              </CardTitle>
              <CardDescription className="text-emerald-100/75">
                The pitch is straightforward: back a live product before the category gets crowded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <p className="text-sm leading-7 text-gray-300">
                This is not a vague research deck. It is a working terminal with an implemented
                methodology, published outputs, live watchlist surfaces, and a clear path to enterprise
                intelligence workflows.
              </p>
              <ul className="space-y-3 text-sm leading-6 text-gray-300">
                <li>Support the build if you want early access to a differentiated quantum-risk product.</li>
                <li>Support the build if you see value in operationalizing frontier evidence, not just publishing commentary.</li>
                <li>Support the build if you want to help shape the next phase of premium monitoring, reporting, and commercial rollout.</li>
              </ul>
              <div className="rounded-xl border border-emerald-900/80 bg-black/35 p-4">
                <p className="font-mono text-[11px] tracking-[0.18em] text-emerald-300">PRIMARY CTA</p>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  Email <span className="font-semibold text-white">info.3ddev@gmail.com</span> to start a
                  funding or partnership conversation with 3DDev SMC PVT.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {fundingPriorities.map((priority) => {
            const Icon = priority.icon

            return (
              <Card key={priority.title} className="border-cyan-950 bg-black/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    {priority.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-gray-300">{priority.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-cyan-950 bg-black/50">
            <CardHeader>
              <CardTitle className="text-white">Direct Contact</CardTitle>
              <CardDescription className="text-gray-400">
                Reach the owner company directly for funding or partnership discussions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactChannels.map((channel) => {
                const Icon = channel.icon

                return (
                  <div key={channel.label} className="rounded-xl border border-cyan-950 bg-cyan-950/10 p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-cyan-300" />
                      <div>
                        <p className="font-mono text-[11px] tracking-[0.18em] text-cyan-300">{channel.label}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{channel.value}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-300">{channel.note}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="border-amber-800 bg-amber-950/10">
            <CardHeader>
              <CardTitle className="text-amber-300">Ideal Funding Paths</CardTitle>
              <CardDescription className="text-amber-100/75">
                A few clean ways to support the next phase of the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {backingPaths.map((path) => (
                <div key={path} className="rounded-xl border border-amber-900/80 bg-black/35 p-4">
                  <p className="text-sm leading-7 text-gray-300">{path}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
