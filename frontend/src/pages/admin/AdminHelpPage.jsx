import { useState } from "react";
import { ShieldCheck, Users, Building2, Search,
         ScrollText, Settings, ChevronDown, ChevronUp } from "lucide-react";

const SECTIONS = [
  {
    icon: Building2,
    title: "Getting Started",
    items: [
      {
        q: "How do I register a university?",
        a: "Go to Universities in the sidebar and click Register University. Fill in the institution name, location, contact details, and domain. The university will be created in PENDING status. You must then approve it by clicking Approve — only TRUSTED universities can issue certificates.",
      },
      {
        q: "What happens when I approve a university?",
        a: "Approving a university changes its trust status to TRUSTED and enables its RSA signing key. After approval, you can create issuer accounts for that university. Certificates from a TRUSTED university will pass Step 4 (digital signature) during public verification.",
      },
      {
        q: "What is a university code?",
        a: "Each university receives an auto-generated 5-digit code when registered (e.g. #47291). This is a display identifier used for quick reference. It is not the same as the database ID and is safe to share publicly.",
      },
    ],
  },
  {
    icon: Users,
    title: "Managing Issuer Accounts",
    items: [
      {
        q: "How do I create an issuer account?",
        a: "Go to Issuers, click Create Account. Select the university, enter the issuer's email, their full name, and department. The system generates a secure temporary password — copy it before dismissing the banner, as it will not be shown again. Share the password securely with the issuer (phone call or institutional email). They must change it on first login before they can upload certificates.",
      },
      {
        q: "How do I reset an issuer's password?",
        a: "Open the Issuers tab, find the account, and click Reset Password. A new temporary password is generated. The issuer's current session is immediately invalidated. Copy and share the new password with the issuer.",
      },
      {
        q: "An issuer has been shown as 'Awaiting first login' for a long time. What do I do?",
        a: "This means the issuer has not yet logged in and changed their temporary password. Follow up with them directly. If the account is no longer needed, you can reset the password to keep it secure.",
      },
    ],
  },
  {
    icon: Search,
    title: "Certificates",
    items: [
      {
        q: "How do I find a specific certificate?",
        a: "Go to Certificates. You can filter by institution using the dropdown, search by name or serial number, and filter by status. Click any row to open the certificate detail overlay. Use the arrow buttons or keyboard arrows to navigate between certificates.",
      },
      {
        q: "Can I revoke a certificate?",
        a: "Yes. Open the certificate detail overlay and click Revoke. Revocation is permanent — it cannot be undone. A revoked certificate will return REVOKED on public verification. The cryptographic record of issuance remains valid; only the lifecycle status changes.",
      },
      {
        q: "What is the difference between Revoke and Suspend?",
        a: "Suspension is temporary — you can reinstate a suspended certificate. Revocation is permanent — it cannot be reversed. Use suspension for cases under investigation. Use revocation for confirmed fraud or formally rescinded degrees.",
      },
    ],
  },
  {
    icon: ScrollText,
    title: "Verification Logs",
    items: [
      {
        q: "What is an anomaly in the verification logs?",
        a: "Anomalies are verification attempts that returned TAMPERED, DATA_TAMPERED, BATCH_TAMPER_DETECTED, or UNTRUSTED_ISSUER internally. These suggest someone is testing altered certificate details against the system. A spike in anomalies for a specific serial number warrants investigation.",
      },
      {
        q: "Can I see who verified a certificate?",
        a: "Verification is public and does not require a login. The log records the IP address and timestamp of each attempt, but not any account information. This is by design — verification is anonymous to protect verifier privacy.",
      },
    ],
  },
  {
    icon: Settings,
    title: "Account and Settings",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Settings in the sidebar and click the Security tab. Enter your current password first — this is required for all password changes. Then enter and confirm your new password. Changes take effect immediately.",
      },
    //   {
    //     q: "Can there be multiple administrator accounts?",
    //     a: "Yes. Additional admin accounts are created via the backend setup script (create_admin.py) or the /setup/admin endpoint. This is an intentional decision — admin account creation does not have a UI to prevent accidental or unauthorised admin creation.",
    //   },
    ],
  },
];

export default function AdminHelpPage() {
  const [openSection, setOpenSection] = useState(null);
  const [openItem,    setOpenItem]    = useState({});

  const toggleItem = (sectionIdx, itemIdx) => {
    const key = `${sectionIdx}-${itemIdx}`;
    setOpenItem(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-sky-500" />
          <h1 className="text-2xl font-bold text-slate-800">Help Centre</h1>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          Guidance for administrators. If something is not covered here,
          contact your system operator.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section, si) => {
          const Icon = section.icon;
          const isOpen = openSection === si;

          return (
            <div key={si}
              className="bg-white border border-slate-200 rounded-xl
                           overflow-hidden">
              <button
                onClick={() => setOpenSection(isOpen ? null : si)}
                className="w-full flex items-center justify-between
                             px-5 py-4 text-left hover:bg-slate-50
                             transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-sky-500" />
                  <p className="font-semibold text-slate-800">
                    {section.title}
                  </p>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 divide-y
                                 divide-slate-50">
                  {section.items.map((item, ii) => {
                    const key    = `${si}-${ii}`;
                    const isOpen = openItem[key];
                    return (
                      <div key={ii}>
                        <button
                          onClick={() => toggleItem(si, ii)}
                          className="w-full flex items-start justify-between
                                       px-5 py-4 text-left hover:bg-slate-50
                                       transition-colors gap-4"
                        >
                          <p className="text-sm font-medium text-slate-700">
                            {item.q}
                          </p>
                          {isOpen
                            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400
                                                      flex-shrink-0 mt-0.5" />
                            : <ChevronDown className="w-3.5 h-3.5 text-slate-400
                                                        flex-shrink-0 mt-0.5" />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4">
                            <p className="text-sm text-slate-500 leading-relaxed">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}