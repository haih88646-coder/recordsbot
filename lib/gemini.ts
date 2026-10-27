const SYSTEM = `You convert messy shop/office expense notes into structured records.
Input may contain several entries (usually one per line, starting with a number like "14-" or "18_").
Rules:
- Dates are DD-MM-YY (e.g. 12-10-26 = 2026-10-12). Output ISO YYYY-MM-DD.
- "entry_no" is the leading number of the entry (null if none).
- "total" is the stated total (after "total:" or the final $ amount). If none, sum the items.
- "items": split every purchased thing. qty x unit_price = amount. Formats like "5 X$5.5=27.5", "10X3.3=33", "2x9.9=19.2", ":$26.4" all mean qty / unit_price / amount.
  If an item has only an amount, set qty=1 and unit_price=amount. Keep specs (e.g. "50x30", "136a") in "spec".
  If an entry has no breakdown (e.g. a repair), make ONE item with the description and amount = total.
- category: one of Repair (fixing/servicing), Supplies (labels, ink, toner, ribbon, paper...), Purchase (equipment/accessories like mouse), Other.
- Copy numbers exactly as written, do NOT correct them. Never invent data.
- Currency is USD unless stated otherwise.
Reply with ONLY a JSON object in exactly this shape:
{"records":[{"entry_no":14,"title":"Mouse logitech B100, label","category":"Purchase","record_date":"2026-10-12","total":60.5,"currency":"USD","note":null,"items":[{"name":"Mouse logitech B100","spec":null,"qty":5,"unit_price":5.5,"amount":27.5}]}]}`;

export type Rec = {
  entry_no: number | null; title: string; category: string; record_date: string;
  total: number; currency?: string; note?: string | null;
  items: { name: string; spec?: string | null; qty: number; unit_price: number; amount: number }[];
  warnings: string[];
};

export async function parseRecords(text: string): Promise<Rec[]> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const data = await res.json();
  const recs: Rec[] = JSON.parse(data.choices?.[0]?.message?.content || "{}").records || [];
  return recs.map(validate);
}

// Math checks done in code (more reliable than the AI)
function validate(r: Rec): Rec {
  const w: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 0.011;
  r.items = r.items || [];
  let sum = 0;
  for (const it of r.items) {
    sum += it.amount;
    if (it.qty && it.unit_price && !near(it.qty * it.unit_price, it.amount))
      w.push(`"${it.name}": ${it.qty} x ${it.unit_price} = ${(it.qty * it.unit_price).toFixed(2)}, but you wrote ${it.amount}`);
  }
  if (r.items.length && !near(sum, r.total))
    w.push(`Items add up to ${sum.toFixed(2)}, but total is ${r.total}`);
  return { ...r, warnings: w };
}
