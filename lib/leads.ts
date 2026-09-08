import fs from "fs";
import path from "path";
import type { Lead } from "./types";

export interface StoredLead extends Lead {
  score: number;
  createdAt: string;
}

/**
 * Lead storage is intentionally a single narrow function. There is no
 * database yet — the plan is to connect this to a MySQL database (cPanel)
 * once the project is finalized. Until then this logs every lead (visible
 * in Vercel's runtime logs in production) and, when running locally,
 * appends to a gitignored JSON-lines file so leads are inspectable during
 * development. Replace the body of this function with a MySQL insert when
 * ready — nothing else in the app needs to change.
 */
export async function saveLead(lead: StoredLead): Promise<void> {
  console.log("NEW_LEAD", JSON.stringify(lead));

  if (process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.join(process.cwd(), ".leads.local.jsonl");
      fs.appendFileSync(filePath, JSON.stringify(lead) + "\n", "utf-8");
    } catch (err) {
      console.error("Failed to write local lead file", err);
    }
  }
}
