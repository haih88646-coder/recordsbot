import { sql, money, todayStr } from "@/lib/db";
export const dynamic = "force-dynamic";

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px #0001" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ym = todayStr().slice(0, 7);
  const [month] = await sql`select count(*)::int c, coalesce(sum(total),0) t from records where to_char(record_date,'YYYY-MM') = ${ym}`;
  const [all] = await sql`select count(*)::int c, coalesce(sum(total),0) t from records`;
  const months = await sql`select to_char(record_date,'YYYY-MM') m, sum(total) t from records group by 1 order by 1 desc limit 12`;
  const cats = await sql`select category, sum(total) t from records where to_char(record_date,'YYYY-MM') = ${ym} group by 1 order by 2 desc`;
  const like = `%${q || ""}%`;
  const rows = await sql`select * from records where title ilike ${like} or items::text ilike ${like} order by record_date desc, id desc limit 100`;
  const maxM = Math.max(1, ...months.map((x: any) => Number(x.t)));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <h1>📒 Records Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <div style={card}><small>This month ({ym})</small><h2>{money(month.t)}</h2>{month.c} records</div>
        <div style={card}><small>All time</small><h2>{money(all.t)}</h2>{all.c} records</div>
        <div style={card}><small>This month by category</small>
          {cats.map((c: any) => <div key={c.category}>{c.category}: <b>{money(c.t)}</b></div>)}
        </div>
      </div>

      <div style={{ ...card, marginTop: 12 }}>
        <b>Monthly spending</b>
        {months.map((m: any) => (
          <div key={m.m} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
            <span style={{ width: 70 }}>{m.m}</span>
            <div style={{ background: "#3b82f6", height: 16, borderRadius: 4, width: `${(Number(m.t) / maxM) * 70}%` }} />
            <span>{money(m.t)}</span>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 12, overflowX: "auto" }}>
        <form style={{ marginBottom: 10 }}>
          <input name="q" defaultValue={q} placeholder="Search…" style={{ padding: 8, width: 240 }} />
        </form>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
            <th>#</th><th>Date</th><th>Title</th><th>Category</th><th>Items</th><th style={{ textAlign: "right" }}>Total</th>
          </tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                <td>{r.entry_no}</td>
                <td>{String(r.record_date).slice(0, 10)}</td>
                <td>{r.title} {r.warnings?.length ? <span title={r.warnings.join("\n")}>⚠️</span> : null}</td>
                <td>{r.category}</td>
                <td>{r.items.map((i: any, k: number) => <div key={k}>{i.name} {i.spec} · {i.qty}×{i.unit_price}={i.amount}</div>)}</td>
                <td style={{ textAlign: "right" }}><b>{money(r.total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
