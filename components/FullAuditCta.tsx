import { FULL_AUDIT_PAYMENT_URL, FULL_AUDIT_PRICE_ILS } from "@/lib/config";

export default function FullAuditCta() {
  return (
    <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-white">
      <p className="text-lg sm:text-xl font-bold">רוצים לראות את התמונה המלאה?</p>
      <p className="mt-2 text-slate-300">
        מה העמודים באתר שלך מספרים על העסק — ומה חסר בהם?
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        בבדיקה המלאה המערכת סורקת ומנתחת את העמודים המרכזיים באתר, ולא מסתפקת בדף הבית. היא בודקת
        מה האתר מספר על העסק, מה חסר או לא מספיק ברור, ואיך ניתן לשפר — לא רק ציון, אלא תוכנית
        עבודה לאתר.
      </p>
      <a
        href={FULL_AUDIT_PAYMENT_URL}
        className="mt-5 inline-block rounded-full bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
      >
        לבדיקת האתר המלאה — {FULL_AUDIT_PRICE_ILS} ₪
      </a>
    </div>
  );
}
