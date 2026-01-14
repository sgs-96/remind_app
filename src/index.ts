import axios from "axios";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

type Event = {
  title: string;
  deadline: string; // YYYY-MM-DD
  notifyDaysBefore: number[];
};

async function sendDiscordNotification(message: string) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) throw new Error("DISCORD_WEBHOOK_URL is not set.");

  await axios.post(url, { content: message });
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (toDateOnly(to).getTime() - toDateOnly(from).getTime()) / msPerDay
  );
}

function loadEvents(): Event[] {
  const filePath = path.join(process.cwd(), "events.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const events = JSON.parse(raw) as Event[];

  // 最低限のバリデーション（雑でOK）
  for (const e of events) {
    if (!e.title || !e.deadline || !Array.isArray(e.notifyDaysBefore)) {
      throw new Error("events.json format is invalid.");
    }
  }
  return events;
}

async function main() {
  const events = loadEvents();
  const today = new Date();

  for (const event of events) {
    const deadline = new Date(event.deadline + "T00:00:00");
    const daysLeft = diffDays(today, deadline);

    console.log(`${event.title} : 残り ${daysLeft} 日`);

    if (event.notifyDaysBefore.includes(daysLeft)) {
      await sendDiscordNotification(
        `【リマインド】${event.title}\n期限まで残り ${daysLeft} 日です。`
      );
      console.log("→ 通知送信");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
