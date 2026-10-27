import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);
export const money = (n: any) => `$${Number(n || 0).toFixed(2)}`;
export const todayStr = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: process.env.TZ_NAME || "Asia/Phnom_Penh" });
