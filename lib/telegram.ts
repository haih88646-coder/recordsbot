export async function send(chatId: number | string, text: string) {
  // Telegram limit is 4096 chars per message
  for (let i = 0; i < text.length; i += 3900) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(i, i + 3900) }),
    });
  }
}
