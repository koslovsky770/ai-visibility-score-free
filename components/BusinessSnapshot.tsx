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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="font-bold text-slate-800">כך ה-AI הבין את העסק שלך מדף הבית</h3>
      <p className="mt-1 text-sm text-slate-500">
        זו ההבנה שעולה מהתוכן שדף הבית מציג בפועל — לא ממה שסיפרתם לנו עליו.
      </p>

      <dl className="mt-4 space-y-3">
        {FIELD_LABELS.map(({ key, label }) => {
          const value = snapshot[key];
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:gap-2 text-sm">
              <dt className="shrink-0 font-medium text-slate-600 sm:w-40">{label}:</dt>
              <dd className={value ? "text-slate-800" : "text-rose-600"}>
                {value ?? "לא ברור מדף הבית"}
              </dd>
            </div>
          );
        })}
      </dl>
      {snapshot.unclear.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          לא ניתן היה להבין בבירור מדף הבית: {snapshot.unclear.join(", ")}.
        </p>
      )}
    </div>
  );
}
