import { useState } from "react";
import { Upload, Hash, Search, ShieldCheck,
         Settings, ChevronDown, ChevronUp } from "lucide-react";

const SECTIONS = [
  {
    icon: Upload,
    title: "Uploading Certificates",
    items: [
      {
        q: "What file formats can I upload?",
        a: "MerkliFy accepts CSV files (the standard spreadsheet export format) and JSON files. CSV is recommended for most institutions as it can be exported from Microsoft Excel, Google Sheets, and most student information systems.",
      },
      {
        q: "What fields must be in my file?",
        a: "Five fields are required for every row: serial_number (a unique ID for the certificate), fullname (the graduate's name exactly as on their certificate), program (the full degree title including the prefix e.g. BSc Computer Science), graduation_year (four-digit year), and issuer (your institution name). Three optional fields are also supported: student_id, classification, and issue_date.",
      },
      {
        q: "Why does my upload say 'Validation failed'?",
        a: "One or more rows in your file have data problems. The error message lists every problem with the row number, field name, and description. Open your file, fix the listed rows, save it, and re-upload. All errors across all rows are reported together so you can fix everything in one pass.",
      },
      {
        q: "A serial number already exists — what do I do?",
        a: "Serial numbers must be unique within your institution across all batches. If a certificate with that serial number was already uploaded in a previous batch, you cannot upload it again. If it was a data entry error in the original batch, revoke the original certificate and upload a corrected one with a new serial number.",
      },
      {
        q: "I uploaded the wrong data. Can I edit it?",
        a: "No. Certificate records are permanent once committed — they cannot be edited or deleted. This is intentional: the cryptographic fingerprint was computed at upload and cannot be recomputed with different data. To correct an error: revoke the incorrect certificate with a note explaining the reason, then upload a corrected record with a new serial number in a new batch.",
      },
      {
        q: "What is an academic year and how does it differ from the batch name?",
        a: "The academic year is the calendar year the degree programme belongs to (e.g. 2025). The batch name is a human-readable label you choose for the upload (e.g. 'July 2025 Engineering Graduates'). Multiple batches can share the same academic year. Academic year is used for filtering; batch name is for your own reference.",
      },
    ],
  },
  {
    icon: Hash,
    title: "Batches",
    items: [
      {
        q: "What is a batch?",
        a: "A batch is a group of certificates uploaded together in a single file. All certificates in a batch share the same Merkle Root — a single cryptographic value that commits to the integrity of the entire group. Uploading in batches is more efficient than uploading one certificate at a time.",
      },
      {
        q: "How do I find a specific batch?",
        a: "Go to Batches in the sidebar. You can filter by academic year using the dropdown and sort by date or name. Click any batch to see all certificates it contains.",
      },
    ],
  },
  {
    icon: Search,
    title: "Managing Certificates",
    items: [
      {
        q: "Can I see certificates uploaded by other departments?",
        a: "Yes. All certificates issued under your institution are visible to all issuer accounts for that institution. This is intentional — data ownership belongs to the institution, not the individual uploader. Each certificate shows which department uploaded it.",
      },
      {
        q: "When should I revoke a certificate?",
        a: "Revoke when a certificate should never be considered valid again. Common reasons: fraud discovered in admission or examination, a degree formally rescinded by the institution, or a data entry error in a previously uploaded batch. Revocation is permanent and cannot be undone.",
      },
      {
        q: "When should I suspend a certificate?",
        a: "Suspend when validity is temporarily in question — for example, during a disciplinary investigation or while an appeals process is ongoing. A suspended certificate can be reinstated. It can also be escalated to revoked if the investigation concludes unfavourably.",
      },
      {
        q: "A certificate I revoked now shows as REVOKED on public verification. Can this be hidden?",
        a: "No. The REVOKED status is visible on public verification by design. A verifier asking about a certificate deserves an accurate answer. The cryptographic record of original issuance is preserved — the revocation is an additional fact layered on top of it.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    items: [
      {
        q: "How does verification work?",
        a: "A verifier enters three details: the serial number, the graduate's full name, and the issuing institution. MerkliFy checks five things in sequence: whether the record exists, whether the stored data is internally consistent, whether the Merkle proof reconstructs correctly, whether the digital signature is valid, and what the current lifecycle status is. All five checks must pass for AUTHENTIC.",
      },
      {
        q: "Why does a correct certificate sometimes return 'Not Verified'?",
        a: "The most common cause is a small difference in the name field — a missing middle name, a hyphen instead of a space, or different capitalisation in the original record. The name must match exactly what was submitted in your upload file. Check your original data and compare carefully.",
      },
    ],
  },
  {
    icon: Settings,
    title: "Account",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Settings in the sidebar and click Security. Enter your current password first, then your new password. Passwords must be at least 8 characters. Changes take effect immediately.",
      },
      {
        q: "I forgot my password. What do I do?",
        a: "Contact your MerkliFy system administrator. They can generate a new temporary password for your account. You will be required to change it on your next login.",
      },
      {
        q: "What does my department code mean?",
        a: "Your department code (e.g. ISS-4X2K) is a unique identifier assigned to your issuer account when it was created. It distinguishes your account from other departments at the same university. It appears in audit logs and uploaded batch records.",
      },
    ],
  },
];

export default function IssuerHelpPage() {
  const [openSection, setOpenSection] = useState(0); // start first section open
  const [openItem,    setOpenItem]    = useState({});

  const toggleItem = (si, ii) => {
    const key = `${si}-${ii}`;
    setOpenItem(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-teal-500" />
          <h1 className="text-2xl font-bold text-slate-800">Help Centre</h1>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">
          Guidance for issuer accounts. If your question is not answered
          here, contact your MerkliFy system administrator.
        </p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section, si) => {
          const Icon   = section.icon;
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
                  <Icon className="w-4 h-4 text-teal-500" />
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