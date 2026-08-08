// src/pages/public/LandingPage.jsx — complete replacement
import { Link } from "react-router-dom";
import {
  ArrowRight, ShieldCheck, Building2,
  Search, Lock, FileCheck, Play, Mail,
  CheckCircle2, AlertCircle, Clock, HelpCircle,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-white">
      <LandingNav />
      <Hero />
      <HowItWorks />
      <DemoSection />
      <WhatResultsLookLike />
      <WhoUsesThis />
      <InstitutionsSection />
      <LandingFooter />
    </div>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900
                     border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center
                       justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-white text-sm tracking-tight">
            MerkliFy
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works"
            className="text-slate-400 hover:text-slate-200
                        text-sm transition-colors">
            How it works
          </a>
          <a href="#demo"
            className="text-slate-400 hover:text-slate-200
                        text-sm transition-colors">
            Demo
          </a>
          <a href="#institutions"
            className="text-slate-400 hover:text-slate-200
                        text-sm transition-colors">
            For institutions
          </a>
        </div>

        <Link to="/verify"
          className="flex items-center gap-1.5 bg-teal-600
                      hover:bg-teal-500 text-white text-sm
                      font-semibold px-4 py-2 rounded-lg
                      transition-colors">
          Verify a degree
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </nav>
  );
}

// ─── HERO ──────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="bg-slate-900 text-white pt-14">
      <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight
                          tracking-tight mb-5 text-white">
            Verify academic degrees
            <br />
            <span className="text-teal-400">without calling anyone.</span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-4">
            Universities upload their graduate records once.
            Employers verify any certificate instantly — for free,
            with no account required.
          </p>

          <p className="text-slate-500 text-base leading-relaxed mb-10">
            Every certificate is sealed with a cryptographic fingerprint
            at the point of issuance. Altering any detail breaks the seal.
            The result you receive is a mathematical proof, not an opinion.
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

        {/* Straight factual strip — no marketing spin */}
        <div className="mt-16 pt-8 border-t border-slate-800 grid
                         grid-cols-2 md:grid-cols-4 gap-8">
          {[
            {
              label: "Verification method",
              value: "Cryptographic",
            },
            {
              label: "Time to result",
              value: "Under 2 seconds",
            },
            {
              label: "Cost to verify",
              value: "Free",
            },
            {
              label: "Account required",
              value: "None",
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-white font-semibold text-sm">{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ──────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-6">

        <div className="max-w-xl mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            How it works
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            The process runs in two directions: institutions issue,
            and anyone verifies. Both sides are fully automated once
            set up.
          </p>
        </div>

        {/* Issuance side */}
        <div className="mb-12">
          <p className="text-xs font-semibold text-teal-600 uppercase
                          tracking-widest mb-6">
            When a university uploads records
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                icon: Building2,
                title: "Upload graduate data",
                body: "An authorised staff member uploads a spreadsheet of graduate records. MerkliFy validates every row before processing.",
              },
              {
                step: "2",
                icon: Lock,
                title: "Each degree is cryptographically sealed",
                body: "Every certificate is hashed using SHA-256. All hashes in the batch are assembled into a Merkle Tree. The university's private RSA key signs the root.",
              },
              {
                step: "3",
                icon: FileCheck,
                title: "Records are permanently committed",
                body: "The signed batch is stored. From this point, the data cannot be edited or deleted. The record is immutable.",
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step}
                className="p-5 border border-slate-100 rounded-xl
                             hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono font-bold
                                    text-teal-500">
                    0{step}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Verification side */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase
                          tracking-widest mb-6">
            When someone verifies a certificate
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                step: "4",
                title: "Submit the certificate details",
                body: "The verifier enters the details from the certificate. MerkliFy reconstructs the cryptographic hash from the submitted fields.",
              },
              {
                step: "5",
                title: "Five independent checks run automatically",
                body: "Hash match, internal consistency, Merkle proof reconstruction, RSA signature validation, and current lifecycle status — all checked in sequence.",
              },
            ].map(({ step, title, body }) => (
              <div key={step}
                className="p-5 border border-slate-100 rounded-xl
                             hover:border-slate-200 transition-colors">
                <span className="text-xs font-mono font-bold text-slate-400 mb-3 block">
                  0{step}
                </span>
                <h3 className="font-semibold text-slate-800 text-sm mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-50 rounded-xl border
                         border-slate-100">
          <p className="text-sm text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-700">
              No blockchain.
            </span>{" "}
            SHA-256, Merkle Trees, and RSA are standard cryptographic
            primitives used in banking, HTTPS, and digital identity
            systems worldwide. MerkliFy applies them to academic
            records — no distributed ledger required.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── DEMO ─────────────────────────────────────────────────────────────────

function DemoSection() {
  return (
    <section id="demo"
      className="py-16 bg-slate-100 border-y border-slate-200">
      <div className="max-w-5xl mx-auto px-6">
        <div className="max-w-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Watch a walkthrough
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            A short demonstration of certificate issuance and
            public verification from start to finish.
          </p>
        </div>

        {/* Video placeholder */}
        <div className="bg-slate-200 border border-slate-300 rounded-xl
                         aspect-video flex items-center justify-center
                         max-w-3xl">
          <div className="text-center">
            <div className="w-14 h-14 bg-white border border-slate-300
                             rounded-full flex items-center justify-center
                             mx-auto mb-3">
              <Play className="w-6 h-6 text-slate-400 ml-0.5" />
            </div>
            <p className="text-slate-500 text-sm font-medium">
              Demo video coming soon
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── WHAT RESULTS LOOK LIKE ────────────────────────────────────────────────

function WhatResultsLookLike() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            What you will see
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            Every verification returns one of five results.
            Each one is definitive — no grey areas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Authentic — spans full height on left */}
          <div className="md:row-span-2 border-2 border-teal-200 bg-teal-50/30
                           rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
              <p className="font-semibold text-teal-800 text-sm">
                Certificate Verified
              </p>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-5">
              All five checks passed. The degree is genuine, was
              issued by the stated institution, and is currently active.
            </p>
            <div className="border-t border-teal-100 pt-4 space-y-3">
              {[
                { label: "Serial",    value: "ENG2025-001", mono: true },
                { label: "Program",   value: "BSc Electrical Engineering" },
                { label: "Issued by", value: "University of Accra" },
                { label: "Year",      value: "2025", mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 uppercase
                                  tracking-wide font-medium">
                    {label}
                  </p>
                  <p className={`text-sm font-medium text-slate-800
                                  ${mono ? "font-mono" : ""}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Other four outcomes */}
          <div className="border border-red-200 bg-red-50/20 rounded-xl p-4
                           flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">
                Certificate Revoked
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                The institution has formally revoked this certificate.
                It is no longer valid.
              </p>
            </div>
          </div>

          <div className="border border-amber-200 bg-amber-50/20 rounded-xl p-4
                           flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                Certificate Suspended
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Temporarily suspended by the institution.
                Contact them for details.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4
                           flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                Details Not Matched
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                No record matched the submitted details.
                Check all fields and try again.
              </p>
            </div>
          </div>

          <div className="border border-orange-200 bg-orange-50/20 rounded-xl p-4
                           flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">
                Verification Unavailable
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                A system integrity issue was detected.
                Contact the issuing institution.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/verify"
            className="inline-flex items-center gap-2 bg-teal-600
                        hover:bg-teal-700 text-white font-semibold
                        px-6 py-3 rounded-lg text-sm transition-colors">
            Try it now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── WHO USES THIS ─────────────────────────────────────────────────────────

function WhoUsesThis() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="max-w-xl mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">
            Who uses MerkliFy
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            The system serves three separate groups.
            Each has its own access path and sees only what it needs to.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Search,
              title: "Employers and recruiters",
              body: "Check a candidate's degree before making a hiring decision. No account, no fee, no call to the university.",
              items: [
                "Works on any device",
                "Free for all verification queries",
                "Result in under two seconds",
              ],
            },
            {
              icon: Building2,
              title: "Universities and institutions",
              body: "Upload graduate records in bulk. MerkliFy seals each certificate and manages the full lifecycle.",
              items: [
                "CSV and JSON batch upload",
                "Revoke or suspend individual certificates",
                "Full audit trail on every change",
              ],
            },
            {
              icon: ShieldCheck,
              title: "Graduate schools and licensing bodies",
              body: "Confirm an applicant's undergraduate degree before processing their application.",
              items: [
                "Five-field cryptographic match",
                "Works across all registered institutions",
                "No third parties or processing fees",
              ],
            },
          ].map(({ icon: Icon, title, body, items }) => (
            <div key={title}
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
                    className="flex items-start gap-2.5 text-sm
                                text-slate-300">
                    <span className="text-teal-500 mt-0.5 flex-shrink-0">
                      →
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── INSTITUTIONS ──────────────────────────────────────────────────────────

function InstitutionsSection() {
  return (
    <section id="institutions"
      className="py-20 md:py-28 bg-white border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Get your institution on MerkliFy
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-6">
              Once your institution is registered and approved,
              your staff can begin uploading graduate records.
              Your graduates can be verified by any employer,
              anywhere, immediately.
            </p>
            <ul className="space-y-3">
              {[
                "Upload CSV or JSON files of any size",
                "Each degree certificate is permanently sealed",
                "Revoke or suspend certificates when needed",
                "Multiple staff accounts per institution",
                "Audit trail for every action taken",
              ].map(item => (
                <li key={item}
                  className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-teal-500
                                            flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact form */}
          <div className="bg-slate-50 border border-slate-200
                           rounded-xl p-6">
            <h3 className="font-semibold text-slate-800 mb-1">
              Request access
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              Fill in your details and we will reach out to get
              your institution set up.
            </p>
            <InstitutionContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function InstitutionContactForm() {
  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        // TODO: wire to backend or Formspree when email is set up
        alert("Request received. We will be in touch shortly.");
      }}
    >
      {[
        { id: "inst",    label: "Institution name",  type: "text",  placeholder: "University of Accra" },
        { id: "contact", label: "Your name",          type: "text",  placeholder: "Dr. Kwame Mensah" },
        { id: "email",   label: "Official email",     type: "email", placeholder: "registrar@university.edu.gh" },
      ].map(({ id, label, type, placeholder }) => (
        <div key={id}>
          <label htmlFor={id}
            className="block text-xs font-semibold text-slate-500
                        uppercase tracking-wide mb-1.5">
            {label}
          </label>
          <input id={id} type={type}
            className="w-full px-3 py-2.5 border border-slate-200
                        rounded-lg text-sm bg-white focus:outline-none
                        focus:ring-2 focus:ring-teal-500"
            placeholder={placeholder}
            required
          />
        </div>
      ))}
      <div>
        <label htmlFor="notes"
          className="block text-xs font-semibold text-slate-500
                      uppercase tracking-wide mb-1.5">
          Notes
        </label>
        <textarea id="notes" rows={3}
          className="w-full px-3 py-2.5 border border-slate-200
                      rounded-lg text-sm bg-white focus:outline-none
                      focus:ring-2 focus:ring-teal-500 resize-none"
          placeholder="How many graduates does your institution
issue degrees to each year?"
        />
      </div>
      <button type="submit"
        className="w-full flex items-center justify-center gap-2
                    bg-teal-600 hover:bg-teal-700 text-white
                    font-semibold py-3 rounded-lg text-sm
                    transition-colors">
        <Mail className="w-4 h-4" />
        Send request
      </button>
    </form>
  );
}

// ─── FOOTER ────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col
                       md:flex-row items-start md:items-center
                       justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="text-white font-bold text-sm">MerkliFy</span>
          <span className="text-slate-600 text-xs ml-2 hidden sm:inline">
            Cryptographic Certificate Verification
          </span>
        </div>
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} MerkliFy
        </p>
        <p className="text-slate-700 text-xs">
          For institution access, contact your system administrator.
        </p>
      </div>
    </footer>
  );
}