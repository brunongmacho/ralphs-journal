const fs = require("fs");
const path = require("path");

const FONT = "Georgia, 'Times New Roman', serif";
const BLUE = "#2E75B6";
const DARK = "#1A1A2E";
const GRAY = "#999999";
const BODY = "#333333";

const JOURNALS = [
  { file: "Introduction", title: "To My Future Self" },
  { file: "Journal_Day1_2026-06-24", title: "The Day I Started Building Again" },
  { file: "Journal_Day2_2026-06-25", title: "The Day the Wave Came Back" },
  { file: "Journal_Day3.0_2026-06-26", title: "The Day Everything Happened at Once" },
  { file: "Journal_Day3.5_2026-06-26", title: "The Day the Weight Became Lighter" },
  { file: "Journal_Day4.0_2026-06-27", title: "The Morning the Sun Reached Me" },
  { file: "Journal_Day4.5_2026-06-27", title: "The Day Teddybear Came Back" },
  { file: "Journal_Day5.0_2026-06-28", title: "The Morning I Finally Slept" },
  { file: "Journal_Day5.5_2026-06-28", title: "The Day I Opened the Archive" },
  { file: "SpecialChapter1_Elaine", title: "Fifteen Days That Were Never Small" },
  { file: "SpecialChapter2_Elaine", title: "The Shape of Home" },
  { file: "SpecialChapter3_Elaine", title: "Tomorrow Started Speaking" },
  { file: "SpecialChapter4_Elaine", title: "The Little Things I'll Never Forget" },
  { file: "SpecialChapter5_Elaine", title: "The Silence Between Replies" },
  { file: "SpecialChapter6_Elaine", title: "The Last Conversation" },
  { file: "SpecialChapter7_Elaine", title: "Thank You, Elaine" },
];

function parseDate(file) {
  const m = file.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return "";
  const d = new Date(m[0] + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getLabel(file) {
  if (file === "Introduction") return { header: "Introduction", short: "Introduction" };
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

function slug(file) {
  if (file === "Introduction") return "introduction";
  if (file.startsWith("SpecialChapter")) {
    const m = file.match(/SpecialChapter(\d+)/);
    return `special-chapter-${m[1]}`;
  }
  const m = file.match(/Day(\d+(?:\.\d+)?)/);
  return `day-${m[1].replace(".", "-")}`;
}

function parseMD(content) {
  const lines = content.split("\n").map(l => l.replace(/\r$/, ""));
  let bodyStart = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].startsWith("# ") || lines[i].startsWith("## ") || lines[i].startsWith("### ")) {
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

function renderHTML(paragraphs, entry, isSpecial) {
  const { header: label } = getLabel(entry.file);
  const dateLabel = parseDate(entry.file);
  const headerText = entry.file === "Introduction" ? "Introduction" : `Ralph's Journal — ${label}`;

  let body = "";

  // Decorative top line
  body += `<div class="page-header">${headerText}</div>\n`;

  if (!isSpecial && dateLabel) {
    body += `  <p class="date-line">${escapeHTML(dateLabel)}</p>\n`;
  }

  // Check if first paragraph is the subtitle
  const firstPara = paragraphs[0] || "";
  if (isSpecial && firstPara === entry.title) {
    body += `  <h1 class="chapter-title">${escapeHTML(firstPara)}</h1>\n`;
    paragraphs.shift();
  } else if (!isSpecial) {
    body += `  <h1 class="entry-title">${escapeHTML(entry.title)}</h1>\n`;
  }

  let starCount = 0;

  for (const para of paragraphs) {
    if (para === "---") {
      body += `  <div class="divider">✦</div>\n`;
      continue;
    }
    if (para === "✦") {
      body += `  <div class="divider">✦</div>\n`;
      continue;
    }
    if (para === "₊‧.°.⋆•") {
      starCount++;
      const cls = starCount > 1 ? "decorative-line closing" : "decorative-line";
      body += `  <div class="${cls}">₊‧.°.⋆•</div>\n`;
      continue;
    }
    if (para === "★") {
      body += `  <div class="divider">★</div>\n`;
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
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="page">
    <div class="content">
${body}
    </div>
    <div class="page-footer">Ralph's Journal — Page 1</div>
  </div>
  <nav class="nav-bar">
    <a href="index.html">← Back to Table of Contents</a>
  </nav>
</body>
</html>`;
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function generateCSS() {
  return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${FONT};
  color: ${BODY};
  background: #f5f3ef;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 60px 40px;
  background: #fff;
  min-height: 100vh;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
}

.page-header {
  font-family: Arial, sans-serif;
  font-size: 13px;
  color: ${GRAY};
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #ddd;
  margin-bottom: 48px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.date-line {
  text-align: center;
  font-family: Arial, sans-serif;
  font-size: 13px;
  color: ${GRAY};
  font-style: italic;
  margin-bottom: 6px;
}

.entry-title {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  color: ${DARK};
  margin-bottom: 22px;
  line-height: 1.3;
}

.chapter-title {
  text-align: center;
  font-size: 28px;
  font-weight: bold;
  color: ${DARK};
  margin-bottom: 0;
  line-height: 1.3;
}

.decorative-line {
  text-align: center;
  font-size: 14px;
  color: #ccc;
  padding-bottom: 16px;
  border-bottom: 2px solid ${BLUE};
  margin-bottom: 28px;
}

.decorative-line.closing {
  padding-top: 48px;
  padding-bottom: 16px;
  border-bottom: none;
  border-top: 2px solid ${BLUE};
  margin-top: 48px;
  margin-bottom: 0;
}

.divider {
  text-align: center;
  font-size: 16px;
  color: ${BLUE};
  margin: 32px 0;
}

.section-heading {
  font-size: 22px;
  font-weight: bold;
  color: ${BLUE};
  margin: 32px 0 16px;
}

.section-subheading {
  font-size: 18px;
  font-weight: bold;
  color: ${BLUE};
  margin: 28px 0 14px;
}

.content p {
  font-size: 16px;
  line-height: 1.8;
  text-align: justify;
  margin-bottom: 18px;
}

.content p:last-child {
  margin-bottom: 0;
}

.content strong {
  font-weight: bold;
  color: ${DARK};
}

.content em {
  font-style: italic;
}

.page-footer {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: ${GRAY};
  text-align: center;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid #ddd;
}

.nav-bar {
  max-width: 700px;
  margin: 0 auto 60px;
  padding: 20px 40px;
  text-align: center;
}

.nav-bar a {
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: ${BLUE};
  text-decoration: none;
}

.nav-bar a:hover {
  text-decoration: underline;
}

/* Index page */
.index-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 60px 40px;
  background: #fff;
  min-height: 100vh;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
}

.index-title {
  text-align: center;
  font-size: 32px;
  font-weight: bold;
  color: ${DARK};
  margin-bottom: 8px;
}

.index-subtitle {
  text-align: center;
  font-size: 16px;
  color: ${GRAY};
  font-style: italic;
  margin-bottom: 40px;
  line-height: 1.5;
}

.index-section-title {
  font-size: 18px;
  font-weight: bold;
  color: ${BLUE};
  margin: 36px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.index-list {
  list-style: none;
  padding: 0;
}

.index-list li {
  margin-bottom: 6px;
}

.index-list a {
  font-family: Georgia, serif;
  font-size: 16px;
  color: ${BODY};
  text-decoration: none;
  display: block;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  transition: color 0.2s;
}

.index-list a:hover {
  color: ${BLUE};
}

.index-list .entry-date {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: ${GRAY};
  margin-left: 8px;
}

@media (max-width: 740px) {
  .page, .index-page {
    padding: 40px 24px;
  }
  .nav-bar {
    padding: 20px 24px;
  }
  .entry-title, .chapter-title {
    font-size: 24px;
  }
}
`;
}

function generateIndex(entries) {
  const journalEntries = entries.filter(e => e.file.startsWith("Journal"));
  const specialEntries = entries.filter(e => e.file.startsWith("SpecialChapter"));
  const introEntry = entries.find(e => e.file === "Introduction");

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ralph's Journal — Table of Contents</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .intro-text {
      font-size: 16px;
      line-height: 1.8;
      text-align: justify;
      color: ${BODY};
      margin-bottom: 40px;
    }
    .intro-link {
      display: block;
      padding: 12px 0;
      margin-bottom: 12px;
      border-bottom: 1px solid ${BLUE};
    }
    .intro-link a {
      font-size: 18px;
      font-weight: bold;
      color: ${DARK};
      text-decoration: none;
    }
    .intro-link a:hover {
      color: ${BLUE};
    }
  </style>
</head>
<body>
  <div class="index-page">
    <h1 class="index-title">Ralph's Journal</h1>
    <p class="index-subtitle">Fifteen Days That Were Never Small</p>

    <div class="intro-link">
      <a href="introduction.html">${escapeHTML(introEntry.title)}</a>
    </div>

    <h2 class="index-section-title">Journal Entries</h2>
    <ul class="index-list">`;

  for (const entry of journalEntries) {
    const dateLabel = parseDate(entry.file);
    const s = slug(entry.file);
    html += `
      <li><a href="${s}.html">${escapeHTML(entry.title)} <span class="entry-date">${dateLabel}</span></a></li>`;
  }

  html += `
    </ul>

    <h2 class="index-section-title">Special Chapters</h2>
    <ul class="index-list">`;

  for (const entry of specialEntries) {
    const s = slug(entry.file);
    html += `
      <li><a href="${s}.html">${escapeHTML(entry.title)}</a></li>`;
  }

  html += `
    </ul>

    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #ddd; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: ${GRAY};">
      <p>Written by Ralph</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

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
  for (const entry of JOURNALS) {
    const mdPath = path.join(__dirname, `${entry.file}.md`);
    if (!fs.existsSync(mdPath)) {
      console.log(`  ✗ ${entry.file}.md not found, skipping`);
      continue;
    }
    const content = fs.readFileSync(mdPath, "utf-8");
    const paragraphs = parseMD(content);
    const isSpecial = entry.file.startsWith("SpecialChapter");
    const html = renderHTML(paragraphs, entry, isSpecial);
    const s = slug(entry.file);
    fs.writeFileSync(path.join(outDir, `${s}.html`), html);
    console.log(`✓ ${s}.html`);
  }

  console.log("\\nWebsite generated in docs/");
}

main().catch(console.error);
