# Records Bot (Telegram + Gemini + Neon + Vercel) – all free tiers

## 1. Telegram bot
Chat with @BotFather → /newbot → copy the token (TELEGRAM_BOT_TOKEN).

## 2. Gemini key
https://aistudio.google.com/apikey → Create key (free tier) → GEMINI_API_KEY.

## 3. Database (Neon, free)
Vercel dashboard → Storage / Marketplace → Neon → create (or neon.tech directly).
Open the SQL editor, paste `schema.sql`, run. Copy the connection string → DATABASE_URL.

## 4. Deploy
Push this folder to a GitHub repo → vercel.com → Add New Project → import → add every variable from `.env.example` → Deploy.
(Leave ALLOWED_CHAT_ID empty for now.)

## 5. Connect Telegram to Vercel
Replace the 3 values and open in terminal:
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"

## 6. Lock it to you
Send any message to the bot → it replies with your chat id → put it in ALLOWED_CHAT_ID on Vercel → Redeploy.

## Use
Send records as text. Commands: /help /today /week /month /year /last /top /find /del
Dashboard: https://<your-app>.vercel.app (any username, password = DASHBOARD_PASSWORD)
