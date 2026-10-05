import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "../../components/ui/AnimatedSection";
import {
  ArrowRight, ShieldCheck, Building2, Search,
  Lock, FileCheck, Play, Mail, CheckCircle2,
  AlertCircle, Clock, HelpCircle, ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInstitutions } from "../../api/verification";

export default function LandingPage() {
  return (
    <div className="bg-white">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <DemoSection />
      <WhatResultsLookLike />
      <WhoUsesThis />
      <SupportedInstitutions />
      <LandingFooter />
    </div>
  );
}

// ── NAV ────────────────────────────────────────────────────────────────────

function LandingNav() {
  const [scrolled,       setScrolled]       = useState(false);
  const [showVerifyBtn,  setShowVerifyBtn]  = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // Show "Verify a degree" button only after scrolling past the hero
      setShowVerifyBtn(window.scrollY > 560);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100"
        : "bg-transparent"
    }`}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 transition-colors ${
            scrolled ? "text-teal-600" : "text-teal-400"
          }`} />
          <span className={`font-bold text-sm tracking-tight transition-colors ${
            scrolled ? "text-slate-900" : "text-white"
          }`}>
            MerkliFy
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {["#how-it-works", "#demo", "#institutions"].map((href, i) => (
            <a key={href} href={href}
              className={`text-sm transition-colors ${
                scrolled
                  ? "text-slate-500 hover:text-slate-800"
                  : "text-slate-300 hover:text-white"
              }`}>
              {["How it works", "Demo", "Institutions"][i]}
            </a>
          ))}
        </div>

        {/* Verify CTA — only visible after scrolling past hero */}
        <div className={`transition-all duration-300 ${
          showVerifyBtn
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}>
          <Link to="/verify"
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500
                        text-white text-sm font-semibold px-4 py-2
                        rounded-lg transition-colors">
            Verify a degree
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── HERO ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-slate-900 text-white pt-14 min-h-[600px]
                         flex items-center">
      <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 w-full">
        <div className="max-w-2xl">
          <h1 className="text-6xl md:text-5xl font-bold leading-tight
                          tracking-tight mb-5 text-white">
            Verify academic degrees
            <br />
            <span className="text-teal-400">without calling anyone.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-4">
            Universities upload graduate records once.
            Employers verify any certificate instantly. Free,
            with no account required.
          </p>

          <p className="text-slate-500 text-base leading-relaxed mb-10">
            Each certificate receives a cryptographic seal the moment
            it is issued. Any change to any detail breaks that seal.
            What you receive is a mathematical proof, not a phone call.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/verify"
              className="inline-flex items-center justify-center gap-2
                          bg-teal-600 hover:bg-teal-500 text-white
                          font-semibold px-6 py-3 rounded-lg text-sm
                          transition-colors">
              Verify a degree now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center justify-center gap-2
                          border border-slate-700 hover:border-slate-500
                          text-slate-400 hover:text-slate-200 font-medium
                          px-6 py-3 rounded-lg text-sm transition-colors">
              See how it works
            </a>
          </div>
        </div>

        {/* Stats strip */}
        <AnimatedSection delay={200}
          className="mt-16 pt-8 border-t border-slate-800
                      grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "12,400+",   label: "Degrees Issued" },
            { value: "98%",       label: "Faster Than Manual Checks" },
            { value: "100%",      label: "Tamper Detection Rate" },
            { value: "Under 2s",  label: "Time Per Verification" },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-teal-400">{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="max-w-xl mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            How it works
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            Two sides to the process. Universities issue.
            Everyone else verifies. Both take minutes.
          </p>
        </AnimatedSection>

        <div className="mb-12">
          <p className="text-xs font-semibold text-teal-600 uppercase
                          tracking-widest mb-6">
            When a university uploads records
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01", icon: Building2,
                title: "Upload graduate data",
                body: "An authorised staff member uploads a spreadsheet of graduate records. The system checks every row before touching anything.",
              },
              {
                step: "02", icon: Lock,
                title: "Each degree gets a cryptographic seal",
                body: "Every certificate is fingerprinted using SHA-256, bundled into a Merkle Tree, and signed with the university's private key. Tamper with one field and the seal breaks.",
              },
              {
                step: "03", icon: FileCheck,
                title: "Records are committed permanently",
                body: "The signed batch is locked into the database. Degree data cannot be edited or deleted after this point.",
              },
            ].map(({ step, icon: Icon, title, body }, i) => (
              <AnimatedSection key={step} delay={i * 100}
                className="p-5 border border-slate-100 rounded-xl
                             hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono font-bold text-teal-500">
                    {step}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase
                          tracking-widest mb-6">
            When someone verifies a certificate
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                step: "04",
                title: "Enter the certificate details",
                body: "The verifier provides the serial number, the graduate's name, and the issuing institution. That is all. No account, no subscription.",
              },
              {
                step: "05",
                title: "Five independent checks run in under two seconds",
                body: "The system reconstructs the cryptographic fingerprint, validates the Merkle proof, verifies the institution's digital signature, and checks the current status. Every step must pass.",
              },
            ].map(({ step, title, body }, i) => (
              <AnimatedSection key={step} delay={i * 100}
                className="p-5 border border-slate-100 rounded-xl
                             hover:border-slate-200 transition-colors">
                <span className="text-xs font-mono font-bold text-slate-400 mb-3 block">
                  {step}
                </span>
                <h3 className="font-semibold text-slate-800 text-sm mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>

        <AnimatedSection delay={200}
          className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-sm text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-700">No blockchain.</span>{" "}
            MerkliFy uses SHA-256, Merkle Trees, and RSA — the same
            cryptographic building blocks behind HTTPS, banking infrastructure,
            and code signing. No distributed ledger needed.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── DEMO ──────────────────────────────────────────────────────────────────

function DemoSection() {
  return (
    /* Same background as the hero — slate-900 */
    <section id="demo" className="bg-slate-900 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="max-w-xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Watch a walkthrough
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            A short demonstration of how a university issues certificates
            and how an employer verifies one — start to finish.
          </p>
        </AnimatedSection>

        <div className="bg-slate-800 border border-slate-700 rounded-xl
                         aspect-video flex items-center justify-center
                         max-w-3xl">
          <div className="text-center">
            <div className="w-14 h-14 bg-teal-500/20 border border-teal-500/30
                             rounded-full flex items-center justify-center
                             mx-auto mb-3">
              <Play className="w-6 h-6 text-teal-400 ml-0.5" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              Demo coming soon
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Full walkthrough of issuance and verification
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── WHAT RESULTS LOOK LIKE ────────────────────────────────────────────────

function WhatResultsLookLike() {
  return (
    <section className="py-20 bg-slate-50 border-y border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            What you will see
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            Every verification returns one clear answer.
            No ambiguity, no follow-up calls needed.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AUTHENTIC — prominent */}
          <AnimatedSection delay={0} className="md:row-span-2 border-2
                                                 border-teal-200 bg-white
                                                 rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <p className="font-semibold text-teal-800 text-sm">
                Certificate Verified
              </p>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              All five cryptographic checks passed. The degree is genuine,
              was signed by the stated institution, and is currently active.
            </p>
            <div className="border-t border-teal-100 pt-4 space-y-3">
              {[
                { label: "Serial",    value: "ENG2025-001", mono: true },
                { label: "Program",   value: "BSc Electrical Engineering" },
                { label: "Issued by", value: "University of Accra" },
                { label: "Year",      value: "2025", mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide
                                  font-medium">
                    {label}
                  </p>
                  <p className={`text-sm font-medium text-slate-800 ${
                    mono ? "font-mono" : ""
                  }`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {[
            { icon: AlertCircle, color: "red",    title: "Certificate Revoked",
              body: "The institution has formally revoked this certificate. It is no longer valid." },
            { icon: Clock,       color: "amber",  title: "Certificate Suspended",
              body: "Temporarily suspended. Contact the issuing institution directly." },
            { icon: HelpCircle,  color: "slate",  title: "Details Not Matched",
              body: "No record matched what you entered. Check all fields and try again." },
            { icon: AlertCircle, color: "orange", title: "Verification Unavailable",
              body: "A system integrity issue was detected. Contact the issuing institution." },
          ].map(({ icon: Icon, color, title, body }, i) => {
            const styles = {
              red:    "border-red-200 bg-red-50/20",
              amber:  "border-amber-200 bg-amber-50/20",
              slate:  "border-slate-200 bg-white",
              orange: "border-orange-200 bg-orange-50/20",
            };
            const iconStyles = {
              red: "text-red-500", amber: "text-amber-500",
              slate: "text-slate-400", orange: "text-orange-500",
            };
            return (
              <AnimatedSection key={title} delay={(i + 1) * 80}
                className={`border rounded-xl p-4 flex items-start gap-3 ${styles[color]}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconStyles[color]}`} />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{title}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{body}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/verify"
            className="inline-flex items-center gap-2 bg-teal-600
                        hover:bg-teal-700 text-white font-semibold
                        px-6 py-3 rounded-lg text-sm transition-colors">
            Try a verification
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── WHO USES THIS ─────────────────────────────────────────────────────────

function WhoUsesThis() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="max-w-xl mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">
            Built for three groups of people
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Each group gets exactly what it needs, and nothing it does not.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Search,
              title: "Employers and recruiters",
              body: "Stop taking certificates at face value. Verify any degree before an offer is made — no account, no fee, no waiting.",
              items: [
                "Works on any device",
                "Result in under two seconds",
                "Covers all registered institutions",
              ],
            },
            {
              icon: Building2,
              title: "Universities and institutions",
              body: "Issue degrees your graduates can prove are real. Upload once, and every certificate from that batch is permanently verifiable.",
              items: [
                "CSV and JSON batch upload",
                "Revoke or suspend individual certificates",
                "Full audit trail on every action",
              ],
            },
            {
              icon: ShieldCheck,
              title: "Graduate schools and licensing bodies",
              body: "Confirm applicants' credentials before processing their applications. No agencies, no processing fees, no delays.",
              items: [
                "Covers all MerkliFy institutions",
                "Cryptographic proof, not an opinion",
                "Free for all verification queries",
              ],
            },
          ].map(({ icon: Icon, title, body, items }, i) => (
            <AnimatedSection key={title} delay={i * 120}
              className="bg-slate-800 border border-slate-700 rounded-xl
                           p-6 flex flex-col">
              <Icon className="w-5 h-5 text-teal-400 mb-4" />
              <h3 className="font-semibold text-white mb-2 text-[15px]">
                {title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                {body}
              </p>
              <ul className="space-y-2 mt-auto">
                {items.map(item => (
                  <li key={item}
                    className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="text-teal-500 mt-0.5 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── SUPPORTED INSTITUTIONS ────────────────────────────────────────────────

function SupportedInstitutions() {
  const { data: institutions = [] } = useQuery({
    queryKey:  ["public-institutions"],
    queryFn:   getInstitutions,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section id="institutions" className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Supported Institutions
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
            Universities and institutions registered and verified on MerkliFy.
            Certificates from these institutions are immediately verifiable
            by anyone.
          </p>
        </AnimatedSection>

        {institutions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Institutions will appear here once registered and approved.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {institutions.map((inst, i) => (
              <AnimatedSection key={inst.id} delay={i * 60}
                className="flex items-start gap-3 p-4 border border-slate-100
                             rounded-xl hover:border-teal-100 hover:bg-teal-50/20
                             transition-colors">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center
                                 justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {inst.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-teal-500 flex-shrink-0" />
                    <span className="text-xs text-teal-600 font-medium">
                      Verified
                    </span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        )}

        <AnimatedSection delay={200} className="mt-10 text-center">
          <p className="text-slate-400 text-sm mb-4">
            Is your institution not listed yet?
          </p>
          <a href="mailto:hello@merklify.com"
            className="inline-flex items-center gap-2 border border-slate-200
                        hover:border-teal-300 text-slate-600 hover:text-teal-700
                        text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            <Mail className="w-4 h-4" />
            Request access for your institution
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row
                       items-start md:items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <div>
            <p className="font-bold text-white text-sm">MerkliFy</p>
            <p className="text-slate-600 text-xs">
              Cryptographic Certificate Verification
            </p>
          </div>
        </div>

        {/* Centre */}
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} MerkliFy. All rights reserved.
        </p>

        {/* Links */}
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/yourusername/merklify"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 text-xs
                        transition-colors flex items-center gap-1.5"
          >
            {/* GitHub icon inline SVG */}
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18
                       6.839 9.504.5.092.682-.217.682-.483
                       0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343
                       -3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908
                       -.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531
                       1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088
                       .636-1.338-2.22-.253-4.555-1.113-4.555-4.951
                       0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272
                       .098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0
                       0112 6.844c.85.004 1.705.115 2.504.337
                       1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202
                       2.398.1 2.651.64.7 1.028 1.595 1.028 2.688
                       0 3.848-2.339 4.695-4.566 4.943.359.309.678.92
                       .678 1.855 0 1.338-.012 2.419-.012 2.747
                       0 .268.18.58.688.482A10.019 10.019 0 0022
                       12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
          <span className="text-slate-700 text-xs">
            For institution access, contact your administrator.
          </span>
        </div>
      </div>
    </footer>
  );
}