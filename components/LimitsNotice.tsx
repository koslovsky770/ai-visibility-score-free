export default function LimitsNotice({ totalPagesFound }: { totalPagesFound: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6 text-sm leading-relaxed text-slate-600">
      <h3 className="mb-2 font-bold text-slate-800">דף הבית הוא רק תחילת התמונה</h3>
      <p>
        דף הבית הוא שער הכניסה לאתר, אבל מנועי AI יכולים להיעזר גם בעמודי השירותים, האודות,
        המאמרים, השאלות והתשובות ובתוכן נוסף באתר כדי להבין לעומק מי העסק, במה הוא מומחה ועד כמה
        המידע עליו ברור ומבוסס.
      </p>
      {totalPagesFound > 0 && (
        <p className="mt-2 font-medium text-slate-700">
          זיהינו באתר שלך {totalPagesFound} עמודים פנימיים שעשויים להשפיע על התמונה הכוללת של
          העסק.
        </p>
      )}
    </div>
  );
}
