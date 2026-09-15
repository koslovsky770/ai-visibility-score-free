import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "האם ה-AI מבין את העסק שלך? — בדיקה חינמית | AI Visibility Score",
  description:
    "בדיקה חינמית של דף הבית שלך: עד כמה הוא מסביר ל-ChatGPT, Gemini ומנועי AI אחרים מי אתם, מה אתם מציעים ולמי.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="he" className={`${assistant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-slate-900">
        {children}
      </body>
    </html>
  );
}
