"use client";

import { useState } from "react";
import { FULL_AUDIT_PAYMENT_URL, FULL_AUDIT_PRICE_ILS } from "@/lib/config";

const BENEFITS = [
  "ניתוח של העמודים המרכזיים באתר",
  "זיהוי פערים שמשפיעים על הדרך שבה AI מבין את העסק",
  "המלצות מעשיות לפי סדר עדיפות",
  "תוכנית פעולה ברורה לשיפור",
];

function formatIls(n: number): string {
  return n.toLocaleString("he-IL");
}

export default function FullAuditUpsell({
  missingCount,
  onCtaClick,
}: {
  missingCount: number;
  onCtaClick?: () => void;
}) {
  const [rawInput, setRawInput] = useState("");
  const customerValue = Number(rawInput.replace(/[^\d]/g, "")) || 0;
  const showCalc = customerValue > 0;
  const lowEstimate = customerValue * 2;
  const highEstimate = customerValue * 5;
  const cheaperThanCustomer = showCalc && customerValue > FULL_AUDIT_PRICE_ILS;

  return (
    <div className="space-y-6">
      {/* Part 1 — bridge from free check to full report */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-lg font-bold text-slate-900">דף הבית הוא רק תחילת התמונה</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          הבדיקה החינמית הראתה איך ה-AI מבין את העסק שלך דרך דף הבית. אבל מנועי AI נעזרים גם
          בעמודי השירותים, אודות, שאלות ותשובות ותוכן נוסף כדי להבין במה אתם מומחים ועד כמה העסק
          שלכם רלוונטי לתשובה.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          בדוח המלא נבדוק את האתר לעומק ונזהה מה מחזק את הנראות שלכם — ומה עדיין דורש שיפור.
        </p>
        {missingCount > 0 && (
          <p className="mt-3 text-sm text-indigo-700">
            כבר בדף הבית זיהינו {missingCount} נקודות שכדאי לשפר — וזו רק שכבה אחת מתוך האתר.
          </p>
        )}
      </div>

      {/* Part 2+3 — customer-value calculator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-center text-xl font-bold text-slate-900">
          כמה תרוויחו משיפור והתאמת האתר לAI
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-slate-600">
          כדי להבין אם דוח מלא בעלות 149 ₪ משתלם לעסק שלך, הזינו כמה שווה לכם לקוח חדש בממוצע —
          ונחשב לכם כמה תוכלו להרוויח.
        </p>

        <div className="mx-auto mt-6 max-w-xs">
          <label className="mb-1.5 block text-center text-sm font-medium text-slate-700">
            כמה שווה לכם לקוח חדש בממוצע?
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              ₪
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="לדוגמה: 2,000"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-4 pr-9 text-center text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {showCalc && (
          <div className="mx-auto mt-6 max-w-md rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 text-center">
            <p className="text-sm text-slate-600">
              אם נראות חלשה ב-AI גורמת לכם לפספס אפילו 2 הזדמנויות בשנה — מדובר ב-
            </p>
            <p className="mt-1 text-3xl font-extrabold text-indigo-700 sm:text-4xl">
              {formatIls(lowEstimate)} ₪
            </p>
            <p className="text-sm text-slate-500">של הכנסה פוטנציאלית</p>
            <div className="mt-4 border-t border-indigo-100 pt-4 text-sm text-slate-600">
              5 הזדמנויות בשנה = <span className="font-bold text-indigo-700">{formatIls(highEstimate)} ₪</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              החישוב נועד להמחשה בלבד ואינו תחזית להכנסות או הבטחה לתוצאות.
            </p>
          </div>
        )}
      </div>

      {/* Part 4+5 — price framing, benefits, CTA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm text-slate-600">
          הדוח המלא עולה <span className="font-semibold text-slate-800">{FULL_AUDIT_PRICE_ILS} ₪</span>.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          אתם לא צריכים מאות לקוחות חדשים כדי שהבדיקה תחזיר את עצמה. לפעמים מספיקה הזדמנות אחת.
        </p>
        {cheaperThanCustomer && (
          <p className="mt-1 text-sm font-medium text-indigo-700">
            הדוח עולה פחות משווי של לקוח אחד אצלכם.
          </p>
        )}

        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-right">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-emerald-600">✓</span>
              {b}
            </li>
          ))}
        </ul>

        <h4 className="mt-8 text-lg font-bold text-slate-900">רוצים לראות את התמונה המלאה?</h4>
        <a
          href={FULL_AUDIT_PAYMENT_URL}
          onClick={onCtaClick}
          className="mt-4 inline-block rounded-full bg-[linear-gradient(90deg,#2F67FF_0%,#6D37FF_100%)] px-8 py-3.5 font-bold text-white shadow-[0_9px_22px_rgba(83,76,255,0.25)] transition hover:opacity-95"
        >
          כן, אני רוצה את הדוח המלא — {FULL_AUDIT_PRICE_ILS} ₪
        </a>
        <p className="mt-2 text-xs text-slate-400">תשלום חד-פעמי</p>
      </div>
    </div>
  );
}
