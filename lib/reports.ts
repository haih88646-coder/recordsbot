import { sql, money, todayStr } from "./db";

const HELP = `Send me your records, e.g.
14-Mouse logitech B100:5 X$5.5=27.5, label 50x30:10X3.3=33 total:$60.5 (12-10-26)
(one or many lines; resend the same number to correct it)

Commands
/today  – today's records
/week   – last 7 days
/month [YYYY-MM] – monthly report
/year [YYYY] – yearly report
/last [n] – latest n records (default 5)
/top [YYYY-MM] – top items by spending
/find word – search
/del 15 – delete entry number 15`;

async function period(label: string, from: string, to: string) {
  const [t] = await sql`select count(*)::int c, coalesce(sum(total),0) t from records where record_date between ${from} and ${to}`;
  if (!t.c) return `${label}: no records.`;
  const cats = await sql`select category, count(*)::int c, sum(total) t from records where record_date between ${from} and ${to} group by category order by t desc`;
  const rows = await sql`select entry_no, title, total, record_date, warnings from records where record_date between ${from} and ${to} order by record_date, id`;
  return [
    `📊 ${label}`,
    `Total: ${money(t.t)}  (${t.c} records)`,
    "",
    ...cats.map((c: any) => `• ${c.category}: ${money(c.t)} (${c.c})`),
    "",
    ...rows.map((r: any) => `#${r.entry_no ?? "-"} ${String(r.record_date).slice(5, 10)} ${r.title.slice(0, 40)} — ${money(r.total)}${r.warnings?.length ? " ⚠️" : ""}`),
  ].join("\n");
}

const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
};

export async function handleCommand(text: string): Promise<string> {
  const [c, ...a] = text.trim().split(/\s+/);
  const cmd = c.split("@")[0].toLowerCase();
  const arg = a.join(" ");
  const today = todayStr();

  switch (cmd) {
    case "/start":
    case "/help":
      return HELP;
    case "/today":
      return period("Today", today, today);
    case "/week": {
      const d = new Date(today); d.setDate(d.getDate() - 6);
      return period("Last 7 days", d.toISOString().slice(0, 10), today);
    }
    case "/month": {
      const ym = /^\d{4}-\d{2}$/.test(arg) ? arg : today.slice(0, 7);
      const [f, t] = monthRange(ym);
      return period(`Month ${ym}`, f, t);
    }
    case "/year": {
      const y = /^\d{4}$/.test(arg) ? arg : today.slice(0, 4);
      return period(`Year ${y}`, `${y}-01-01`, `${y}-12-31`);
    }
    case "/last": {
      const n = Math.min(Number(arg) || 5, 30);
      const rows = await sql`select entry_no, title, total, record_date from records order by id desc limit ${n}`;
      return rows.length ? rows.map((r: any) => `#${r.entry_no ?? "-"} ${String(r.record_date).slice(0, 10)} ${r.title.slice(0, 40)} — ${money(r.total)}`).join("\n") : "No records yet.";
    }
    case "/top": {
      const [f, t] = /^\d{4}-\d{2}$/.test(arg) ? monthRange(arg) : monthRange(today.slice(0, 7));
      const rows = await sql`
        select i->>'name' name, sum((i->>'amount')::numeric) t, sum(coalesce((i->>'qty')::numeric,0)) q
        from records, jsonb_array_elements(items) i
        where record_date between ${f} and ${t}
        group by 1 order by t desc limit 10`;
      return rows.length ? "🏆 Top items\n" + rows.map((r: any) => `${r.name} — ${money(r.t)} (qty ${r.q})`).join("\n") : "No data.";
    }
    case "/find": {
      if (!arg) return "Usage: /find keyword";
      const like = `%${arg}%`;
      const rows = await sql`select entry_no, title, total, record_date from records where title ilike ${like} or raw_text ilike ${like} or items::text ilike ${like} order by record_date desc limit 20`;
      return rows.length ? rows.map((r: any) => `#${r.entry_no ?? "-"} ${String(r.record_date).slice(0, 10)} ${r.title.slice(0, 40)} — ${money(r.total)}`).join("\n") : "Nothing found.";
    }
    case "/del": {
      const n = Number(arg);
      if (!n) return "Usage: /del 15";
      const r = await sql`delete from records where entry_no = ${n} returning id`;
      return r.length ? `🗑 Deleted #${n}` : `#${n} not found.`;
    }
    default:
      return "Unknown command. Try /help";
  }
}
