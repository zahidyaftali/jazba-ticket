import React, { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { securityRules, type RulesStatus } from "../../services/adminSecurityService";
import { useAdmin } from "./AdminContext";
import { btnPrimary, fmtDateTime } from "./ui";

/** Dashboard card: are the database's live security rules the tested ones
 *  (firestore.rules)? If not, one click publishes them. */
export default function SecurityRulesCard() {
  const { notify, fail } = useAdmin();
  const [rules, setRules] = useState<RulesStatus | null>(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let off = false;
    securityRules().then((r) => {
      if (off) return;
      if (r.status === "ready") setRules(r.rules);
      else setError(r.error);
    });
    return () => {
      off = true;
    };
  }, []);

  const publish = async () => {
    if (!window.confirm("Publish the latest database security rules now? Firebase checks them first; nothing changes if they're refused.")) return;
    setPublishing(true);
    const r = await securityRules(true);
    setPublishing(false);
    if (r.status === "ready") {
      setRules(r.rules);
      setError("");
      notify("Database security rules published.");
    } else {
      fail(r.error);
    }
  };

  if (!rules && !error) return null;

  if (rules?.upToDate) {
    return (
      <div className="bg-white border border-[#e4e4e4] px-5 py-3 flex items-center gap-3 text-sm">
        <ShieldCheck className="w-5 h-5 text-[#15803d] shrink-0" />
        <span>
          <span className="font-bold">Database protection is up to date.</span>{" "}
          <span className="text-[#666]">Only admins and confirmed payments can create orders{rules.publishedAt ? ` · published ${fmtDateTime(rules.publishedAt)}` : ""}.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[#ffed00] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-bold text-black">
            {error ? "Couldn’t check the database security rules" : "Database security rules need publishing"}
          </h3>
          <p className="text-sm text-black/75 mt-1 max-w-2xl">
            {error ||
              "The live rules are older than the tested ones. Until they're published, a signed-in visitor could create an order or ticket without paying."}
          </p>
        </div>
      </div>
      {!error && (
        <button type="button" onClick={publish} disabled={publishing} className={`${btnPrimary} !bg-black !text-white hover:!bg-neutral-800 shrink-0`}>
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Publish now
        </button>
      )}
    </div>
  );
}
