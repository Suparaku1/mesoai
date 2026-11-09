import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Sparkles, ShieldCheck, FileText, BarChart3, GraduationCap,
  Cpu, Wrench, Mail, MapPin, Phone, ChevronDown, Users, Bot,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useI18n } from "@/i18n";

const SITE = "Uendi Platform";
const SCHOOL = "Shkolla Teknike Elektrike “Gjergj Canco”";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shkolla Teknike Elektrike “Gjergj Canco” — Uendi Platform" },
      {
        name: "description",
        content:
          "Platforma zyrtare e mësimit për Shkollën Teknike Elektrike “Gjergj Canco”: kurse Elektroteknike dhe TIK, mësim me AI mbi librin PDF, teste me notim 4–10, ndjekje nga prindi dhe certifikatë.",
      },
      { property: "og:title", content: "Shkolla Teknike Elektrike “Gjergj Canco” — Uendi Platform" },
      {
        property: "og:description",
        content: "Mësim digjital me AI për Elektroteknikë dhe TIK. Kurse, teste, progres, certifikata.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Shkolla Teknike Elektrike “Gjergj Canco” — Uendi Platform" },
      {
        name: "twitter:description",
        content: "Mësim digjital me AI për Elektroteknikë dhe TIK.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: SCHOOL,
          alternateName: SITE,
          description:
            "Shkollë teknike elektrike me drejtimet Elektroteknikë dhe Teknologji Informacioni e Komunikimi.",
          address: { "@type": "PostalAddress", addressLocality: "Tiranë", addressCountry: "AL" },
          areaServed: "Tiranë, Shqipëri",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const stats = useStats(t);
  const tracks = useTracks(t);
  const steps = useSteps(t);
  const features = useFeatures(t);
  const roles = useRoles(t);
  const faqs = useFaqs(t);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {t("land.skip")}
      </a>

      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 font-semibold min-w-0">
            <img src={logo} alt={`Stema e ${SCHOOL}`} className="size-9 sm:size-10 rounded-full object-cover shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="text-[13px] sm:text-base truncate">{SCHOOL}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground font-normal">{SITE}</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0" aria-label="Kryesore">
            <a href="#drejtimet" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground px-2">{t("land.nav.tracks")}</a>
            <a href="#si-funksionon" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground px-2">{t("land.nav.how")}</a>
            <a href="#pyetje" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground px-2">{t("land.nav.faq")}</a>
            <Link to="/auth" search={{ tab: "login" } as never}><Button variant="ghost" size="sm">{t("land.nav.login")}</Button></Link>
            <Link to="/auth" search={{ tab: "register" } as never}><Button size="sm">{t("land.nav.register")}</Button></Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1 text-xs font-medium text-accent-foreground mb-6">
              <Sparkles className="size-3.5" /> {t("land.badge")}
            </div>
            <h1 className="text-[2rem] leading-[1.1] sm:text-6xl font-bold tracking-tight text-balance">
              Shkolla Teknike Elektrike{" "}
              <span className="bg-clip-text text-transparent gradient-hero">“Gjergj Canco”</span>
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              {t("land.hero.sub")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:justify-center gap-3">
              <Link to="/auth" search={{ tab: "register" } as never} className="sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">{t("land.cta.start")}</Button>
              </Link>
              <Link to="/auth" search={{ tab: "login" } as never} className="sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">{t("land.cta.haveAccount")}</Button>
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {stats.map((s) => (
                <div key={s.label} className="card-soft p-4">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* DREJTIMET */}
        <section id="drejtimet" className="mx-auto max-w-6xl px-4 sm:px-6 py-14 scroll-mt-20">
          <SectionHead
            eyebrow={t("land.nav.tracks")}
            title={t("land.tracks.title")}
            desc={t("land.tracks.desc")}
          />
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <article key={track.title} className="card-soft p-6">
                <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <track.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{track.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{track.desc}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {track.items.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-muted-foreground">{i}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* SI FUNKSIONON */}
        <section id="si-funksionon" className="border-y border-border/60 bg-muted/30 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
            <SectionHead eyebrow={t("land.how.eyebrow")} title={t("land.how.title")} desc={t("land.how.desc")} />
            <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((s, i) => (
                <li key={s.title} className="card-soft p-5 bg-background">
                  <div className="text-xs font-semibold text-primary">{t("land.step")} {i + 1}</div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* VEÇORITË */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
          <SectionHead eyebrow={t("land.feat.eyebrow")} title={t("land.feat.title")} desc={t("land.feat.desc")} />
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <article key={f.title} className="card-soft p-6">
                <div className="size-10 rounded-md bg-accent text-accent-foreground flex items-center justify-center mb-4">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ROLET */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
            <SectionHead eyebrow={t("land.roles.eyebrow")} title={t("land.roles.title")} />
            <div className="mt-8 grid sm:grid-cols-3 gap-4">
              {roles.map((r) => (
                <article key={r.title} className="card-soft p-6 bg-background">
                  <h3 className="font-semibold">{r.title}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {r.items.map((i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="pyetje" className="mx-auto max-w-3xl px-4 sm:px-6 py-14 scroll-mt-20">
          <SectionHead eyebrow="FAQ" title={t("land.faq.title")} />
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card-soft group p-0 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-medium list-none">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
          <div className="rounded-xl border border-border bg-primary/5 p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("land.cta.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {t("land.cta.desc")}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-center gap-3">
              <Link to="/auth" search={{ tab: "register" } as never}>
                <Button size="lg" className="w-full sm:w-auto">{t("land.cta.create")}</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <div className="flex items-center gap-2.5 font-semibold">
              <img src={logo} alt="" className="size-8 rounded-full object-cover" />
              <span>{SCHOOL}</span>
            </div>
            <p className="mt-3 text-muted-foreground">{SITE} — {t("land.footer.tagline")}</p>
          </div>
          <div>
            <h3 className="font-medium">{t("land.footer.links")}</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li><a href="#drejtimet" className="hover:text-foreground">{t("land.nav.tracks")}</a></li>
              <li><a href="#si-funksionon" className="hover:text-foreground">{t("land.nav.how")}</a></li>
              <li><a href="#pyetje" className="hover:text-foreground">{t("land.faq.title")}</a></li>
              <li><Link to="/auth" search={{ tab: "login" } as never} className="hover:text-foreground">{t("land.footer.enter")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium">{t("land.footer.contact")}</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /> {t("land.footer.location")}</li>
              <li className="flex items-center gap-2"><Mail className="size-4 shrink-0" /> elektroniksuparaku@gmail.com</li>
              <li className="flex items-center gap-2"><Phone className="size-4 shrink-0" /> {t("land.footer.office")}</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 pt-6 border-t border-border/60 text-xs text-muted-foreground text-center space-y-1">
          <div>© {new Date().getFullYear()} {SCHOOL} · {SITE}</div>
          <div>{t("land.footer.credit")} <span className="font-medium text-foreground">Esmerald Suparaku</span></div>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-balance">{title}</h2>
      {desc && <p className="mt-3 text-muted-foreground text-pretty">{desc}</p>}
    </div>
  );
}

function useStats(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    { label: t("land.stat.tracks"), value: "2" },
    { label: t("land.stat.grades"), value: "10–13" },
    { label: t("land.stat.marking"), value: "4–10" },
    { label: t("land.stat.certificate"), value: "7+" },
  ];
}

function useTracks(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    {
      icon: Wrench,
      title: t("land.track.el.title"),
      desc: t("land.track.el.desc"),
      items: [t("land.track.el.i1"), t("land.track.el.i2"), t("land.track.el.i3"), t("land.track.el.i4")],
    },
    {
      icon: Cpu,
      title: t("land.track.ict.title"),
      desc: t("land.track.ict.desc"),
      items: [t("land.track.ict.i1"), t("land.track.ict.i2"), t("land.track.ict.i3"), t("land.track.ict.i4")],
    },
  ];
}

function useSteps(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    { title: t("land.step1.title"), desc: t("land.step1.desc") },
    { title: t("land.step2.title"), desc: t("land.step2.desc") },
    { title: t("land.step3.title"), desc: t("land.step3.desc") },
    { title: t("land.step4.title"), desc: t("land.step4.desc") },
  ];
}

function useFeatures(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    { icon: FileText, title: t("land.feat.pdf.title"), desc: t("land.feat.pdf.desc") },
    { icon: Sparkles, title: t("land.feat.ai.title"), desc: t("land.feat.ai.desc") },
    { icon: BookOpen, title: t("land.feat.seq.title"), desc: t("land.feat.seq.desc") },
    { icon: ShieldCheck, title: t("land.feat.approve.title"), desc: t("land.feat.approve.desc") },
    { icon: BarChart3, title: t("land.feat.grades.title"), desc: t("land.feat.grades.desc") },
    { icon: GraduationCap, title: t("land.feat.cert.title"), desc: t("land.feat.cert.desc") },
    { icon: Bot, title: t("land.feat.tutor.title"), desc: t("land.feat.tutor.desc") },
    { icon: Users, title: t("land.feat.parent.title"), desc: t("land.feat.parent.desc") },
    { icon: Mail, title: t("land.feat.email.title"), desc: t("land.feat.email.desc") },
  ];
}

function useRoles(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    {
      title: t("role.teacher"),
      items: [t("land.role.teacher.i1"), t("land.role.teacher.i2"), t("land.role.teacher.i3"), t("land.role.teacher.i4")],
    },
    {
      title: t("role.student"),
      items: [t("land.role.student.i1"), t("land.role.student.i2"), t("land.role.student.i3"), t("land.role.student.i4")],
    },
    {
      title: t("role.parent"),
      items: [t("land.role.parent.i1"), t("land.role.parent.i2"), t("land.role.parent.i3"), t("land.role.parent.i4")],
    },
  ];
}

function useFaqs(t: (key: import("@/i18n").TranslationKey) => string) {
  return [
    { q: t("land.faq.q1"), a: t("land.faq.a1") },
    { q: t("land.faq.q2"), a: t("land.faq.a2") },
    { q: t("land.faq.q3"), a: t("land.faq.a3") },
    { q: t("land.faq.q4"), a: t("land.faq.a4") },
    { q: t("land.faq.q5"), a: t("land.faq.a5") },
  ];
}
