import { FULL_AUDIT_PAYMENT_URL, FULL_AUDIT_PRICE_ILS } from "@/lib/config";

export default function FullAuditCta({ onCtaClick }: { onCtaClick?: () => void }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white">
      <p className="text-lg sm:text-xl font-bold">רוצים להבין מה בדיוק מחליש את הנראות שלכם ב-AI?</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        הבדיקה החינמית מנתחת את דף הבית. בדוח המלא נבדוק את האתר לעומק, נזהה את הפערים שמשפיעים על
        האופן שבו AI מבין את העסק, ונציג תוכנית פעולה מסודרת לשיפור.
      </p>
      <a
        href={FULL_AUDIT_PAYMENT_URL}
        onClick={onCtaClick}
        className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
      >
        קבלו את הדוח המלא — {FULL_AUDIT_PRICE_ILS} ₪
      </a>
    </div>
  );
}
