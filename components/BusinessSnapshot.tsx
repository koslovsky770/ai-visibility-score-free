"use client";

import { useState } from "react";
import type { BusinessSnapshot as BusinessSnapshotType } from "@/lib/types";

const FIELD_LABELS: { key: keyof Omit<BusinessSnapshotType, "unclear">; label: string }[] = [
  { key: "who", label: "מי העסק" },
  { key: "what", label: "במה הוא עוסק" },
  { key: "forWhom", label: "למי הוא נותן שירות" },
  { key: "mainServices", label: "השירותים המרכזיים" },
  { key: "expertise", label: "המומחיות / הייחוד" },
  { key: "whereOperating", label: "היכן הוא פועל" },
];

export default function BusinessSnapshot({ snapshot }: { snapshot: BusinessSnapshotType }) {
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [draft, setDraft] = useState(snapshot);

  const displayed = editing ? draft : snapshot;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">כך ה-AI הבין את העסק שלך מדף הבית</h3>
          <p className="mt-1 text-sm text-slate-500">
            זו ההבנה שעולה מהתוכן שדף הבית מציג בפועל — לא ממה שסיפרתם לנו עליו.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-sm font-medium">
          {!editing && (
            <>
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className={`rounded-full border px-3 py-1 transition ${
                  confirmed
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {confirmed ? "✓ נכון" : "נכון"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(snapshot);
                  setEditing(true);
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-50"
              >
                עריכה
              </button>
            </>
          )}
          {editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
              >
                שמירה
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(snapshot);
                  setEditing(false);
                }}
                className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-50"
              >
                ביטול
              </button>
            </>
          )}
        </div>
      </div>

      <dl className="mt-4 space-y-3">
        {FIELD_LABELS.map(({ key, label }) => {
          const value = displayed[key];
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:gap-2 text-sm">
              <dt className="shrink-0 font-medium text-slate-600 sm:w-40">{label}:</dt>
              <dd className="flex-1">
                {editing ? (
                  <input
                    type="text"
                    value={value ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value || null }))}
                    placeholder="לא זוהה מדף הבית"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <span className={value ? "text-slate-800" : "text-rose-600"}>
                    {value ?? "לא ברור מדף הבית"}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {!editing && snapshot.unclear.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          לא ניתן היה להבין בבירור מדף הבית: {snapshot.unclear.join(", ")}.
        </p>
      )}
    </div>
  );
}
