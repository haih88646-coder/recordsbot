import { sql, money } from "@/lib/db";
import { parseRecords } from "@/lib/gemini";
import { handleCommand } from "@/lib/reports";
import { send } from "@/lib/telegram";

export const maxDuration = 30;
const ok = () => new Response("ok");

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET)
    return new Response("forbidden", { status: 403 });

  const update = await req.json();
  const msg = update.message ?? update.edited_message;
  if (!msg?.text) return ok();
  const chatId = msg.chat.id;

  // Private bot: only your chat id may use it
  const allowed = process.env.ALLOWED_CHAT_ID;
  if (!allowed) { await send(chatId, `Your chat id is ${chatId}. Put it in ALLOWED_CHAT_ID on Vercel and redeploy.`); return ok(); }
  if (String(chatId) !== allowed) return ok();

  try {
    const text: string = msg.text.trim();
    if (text.startsWith("/")) {
      await send(chatId, await handleCommand(text));
      return ok();
    }

    const recs = await parseRecords(text);
    if (!recs.length) { await send(chatId, "I couldn't find any record in that message."); return ok(); }

    const out: string[] = [];
    for (const r of recs) {
      // duplicate check (same title + total + date under a different number)
      const dup = await sql`select entry_no from records where title = ${r.title} and total = ${r.total} and record_date = ${r.record_date} and entry_no is distinct from ${r.entry_no} limit 1`;
      if (dup.length) r.warnings.push(`Looks like a duplicate of #${dup[0].entry_no}`);

      await sql`
        insert into records (entry_no, title, category, record_date, total, currency, items, note, warnings, raw_text)
        values (${r.entry_no}, ${r.title}, ${r.category}, ${r.record_date}, ${r.total}, ${r.currency || "USD"},
                ${JSON.stringify(r.items)}::jsonb, ${r.note ?? null}, ${JSON.stringify(r.warnings)}::jsonb, ${text})
        on conflict (entry_no) do update set
          title = excluded.title, category = excluded.category, record_date = excluded.record_date,
          total = excluded.total, items = excluded.items, note = excluded.note,
          warnings = excluded.warnings, raw_text = excluded.raw_text`;

      out.push(
        `✅ #${r.entry_no ?? "-"} ${r.title}\n` +
        `   ${r.category} · ${r.record_date} · ${money(r.total)}\n` +
        r.items.map((i) => `   - ${i.name}${i.spec ? " " + i.spec : ""}: ${i.qty} × ${money(i.unit_price)} = ${money(i.amount)}`).join("\n") +
        (r.warnings.length ? "\n" + r.warnings.map((w) => `   ⚠️ ${w}`).join("\n") : "")
      );
    }
    await send(chatId, out.join("\n\n"));
  } catch (e: any) {
    console.error(e);
    await send(chatId, "❌ Error: " + (e?.message || "unknown").slice(0, 300));
  }
  return ok();
}
