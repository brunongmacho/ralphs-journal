const fs = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────
// Month epigraphs — edit freely as months evolve
const MONTH_EPIGRAPHS = {
  "2026-06": "June began with a question I couldn't answer: Can I survive this?\nIt ended with a different one: What's for lunch?\nI think that's progress."
};

// Week groupings per month
function getDayNum(file) {
  const m = file.match(/Journal_Day(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

const MONTH_WEEKS = {
  "2026-06": [
    { label: "Week One", filter: e => e.file.startsWith("Journal") && getDayNum(e.file) <= 5 },
    { label: "Special Chapters", filter: e => e.file.startsWith("SpecialChapter") },
    { label: "Week Two", filter: e => e.file.startsWith("Journal") && getDayNum(e.file) >= 6 },
  ]
};

// ─── Constants ────────────────────────────────────────────
const FONT = "Georgia, 'Times New Roman', serif";

// ─── Journal Entries ──────────────────────────────────────
const JOURNALS = [
  { file: "Introduction", title: "To My Future Self" },
  { file: "SpecialChapter0", title: "To My Future Someone" },
  { file: "Journal_Day1_2026-06-24", title: "The Day I Started Building Again" },
  { file: "Journal_Day2_2026-06-25", title: "The Day the Wave Came Back" },
  { file: "Journal_Day3.0_2026-06-26", title: "The Day Everything Happened at Once" },
  { file: "Journal_Day3.5_2026-06-26", title: "The Day the Weight Became Lighter" },
  { file: "Journal_Day4.0_2026-06-27", title: "The Morning the Sun Reached Me" },
  { file: "Journal_Day4.5_2026-06-27", title: "The Day Teddybear Came Back" },
  { file: "Journal_Day5.0_2026-06-28", title: "The Morning I Finally Slept" },
  { file: "Journal_Day5.5_2026-06-28", title: "The Day I Opened the Archive" },
  { file: "SpecialChapter1_Elaine", title: "Fifteen Days That Were Never Small", date: "2026-06-28" },
  { file: "SpecialChapter2_Elaine", title: "The Shape of Home", date: "2026-06-28" },
  { file: "SpecialChapter3_Elaine", title: "Tomorrow Started Speaking", date: "2026-06-28" },
  { file: "SpecialChapter4_Elaine", title: "The Little Things I'll Never Forget", date: "2026-06-28" },
  { file: "SpecialChapter5_Elaine", title: "The Silence Between Replies", date: "2026-06-28" },
  { file: "SpecialChapter6_Elaine", title: "The Last Conversation", date: "2026-06-28" },
  { file: "SpecialChapter7_Elaine", title: "Thank You, Elaine", date: "2026-06-28" },
  { file: "Journal_Day6.0_2026-06-29", title: "The Day Everything Is Ordinary" },
  { file: "Journal_Day6.5_2026-06-29", title: "The Day She Answered" },
  { file: "Journal_Day7_2026-06-30", title: "The Day Forward Felt Natural" },
];

// ─── Helpers ──────────────────────────────────────────────
function slug(file) {
  if (file === "Introduction") return "introduction";
  if (file === "SpecialChapter0") return "to-my-future-someone";
  if (file.startsWith("SpecialChapter")) {
    const m = file.match(/SpecialChapter(\d+)/);
    return `special-chapter-${m[1]}`;
  }
  const m = file.match(/Day(\d+(?:\.\d+)?)/);
  return `day-${m[1].replace(".", "-")}`;
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseDate(file) {
  const m = file.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return "";
  const d = new Date(m[0] + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(file) {
  const m = file.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return "";
  const d = new Date(m[0] + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${weekday} • ${date}`;
}

function getMonthKey(file, entry) {
  if (entry && entry.date) {
    const m = entry.date.match(/(\d{4})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  const m = file.match(/(\d{4})-(\d{2})-/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function getMonthLabel(key) {
  const months = { "01":"January","02":"February","03":"March","04":"April","05":"May","06":"June","07":"July","08":"August","09":"September","10":"October","11":"November","12":"December" };
  const parts = key.split("-");
  return `${months[parts[1]] || parts[1]} ${parts[0]}`;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function readingTime(text) {
  const wc = wordCount(text);
  const min = Math.max(1, Math.round(wc / 200));
  return `${min} min read`;
}

function getLabel(file) {
  if (file === "Introduction") return { header: "Introduction", short: "Introduction" };
  if (file === "SpecialChapter0") return { header: "To My Future Someone", short: "to-my-future-someone" };
  if (file.startsWith("SpecialChapter")) {
    const m = file.match(/SpecialChapter(\d+)/);
    const num = m ? m[1] : "";
    return { header: `Special Chapter ${num}`, short: `special-chapter-${num}` };
  }
  const mDecimal = file.match(/Day(\d+)\.(\d+)/);
  if (mDecimal) return { header: `Day ${mDecimal[1]}.${mDecimal[2]}`, short: `day-${mDecimal[1]}-${mDecimal[2]}` };
  const mNum = file.match(/Day(\d+)/);
  if (mNum) return { header: `Day ${mNum[1]}`, short: `day-${mNum[1]}` };
  return { header: "", short: "" };
}

function renderInline(text) {
  const parts = [];
  let remaining = text;
  while (remaining.length > 0) {
    const biMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (biMatch) {
      parts.push({ type: "bi", text: biMatch[1] });
      remaining = remaining.slice(biMatch[0].length);
      continue;
    }
    const bMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (bMatch) {
      parts.push({ type: "b", text: bMatch[1] });
      remaining = remaining.slice(bMatch[0].length);
      continue;
    }
    const iMatch = remaining.match(/^\*(.+?)\*/);
    if (iMatch) {
      parts.push({ type: "i", text: iMatch[1] });
      remaining = remaining.slice(iMatch[0].length);
      continue;
    }
    const next = remaining.search(/\*|$/);
    if (next > 0) {
      parts.push({ type: "text", text: remaining.slice(0, next) });
      remaining = remaining.slice(next);
    } else if (next === 0) {
      parts.push({ type: "text", text: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      if (remaining) parts.push({ type: "text", text: remaining });
      break;
    }
  }
  let result = "";
  for (const part of parts) {
    const escaped = escapeHTML(part.text);
    switch (part.type) {
      case "bi": result += "<strong><em>" + escaped + "</em></strong>"; break;
      case "b": result += "<strong>" + escaped + "</strong>"; break;
      case "i": result += "<em>" + escaped + "</em>"; break;
      default: result += escaped;
    }
  }
  return result;
}

function parseMD(content) {
  const lines = content.split("\n").map(l => l.replace(/\r$/, ""));
  let bodyStart = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      bodyStart = i + 1;
    } else break;
  }
  const bodyLines = lines.slice(bodyStart);
  const paragraphs = [];
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    paragraphs.push(trimmed);
  }
  return paragraphs;
}

// ─── Group entries by month ───────────────────────────────
function groupEntriesByMonth(entries) {
  const groups = {};
  for (const entry of entries) {
    if (entry.file === "Introduction" || entry.file === "SpecialChapter0") continue;
    const key = getMonthKey(entry.file, entry);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

// ─── CSS ──────────────────────────────────────────────────
function generateCSS() {
  return `:root {
  --bg: #faf7f2;
  --body-bg: #f3eee7;
  --text: #2c2c2c;
  --blue: #3a7ca5;
  --border: #e0dbd4;
  --gray: #9a8a7a;
  --dark: #1a1a2e;
  --paper: #faf7f2;
  --hover: #efe8e0;
  --shadow: rgba(0,0,0,0.06);
  --nav-bg: rgba(250, 247, 242, 0.92);
  --nav-border: #e0dbd4;
  --progress: #3a7ca5;
  --blockquote-bg: #f5f0eb;
}

[data-theme="dark"] {
  --bg: #17172b;
  --body-bg: #1a1a30;
  --text: #ddd5cb;
  --blue: #6ba3d6;
  --border: #2d2d48;
  --gray: #7a7a9a;
  --dark: #ddd5cb;
  --paper: #1a1a30;
  --hover: #252540;
  --shadow: rgba(0,0,0,0.2);
  --nav-bg: rgba(23, 23, 43, 0.92);
  --nav-border: #2d2d48;
  --progress: #6ba3d6;
  --blockquote-bg: #22223a;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: ${FONT};
  color: var(--text);
  background: var(--bg);
  line-height: 1.8;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s, color 0.3s;
}

/* ─── Journal Container ─── */
.journal {
  max-width: 660px;
  margin: 0 auto;
  padding: 60px 40px 40px;
  background: var(--body-bg);
  min-height: 100dvh;
  transition: background 0.3s;
}

@media (max-width: 640px) {
  body { background: var(--body-bg); }
  .journal { padding: 40px 24px 24px; box-shadow: none; min-height: auto; }
  .prelude-entry { gap: 12px; }
  .prelude-icon { width: 24px; font-size: 20px; }
  .prelude-title { font-size: 16px; }
  .prelude-caption { font-size: 13px; max-width: 100%; }
  .prelude-sep { margin: 4px 0 20px 0; }
}

@media (max-width: 400px) {
  .journal { padding: 32px 18px 18px; }
  .prelude-entry { gap: 10px; flex-direction: column; }
  .prelude-icon { width: auto; text-align: left; }
}

/* ─── Dark Mode Toggle ─── */
.dark-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--nav-bg);
  backdrop-filter: blur(8px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s;
  color: var(--text);
}

.dark-toggle:hover {
  border-color: var(--blue);
  background: var(--hover);
}

/* ─── Header ─── */
.journal-header {
  text-align: center;
  margin-bottom: 56px;
}

.journal-title {
  font-size: 34px;
  font-weight: bold;
  color: var(--dark);
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.journal-subtitle {
  font-size: 17px;
  color: var(--gray);
  font-style: italic;
  margin-bottom: 6px;
  line-height: 1.5;
}

.journal-desc {
  font-size: 15px;
  color: var(--gray);
  font-style: italic;
  line-height: 1.6;
  margin-bottom: 12px;
}

/* ─── Begin Here ─── */
.prelude-entry {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.prelude-icon {
  width: 28px;
  text-align: center;
  font-size: 24px;
  line-height: 1.4;
  flex-shrink: 0;
  color: var(--gray);
}

.prelude-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prelude-label {
  font-size: 11px;
  color: var(--blue);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: bold;
}

.prelude-title {
  font-size: 18px;
  font-weight: bold;
  color: var(--dark);
  text-decoration: none;
}

.prelude-title:hover {
  color: var(--blue);
}

.prelude-caption {
  font-size: 14px;
  color: var(--gray);
  line-height: 1.5;
  margin: 0;
  max-width: 480px;
}

.prelude-sep {
  text-align: center;
  font-size: 14px;
  color: var(--border);
  margin: 8px 0 28px 0;
}

.begin-link {
  font-size: 18px;
  font-weight: bold;
  color: var(--dark);
  text-decoration: none;
}

.begin-link:hover {
  color: var(--blue);
}



/* ─── Months ─── */
.year-section {
  margin-bottom: 48px;
}

.month-title {
  font-size: 15px;
  font-weight: bold;
  color: var(--blue);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--blue);
}

.month-epigraph {
  font-size: 15px;
  color: var(--gray);
  font-style: italic;
  line-height: 1.7;
  margin-bottom: 32px;
  padding: 0 4px;
  white-space: pre-line;
}

/* ─── Weeks ─── */
.week-section {
  margin-bottom: 28px;
}

.week-section:last-child {
  margin-bottom: 0;
}

.week-label {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
}

.week-section.special .week-label {
  color: var(--blue);
  letter-spacing: 2px;
}

/* ─── Day Groups ─── */
.day-group {
  margin-bottom: 3px;
}

.day-group-date {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--gray);
  margin-bottom: 4px;
  letter-spacing: 0.3px;
  font-style: italic;
}

.day-list {
  list-style: none;
  padding: 0;
}

.day-list li {
  margin-bottom: 1px;
}

.day-list a {
  display: block;
  font-size: 16px;
  color: var(--text);
  text-decoration: none;
  padding: 7px 12px;
  border-left: 3px solid var(--border);
  margin-bottom: 2px;
  transition: border-color 0.2s, color 0.2s;
}

.day-list a:hover {
  border-left-color: var(--blue);
  color: var(--blue);
}

.day-list .entry-label {
  font-family: Georgia, serif;
  font-size: 11px;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-right: 6px;
}

/* ─── Special Chapter List ─── */
.special-list {
  list-style: none;
  padding: 0;
}

.special-list li {
  margin-bottom: 1px;
}

.special-list a {
  display: block;
  font-size: 16px;
  color: var(--text);
  text-decoration: none;
  padding: 7px 12px;
  border-left: 3px solid var(--border);
  margin-bottom: 2px;
  transition: border-color 0.2s, color 0.2s;
}

.special-list a:hover {
  border-left-color: var(--blue);
  color: var(--blue);
}

/* ─── Footer ─── */
.journal-footer {
  max-width: 660px;
  margin: 0 auto;
  padding: 0 40px 60px;
  text-align: center;
}

.journal-footer .footer-line {
  border: none;
  border-top: 1px solid var(--border);
  margin-bottom: 24px;
}

.journal-footer .footer-text {
  font-family: Georgia, serif;
  font-size: 13px;
  color: var(--gray);
  line-height: 1.8;
}

@media (max-width: 640px) {
  .journal-footer {
    padding: 0 24px 48px;
  }
}

/* ─── Floating Navigation ─── */
.float-nav {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  transition: opacity 0.3s, transform 0.3s;
}

.float-nav.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(20px);
}

.float-nav-item {
  font-family: Georgia, serif;
  font-size: 11px;
  color: var(--gray);
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 4px;
  transition: all 0.2s;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.float-nav-item:hover {
  color: var(--blue);
  background: var(--hover);
}

.float-nav-item.active {
  color: var(--blue);
  font-weight: bold;
}

.float-nav-year-toggle {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--gray);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: color 0.2s;
  text-align: left;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.float-nav-year-toggle::before {
  content: "▶";
  font-size: 8px;
  transition: transform 0.2s;
  color: var(--gray);
}

.float-nav-year-toggle.expanded::before {
  transform: rotate(90deg);
}

.float-nav-year-toggle:hover {
  color: var(--blue);
}

.float-nav-year-toggle.active {
  color: var(--blue);
  font-weight: bold;
}

.float-nav-months {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
  display: flex;
  flex-direction: column;
}

.float-nav-months.expanded {
  max-height: 400px;
}

.float-nav-month {
  font-family: Georgia, serif;
  font-size: 10px;
  color: var(--gray);
  text-decoration: none;
  padding: 2px 10px 2px 22px;
  border-radius: 4px;
  transition: all 0.2s;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.float-nav-month:hover {
  color: var(--blue);
  background: var(--hover);
}

.float-nav-month.active {
  color: var(--blue);
  font-weight: bold;
}

.float-nav-divider {
  width: 24px;
  height: 1px;
  background: var(--border);
  margin: 3px 0;
}

.float-nav-hide {
  font-family: Georgia, serif;
  font-size: 10px;
  color: var(--gray);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: color 0.2s;
  margin-top: 4px;
}

.float-nav-hide:hover {
  color: var(--text);
}

.float-nav-mini {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 900;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--nav-bg);
  backdrop-filter: blur(8px);
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text);
  transition: all 0.2s;
}

.float-nav-mini:hover {
  border-color: var(--blue);
  color: var(--blue);
}

.float-nav-mini.visible {
  display: flex;
}

@media (max-width: 900px) {
  .float-nav {
    right: 12px;
  }
}

@media (max-width: 640px) {
  .float-nav {
    position: fixed;
    right: 0;
    top: auto;
    bottom: 0;
    left: 0;
    transform: none;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 12px;
    background: var(--nav-bg);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }

  .float-nav.hidden {
    transform: none;
    opacity: 1;
    pointer-events: auto;
  }

  .float-nav-item {
    font-size: 10px;
    padding: 4px 8px;
  }

  .float-nav-divider {
    width: 16px;
    height: 1px;
  }

  .float-nav-year-toggle {
    font-size: 11px;
    padding: 6px 8px;
    width: auto;
    display: inline-flex;
  }

  .float-nav-year-toggle::before {
    content: "▶";
    font-size: 7px;
  }

  .float-nav-months {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 3px;
    width: 100%;
    justify-content: center;
    order: 1;
  }

  .float-nav-month {
    padding: 3px 8px;
    font-size: 10px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }

  .float-nav-hide {
    display: none;
  }

  .float-nav-mini {
    display: none !important;
  }
}

/* ─── Entry Page Styles ─── */
.entry-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 48px 40px 40px;
  background: var(--body-bg);
  min-height: 100dvh;
  position: relative;
  transition: background 0.3s;
}

@media (max-width: 640px) {
  .entry-page { padding: 32px 24px; }
}

@media (max-width: 400px) {
  .entry-page { padding: 24px 18px; }
}

/* Reading Progress Bar */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--progress);
  z-index: 999;
  width: 0%;
  transition: width 0.1s linear;
}

/* Entry Header */
.entry-back {
  display: inline-block;
  font-family: Georgia, serif;
  font-size: 13px;
  color: var(--gray);
  text-decoration: none;
  margin-bottom: 40px;
  transition: color 0.2s;
}

.entry-back:hover {
  color: var(--blue);
}

.entry-header {
  text-align: center;
  margin-bottom: 8px;
}

.entry-date {
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  margin-bottom: 8px;
}

.entry-meta {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--gray);
  margin-bottom: 16px;
}

.entry-page-header {
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--gray);
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 48px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.entry-title {
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  color: var(--dark);
  margin-bottom: 22px;
  line-height: 1.3;
}

.chapter-title {
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  color: var(--dark);
  margin-bottom: 0;
  line-height: 1.3;
}

.date-line {
  text-align: center;
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--gray);
  font-style: italic;
  margin-bottom: 6px;
}

.decorative-line {
  text-align: center;
  font-size: 14px;
  color: #c5c0b8;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--blue);
  margin-bottom: 28px;
}

.decorative-line.closing {
  padding-top: 48px;
  padding-bottom: 16px;
  border-bottom: none;
  border-top: 2px solid var(--blue);
  margin-top: 48px;
  margin-bottom: 0;
}

.divider {
  text-align: center;
  font-size: 16px;
  color: var(--blue);
  margin: 32px 0;
}

.section-heading {
  font-size: 22px;
  font-weight: bold;
  color: var(--blue);
  margin: 32px 0 16px;
}

.section-subheading {
  font-size: 18px;
  font-weight: bold;
  color: var(--blue);
  margin: 28px 0 14px;
}

.entry-content p {
  font-size: 17px;
  line-height: 1.9;
  text-align: justify;
  margin-bottom: 20px;
}

.entry-content p:last-child {
  margin-bottom: 0;
}

.entry-content strong {
  font-weight: bold;
  color: var(--dark);
}

.entry-content em {
  font-style: italic;
}

/* Page Footer */
.page-footer {
  font-family: Georgia, serif;
  font-size: 12px;
  color: var(--gray);
  text-align: center;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid var(--border);
}

/* Entry Nav */
.entry-nav {
  max-width: 700px;
  margin: 0 auto 60px;
  padding: 24px 40px;
}

.entry-nav-links {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 8px;
}

.entry-nav-prev, .entry-nav-next {
  font-family: Georgia, serif;
  font-size: 16px;
  color: var(--text);
  text-decoration: none;
  max-width: 40%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.2s;
  flex: 1;
  text-align: left;
}

.entry-nav-next {
  text-align: right;
}

.entry-nav-prev:hover, .entry-nav-next:hover {
  border-color: var(--blue);
  background: var(--hover);
  color: var(--blue);
}

.entry-nav-toc {
  font-family: Georgia, serif;
  font-size: 14px;
  color: var(--gray);
  text-decoration: none;
  flex-shrink: 0;
  padding: 12px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: all 0.2s;
  text-align: center;
}

.entry-nav-toc:hover {
  color: var(--blue);
  border-color: var(--blue);
  background: var(--hover);
}

@media (max-width: 640px) {
  .entry-nav { padding: 16px 24px 48px; margin: 0; }
  .entry-nav-links { flex-direction: column; gap: 6px; }
  .entry-nav-prev, .entry-nav-next { max-width: 100%; font-size: 15px; padding: 10px 14px; text-align: center; }
  .entry-nav-toc { font-size: 13px; padding: 10px 14px; order: -1; }
  .entry-title, .chapter-title { font-size: 22px; }
  .entry-content p { font-size: 16px; line-height: 1.7; margin-bottom: 14px; }
}
`;
}

// ─── Index Page ──────────────────────────────────────────
function generateIndex(entries) {
  const introEntry = entries.find(e => e.file === "Introduction");
  const byMonth = groupEntriesByMonth(entries);
  const monthKeys = Object.keys(byMonth).sort();

  // Get unique years
  const years = [...new Set(monthKeys.map(k => k.split("-")[0]))].sort();

  // Build floating nav items — years with expandable months
  let navItems = `<a href="#top" class="float-nav-item">Top</a>\n`;
  for (const year of years) {
    const yearMonths = monthKeys.filter(k => k.startsWith(year));
    navItems += `    <div class="float-nav-divider"></div>\n`;
    navItems += `    <button class="float-nav-year-toggle" data-year="${year}" aria-label="Toggle ${year} months">${year.slice(2)}</button>\n`;
    navItems += `    <div class="float-nav-months" id="months-${year}">\n`;
    for (const key of yearMonths) {
      const label = getMonthLabel(key).split(" ")[0].substring(0,3).toUpperCase();
      navItems += `      <a href="#month-${key}" class="float-nav-month">${label}</a>\n`;
    }
    navItems += `    </div>\n`;
  }

  // Build year and month sections
  let body = "";
  for (const year of years) {
    const yearMonths = monthKeys.filter(k => k.startsWith(year));
    body += `<section class="year-section" id="year-${year}">\n`;
    for (const key of yearMonths) {
      const label = getMonthLabel(key);
      const epigraph = MONTH_EPIGRAPHS[key] || "";
      const weeks = MONTH_WEEKS[key] || [];

      body += `  <h2 class="month-title" id="month-${key}">${label}</h2>\n`;
      if (epigraph) {
        body += `    <blockquote class="month-epigraph">${escapeHTML(epigraph)}</blockquote>\n`;
      }

      for (const week of weeks) {
        const weekEntries = byMonth[key].filter(week.filter);
        if (weekEntries.length === 0) continue;

      body += `  <div class="week-section${week.label === "Special Chapters" ? " special" : ""}">\n`;
      body += `    <p class="week-label">${escapeHTML(week.label)}</p>\n`;

      if (week.label === "Special Chapters") {
        body += `    <ul class="special-list">\n`;
        for (const entry of weekEntries) {
          const s = slug(entry.file);
          body += `      <li><a href="${s}.html">${escapeHTML(entry.title)}</a></li>\n`;
        }
        body += `    </ul>\n`;
      } else {
        let currentDate = "";
        for (const entry of weekEntries) {
          const dateLabel = formatDateShort(entry.file);
          if (dateLabel !== currentDate) {
            if (currentDate !== "") body += `      </ul>\n    </div>\n`;
            body += `    <div class="day-group">\n      <p class="day-group-date">${dateLabel}</p>\n      <ul class="day-list">`;
            currentDate = dateLabel;
          }
          const s = slug(entry.file);
          const label = getLabel(entry.file);
          body += `\n        <li><a href="${s}.html"><span class="entry-label">${escapeHTML(label.header)}</span>${escapeHTML(entry.title)}</a></li>`;
        }
        if (currentDate !== "") body += `\n      </ul>\n    </div>\n`;
      }

      body += `  </div>\n`;
    }
  }

  body += `</section>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ralph's Journal</title>
  <script>(function(){try{var t=localStorage.getItem('journal-theme');if(t!=='light'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();</script>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <button class="dark-toggle" id="darkToggle" aria-label="Toggle dark mode">&#9728;&#65039;</button>

  <nav class="float-nav" id="floatNav">
    ${navItems}
    <div class="float-nav-divider"></div>
    <button class="float-nav-hide" id="floatNavHide">Hide</button>
  </nav>
  <button class="float-nav-mini" id="floatNavMini">&#9776;</button>

  <div class="journal" id="top">
    <header class="journal-header">
      <h1 class="journal-title">Ralph's Journal</h1>
      <p class="journal-subtitle">Just Enjoying Ordinary Days</p>
      <p class="journal-desc">Where ordinary days slowly became enough.</p>
    </header>

    <div class="prelude-entry">
      <span class="prelude-icon">&#128214;</span>
      <div class="prelude-content">
        <span class="prelude-label">Begin Here</span>
        <a href="introduction.html" class="prelude-title">${escapeHTML(introEntry.title)}</a>
        <p class="prelude-caption">The first promise I made to myself&mdash;the reason this journal exists.</p>
      </div>
    </div>

    <div class="prelude-sep">&#10022;</div>

    <div class="prelude-entry">
      <span class="prelude-icon">&#10022;</span>
      <div class="prelude-content">
        <span class="prelude-label">Before the Story Began</span>
        <a href="to-my-future-someone.html" class="prelude-title">To My Future Someone</a>
        <p class="prelude-caption">Written for someone I hadn't met yet, but already hoped would understand where I came from.</p>
      </div>
    </div>

    ${body}
  </div>

  <footer class="journal-footer">
    <hr class="footer-line">
    <p class="footer-text">This journal began as somewhere to put the weight I was carrying.</p>
    <p class="footer-text">If parts of it felt familiar, I hope you find your way home too.</p>
    <p style="margin-top: 12px;" class="footer-text">&mdash; Ralph</p>
  </footer>

  <script>
    // ─── Dark Mode ───
    (function() {
      const toggle = document.getElementById('darkToggle');
      const saved = localStorage.getItem('journal-theme');
      if (saved !== 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '\u2600\uFE0F';
      }
      toggle.addEventListener('click', function() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('journal-theme', 'light');
          toggle.textContent = '\uD83C\uDF19';
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('journal-theme', 'dark');
          toggle.textContent = '\u2600\uFE0F';
        }
      });
    })();

    // ─── Floating Nav ───
    (function() {
      var nav = document.getElementById('floatNav');
      var mini = document.getElementById('floatNavMini');
      var hideBtn = document.getElementById('floatNavHide');

      hideBtn.addEventListener('click', function() {
        nav.classList.add('hidden');
        mini.classList.add('visible');
      });

      mini.addEventListener('click', function() {
        nav.classList.remove('hidden');
        mini.classList.remove('visible');
      });

      // Year toggle — accordion: manual click toggles; auto-expand handled by Observer
      var toggles = document.querySelectorAll('.float-nav-year-toggle');
      toggles.forEach(function(toggle) {
        var year = toggle.getAttribute('data-year');
        var months = document.getElementById('months-' + year);
        toggle.addEventListener('click', function() {
          var isCurrentlyExpanded = toggle.classList.contains('expanded');
          // Collapse all years
          toggles.forEach(function(t) { t.classList.remove('expanded'); });
          var allMonths = document.querySelectorAll('.float-nav-months');
          allMonths.forEach(function(m) { m.classList.remove('expanded'); });
          // Expand only the clicked one if it was collapsed
          if (!isCurrentlyExpanded) {
            toggle.classList.add('expanded');
            if (months) months.classList.add('expanded');
          }
        });
      });

      // Scroll-based active year + month — reliable, no observer timing issues
      var yearSections = document.querySelectorAll('.year-section');
      var monthHeadings = document.querySelectorAll('[id^="month-"]');
      var navItems = document.querySelectorAll('.float-nav-item');
      var yearToggles = document.querySelectorAll('.float-nav-year-toggle');
      var monthLinks = document.querySelectorAll('.float-nav-month');

      function updateNavSpy() {
        // Find closest month heading to viewport top
        if (monthHeadings.length > 0 && monthLinks.length > 0) {
          var bestMonth = null;
          var bestDist = Infinity;
          for (var i = 0; i < monthHeadings.length; i++) {
            var h = monthHeadings[i];
            var rect = h.getBoundingClientRect();
            var dist = Math.abs(rect.top);
            if (dist < bestDist) {
              bestDist = dist;
              bestMonth = h;
            }
          }
          if (bestMonth) {
            var targetHref = '#' + bestMonth.id;
            monthLinks.forEach(function(link) {
              link.classList.toggle('active', link.getAttribute('href') === targetHref);
            });
          }
        }

        // Find closest year section to viewport top → auto-expand + highlight
        if (yearSections.length > 0) {
          var bestYearSection = null;
          var bestYearDist = Infinity;
          for (var i = 0; i < yearSections.length; i++) {
            var s = yearSections[i];
            var rect = s.getBoundingClientRect();
            var dist = Math.abs(rect.top);
            if (dist < bestYearDist) {
              bestYearDist = dist;
              bestYearSection = s;
            }
          }
          if (bestYearSection) {
            var id = bestYearSection.id;
            navItems.forEach(function(item) {
              item.classList.toggle('active', item.getAttribute('href') === '#' + id);
            });
            var activeYear = id.replace('year-', '');
            yearToggles.forEach(function(t) {
              var isActiveYear = t.getAttribute('data-year') === activeYear;
              t.classList.toggle('active', isActiveYear);
              var monthsEl = document.getElementById('months-' + t.getAttribute('data-year'));
              if (isActiveYear) {
                t.classList.add('expanded');
                if (monthsEl) monthsEl.classList.add('expanded');
              } else {
                t.classList.remove('expanded');
                if (monthsEl) monthsEl.classList.remove('expanded');
              }
            });
          }
        }
      }
      window.addEventListener('scroll', updateNavSpy);
      updateNavSpy();
    })();
  </script>
</body>
</html>`;
}

// ─── Entry Page ──────────────────────────────────────────
function renderEntryPage(paragraphs, entry, isSpecial, prevEntry, nextEntry) {
  const { header: label } = getLabel(entry.file);
  const dateLabel = parseDate(entry.file);
  const headerText = entry.file === "Introduction" || entry.file === "SpecialChapter0" ? entry.title : `Ralph's Journal — ${label}`;
  const allText = paragraphs.join(" ");
  const readTime = readingTime(allText);

  let body = "";

  body += `<div class="entry-page-header">${headerText}</div>\n`;

  if (!isSpecial && dateLabel) {
    body += `  <p class="entry-date">${escapeHTML(dateLabel)}</p>\n`;
  }

  body += `  <p class="entry-meta">${readTime}</p>\n`;

  const firstPara = paragraphs[0] || "";
  if (isSpecial && firstPara === entry.title) {
    body += `  <h1 class="chapter-title">${escapeHTML(firstPara)}</h1>\n`;
    paragraphs.shift();
  } else if (!isSpecial) {
    body += `  <h1 class="entry-title">${escapeHTML(entry.title)}</h1>\n`;
  }

  let starCount = 0;
  let inHeader = !isSpecial;
  let skippedOpening = false;

  for (const para of paragraphs) {
    if (!isSpecial && !skippedOpening && (para === "---" || para === "₊‧.°.⋆•")) {
      body += `  <div class="divider">&#10022;</div>\n`;
      skippedOpening = true;
      continue;
    }
    if (!isSpecial && para === "₊‧.°.⋆•") continue;
    if (para === "---") {
      body += `  <div class="divider">&#10022;</div>\n`;
      continue;
    }
    if (para === "✦") {
      body += `  <div class="divider">&#10022;</div>\n`;
      continue;
    }
    if (para === "₊‧.°.⋆•") {
      starCount++;
      const cls = starCount > 1 ? "decorative-line closing" : "decorative-line";
      body += `  <div class="${cls}">&#8346;&#183;.&#176;.&#9734;&bull;</div>\n`;
      continue;
    }
    if (para === "★") {
      body += `  <div class="divider">&#9733;</div>\n`;
      continue;
    }
    if (para.startsWith("## ")) {
      body += `  <h2 class="section-heading">${escapeHTML(para.replace(/^##\s*/, ""))}</h2>\n`;
      continue;
    }
    if (para.startsWith("### ")) {
      body += `  <h3 class="section-subheading">${escapeHTML(para.replace(/^###\s*/, ""))}</h3>\n`;
      continue;
    }
    body += `  <p>${renderInline(para)}</p>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(entry.title)} — Ralph's Journal</title>
  <script>(function(){try{var t=localStorage.getItem('journal-theme');if(t!=='light'){document.documentElement.setAttribute('data-theme','dark')}}catch(e){document.documentElement.setAttribute('data-theme','dark')}})();</script>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="reading-progress" id="readingProgress"></div>

  <button class="dark-toggle" id="darkToggle" aria-label="Toggle dark mode">&#9728;&#65039;</button>

  <div class="entry-page">
    <a href="index.html" class="entry-back">&larr; Back to Journal</a>
    <div class="entry-content">
${body}
    </div>
    <div class="page-footer">Ralph's Journal</div>
  </div>

  <nav class="entry-nav">
    <div class="entry-nav-links">
      ${prevEntry ? `<a href="${slug(prevEntry.file)}.html" class="entry-nav-prev">&larr; ${escapeHTML(prevEntry.title)}</a>` : `<span></span>`}
      <a href="index.html" class="entry-nav-toc">&larr; Back to Journal</a>
      ${nextEntry ? `<a href="${slug(nextEntry.file)}.html" class="entry-nav-next">${escapeHTML(nextEntry.title)} &rarr;</a>` : `<span></span>`}
    </div>
  </nav>

  <script>
    // ─── Dark Mode ───
    (function() {
      const toggle = document.getElementById('darkToggle');
      const saved = localStorage.getItem('journal-theme');
      if (saved !== 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '\u2600\uFE0F';
      }
      toggle.addEventListener('click', function() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('journal-theme', 'light');
          toggle.textContent = '\uD83C\uDF19';
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('journal-theme', 'dark');
          toggle.textContent = '\u2600\uFE0F';
        }
      });
    })();

    // ─── Reading Progress ───
    (function() {
      const bar = document.getElementById('readingProgress');
      if (bar) {
        window.addEventListener('scroll', function() {
          const scrollTop = window.scrollY;
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const progress = Math.min(scrollTop / docHeight * 100, 100);
            bar.style.width = progress + '%';
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  const outDir = path.join(__dirname, "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // Write CSS
  fs.writeFileSync(path.join(outDir, "styles.css"), generateCSS());
  console.log("✓ styles.css");

  // Generate index
  const indexHTML = generateIndex(JOURNALS);
  fs.writeFileSync(path.join(outDir, "index.html"), indexHTML);
  console.log("✓ index.html");

  // Generate each journal page
  for (let i = 0; i < JOURNALS.length; i++) {
    const entry = JOURNALS[i];
    const mdPath = path.join(__dirname, `${entry.file}.md`);
    if (!fs.existsSync(mdPath)) {
      console.log(`  ✗ ${entry.file}.md not found, skipping`);
      continue;
    }
    const prevEntry = i > 0 ? JOURNALS[i - 1] : null;
    const nextEntry = i < JOURNALS.length - 1 ? JOURNALS[i + 1] : null;
    const content = fs.readFileSync(mdPath, "utf-8");
    const paragraphs = parseMD(content);
    const isSpecial = entry.file.startsWith("SpecialChapter") && entry.file !== "SpecialChapter0";
    const html = renderEntryPage(paragraphs, entry, isSpecial, prevEntry, nextEntry);
    const s = slug(entry.file);
    fs.writeFileSync(path.join(outDir, `${s}.html`), html);
    console.log(`✓ ${s}.html`);
  }

  console.log("\nWebsite generated in docs/");
}

main().catch(console.error);
