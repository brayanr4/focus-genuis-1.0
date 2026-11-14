// Export a plan as a calendar file (.ics) or Markdown.

const pad = (n) => String(n).padStart(2, "0");
const icsDate = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const escape = (s = "") => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Builds an .ics with one event per session, starting at startHour each day with 10 min breaks. */
export function planToIcs(plan, { startDate = new Date(), startHour = 9 } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FocusGenius//Study Plan//EN", "CALSCALE:GREGORIAN"];
  const stamp = icsDate(new Date());
  plan.days.forEach((day, i) => {
    const cursor = new Date(startDate);
    cursor.setDate(cursor.getDate() + i);
    cursor.setHours(startHour, 0, 0, 0);
    day.sessions.forEach((s) => {
      const end = new Date(cursor.getTime() + s.minutes * 60000);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${s.id}@focusgenius`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(cursor)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${escape(`${s.title}`)}`,
        `DESCRIPTION:${escape(`Day ${day.day}: ${day.theme}\nGoal: ${s.objective}`)}`,
        "END:VEVENT"
      );
      cursor.setTime(end.getTime() + 10 * 60000);
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function planToMarkdown(plan) {
  const out = [`# ${plan.title}`, "", plan.summary, "", `Topics: ${plan.topics.join(", ")}  `, `${plan.dailyHours}h a day for ${plan.duration} days`, ""];
  for (const day of plan.days) {
    out.push(`## Day ${day.day}: ${day.theme}`, "");
    for (const s of day.sessions) out.push(`- [${s.done ? "x" : " "}] **${s.title}** (${s.minutes} min): ${s.objective}`);
    if (day.tip) out.push("", `> ${day.tip}`);
    out.push("");
  }
  return out.join("\n");
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
