const fs = require("fs");
const path = require("path");

const FONT = "Georgia, 'Times New Roman', serif";
const BLUE = "#3a7ca5";
const DARK = "#1A1A2E";
const GRAY = "#8a8a8a";
const BODY = "#2c2c2c";
const PAPER = "#faf7f2";
const BG = "#f3eee7";

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
  { file: "Journal_Day6.0_2026-06-29", title: "The Day Everything Is Ordinary" },
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

function renderHTML(paragraphs, entry, isSpecial, prevEntry, nextEntry) {
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
    <div class="page-footer">Ralph's Journal</div>
  </div>
  <nav class="nav-bar">
    <div class="nav-links">
      ${prevEntry ? `<a href="${slug(prevEntry.file)}.html" class="nav-prev">← ${escapeHTML(prevEntry.title)}</a>` : `<span></span>`}
      <a href="index.html" class="nav-toc">Table of Contents</a>
      ${nextEntry ? `<a href="${slug(nextEntry.file)}.html" class="nav-next">${escapeHTML(nextEntry.title)} →</a>` : `<span></span>`}
    </div>
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
  background: ${BG};
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

.page {
  max-width: 700px;
  margin: 0 auto;
  padding: 60px 40px;
  background: ${PAPER};
  min-height: 100dvh;
  box-shadow: 0 0 30px rgba(0,0,0,0.06);
}

.index-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 60px 40px;
  background: ${PAPER};
  min-height: 100dvh;
  box-shadow: 0 0 30px rgba(0,0,0,0.06);
}

.page-header {
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: ${GRAY};
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0dbd4;
  margin-bottom: 48px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.date-line {
  text-align: center;
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: ${GRAY};
  font-style: italic;
  margin-bottom: 6px;
}

.entry-title {
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  color: ${DARK};
  margin-bottom: 22px;
  line-height: 1.3;
}

.chapter-title {
  text-align: center;
  font-size: 30px;
  font-weight: bold;
  color: ${DARK};
  margin-bottom: 0;
  line-height: 1.3;
}

.decorative-line {
  text-align: center;
  font-size: 14px;
  color: #c5c0b8;
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
  font-size: 17px;
  line-height: 1.9;
  text-align: justify;
  margin-bottom: 20px;
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
  border-top: 1px solid #e0dbd4;
}

.nav-bar {
  max-width: 700px;
  margin: 0 auto 60px;
  padding: 24px 40px;
}

.nav-links {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 8px;
}

.nav-prev, .nav-next {
  font-family: Georgia, serif;
  font-size: 16px;
  color: ${DARK};
  text-decoration: none;
  max-width: 40%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 12px 16px;
  border: 1px solid #e0dbd4;
  border-radius: 6px;
  transition: all 0.2s;
  flex: 1;
  text-align: left;
}

.nav-next {
  text-align: right;
}

.nav-prev:hover, .nav-next:hover {
  border-color: ${BLUE};
  background: #efe8e0;
  color: ${BLUE};
}

.nav-toc {
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: ${GRAY};
  text-decoration: none;
  flex-shrink: 0;
  padding: 12px 12px;
  border: 1px solid #e0dbd4;
  border-radius: 6px;
  transition: all 0.2s;
  text-align: center;
}

.nav-toc:hover {
  color: ${BLUE};
  border-color: ${BLUE};
  background: #efe8e0;
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
  font-size: 17px;
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
  border-bottom: 1px solid #e0dbd4;
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
  font-size: 17px;
  color: ${BODY};
  text-decoration: none;
  display: block;
  padding: 10px 12px;
  border: 1px solid #e0dbd4;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: all 0.2s;
}

.index-list a:hover {
  color: ${BLUE};
  border-color: ${BLUE};
  background: #efe8e0;
}

.index-list .entry-date {
  font-family: Arial, sans-serif;
  font-size: 12px;
  color: ${GRAY};
  margin-left: 8px;
}

.index-description {
  text-align: center;
  font-size: 16px;
  color: ${GRAY};
  font-style: italic;
  margin-bottom: 36px;
  line-height: 1.6;
  padding: 0 12px;
}

.intro-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 32px;
  border: 1px solid ${BLUE};
  border-radius: 8px;
  background: #f5f0eb;
  transition: all 0.2s;
}

.intro-section:hover {
  background: #efe8e0;
}

.intro-icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.intro-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.intro-label {
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: ${BLUE};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: bold;
}

.intro-link {
  font-size: 18px;
  font-weight: bold;
  color: ${DARK};
  text-decoration: none;
}

.intro-link:hover {
  color: ${BLUE};
}

.week-title {
  font-size: 16px;
  font-weight: bold;
  color: ${BLUE};
  margin: 4px 0 16px;
  font-family: Arial, sans-serif;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.date-group {
  margin-bottom: 20px;
}

.date-group:last-child {
  margin-bottom: 0;
}

.date-heading {
  font-family: Arial, sans-serif;
  font-size: 13px;
  color: ${GRAY};
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.section-subdesc {
  font-size: 15px;
  color: ${GRAY};
  font-style: italic;
  margin: -8px 0 16px;
  line-height: 1.5;
}

.date-group .index-list a {
  border: none;
  border-left: 3px solid #e0dbd4;
  border-radius: 0;
  padding: 6px 12px;
  margin-bottom: 2px;
  font-size: 16px;
}

.date-group .index-list a:hover {
  border-left-color: ${BLUE};
  background: transparent;
}

.about-section {
  margin-top: 48px;
  padding: 28px 24px;
  background: #f5f0eb;
  border-radius: 8px;
  border: 1px solid #e0dbd4;
}

.about-title {
  font-size: 17px;
  font-weight: bold;
  color: ${BLUE};
  text-align: center;
  margin-bottom: 16px;
}

.about-quote {
  font-size: 15px;
  color: ${GRAY};
  line-height: 1.8;
  text-align: center;
  font-style: italic;
  border: none;
  padding: 0;
  margin: 0 0 12px;
}

.about-attribution {
  text-align: center;
  font-size: 14px;
  color: ${GRAY};
  font-family: Arial, sans-serif;
}

.index-footer {
  max-width: 640px;
  margin: 0 auto;
  padding: 48px 40px 60px;
  text-align: center;
}

.footer-quote {
  font-size: 14px;
  color: ${GRAY};
  line-height: 1.8;
  font-style: italic;
  border: none;
  padding: 0;
  margin: 0 0 8px;
}

.footer-attribution {
  font-size: 13px;
  color: ${GRAY};
  font-family: Arial, sans-serif;
}

@media (max-width: 900px) {
  .page, .index-page {
    padding: 40px 32px;
  }
  .nav-bar {
    padding: 20px 32px;
  }
}

@media (max-width: 640px) {
  body {
    background: ${PAPER};
  }

  .page, .index-page {
    padding: 32px 20px;
    box-shadow: none;
    min-height: auto;
  }

  .page-header {
    font-size: 12px;
    padding-bottom: 12px;
    margin-bottom: 32px;
  }

  .entry-title, .chapter-title {
    font-size: 22px;
  }

  .content p {
    font-size: 16px;
    line-height: 1.7;
    margin-bottom: 14px;
  }

  .nav-bar {
    padding: 16px 20px 48px;
    margin: 0;
  }

  .nav-links {
    flex-direction: column;
    gap: 6px;
  }

  .nav-prev, .nav-next {
    max-width: 100%;
    font-size: 15px;
    padding: 10px 14px;
    text-align: center;
  }

  .nav-toc {
    font-size: 13px;
    padding: 10px 14px;
    order: -1;
  }

  .index-list a {
    font-size: 16px;
    padding: 8px 10px;
  }

  .index-title {
    font-size: 26px;
  }

  .index-subtitle {
    font-size: 15px;
  }

  .index-description {
    font-size: 14px;
    padding: 0 4px;
    margin-bottom: 28px;
  }

  .intro-section {
    padding: 14px;
    gap: 12px;
  }

  .intro-icon {
    font-size: 22px;
  }

  .intro-link {
    font-size: 17px;
  }

  .about-section {
    padding: 20px 16px;
  }

  .about-quote {
    font-size: 14px;
  }

  .index-footer {
    padding: 32px 20px 48px;
  }

  .footer-quote {
    font-size: 13px;
  }
}

@media (max-width: 400px) {
  .page, .index-page {
    padding: 24px 16px;
  }

  .entry-title, .chapter-title {
    font-size: 20px;
  }

  .content p {
    font-size: 15px;
  }

  .index-description {
    font-size: 13px;
  }

  .intro-section {
    padding: 12px;
    gap: 10px;
  }

  .intro-icon {
    font-size: 18px;
  }

  .intro-link {
    font-size: 15px;
  }
}
`;
}

function getDayNum(file) {
  const m = file.match(/Journal_Day(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function formatDateShort(file) {
  const m = file.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return "";
  const d = new Date(m[0] + "T12:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${weekday} • ${date}`;
}

function generateDateGroups(entries) {
  let html = "";
  let currentDate = "";
  for (const entry of entries) {
    const dateLabel = formatDateShort(entry.file);
    if (dateLabel !== currentDate) {
      if (currentDate !== "") html += `\n      </ul>\n    </div>`;
      html += `\n    <div class="date-group">\n      <p class="date-heading">${dateLabel}</p>\n      <ul class="index-list">`;
      currentDate = dateLabel;
    }
    const s = slug(entry.file);
    html += `\n        <li><a href="${s}.html">${escapeHTML(entry.title)}</a></li>`;
  }
  if (currentDate !== "") html += `\n      </ul>\n    </div>`;
  return html;
}

function generateIndex(entries) {
  const introEntry = entries.find(e => e.file === "Introduction");
  const journalEntries = entries.filter(e => e.file.startsWith("Journal") && getDayNum(e.file) <= 5);
  const futureEntries = entries.filter(e => e.file.startsWith("Journal") && getDayNum(e.file) >= 6);
  const specialEntries = entries.filter(e => e.file.startsWith("SpecialChapter"));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ralph's Journal</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="index-page">
    <h1 class="index-title">Ralph's Journal</h1>
    <p class="index-subtitle">Fifteen Days That Were Never Small</p>
    <p class="index-description">A personal journal about heartbreak, healing, ordinary mornings, and finding the long way home.</p>

    <div class="intro-section">
      <span class="intro-icon">📖</span>
      <div class="intro-content">
        <span class="intro-label">Begin Here</span>
        <a href="introduction.html" class="intro-link">${escapeHTML(introEntry.title)}</a>
      </div>
    </div>

    <h2 class="index-section-title">Journal</h2>
    <h3 class="week-title">Week One</h3>
    ${generateDateGroups(journalEntries)}

    <h2 class="index-section-title">Special Chapters</h2>
    <p class="section-subdesc">A chapter dedicated to someone who became part of my story.</p>
    <div class="date-group">
      <ul class="index-list">${specialEntries.map(entry => `\n          <li><a href="${slug(entry.file)}.html">${escapeHTML(entry.title)}</a></li>`).join("")}
      </ul>
    </div>

    <h2 class="index-section-title">Chapter Two</h2>
    ${generateDateGroups(futureEntries)}

    <div class="about-section">
      <h3 class="about-title">✍ About This Journal</h3>
      <blockquote class="about-quote">
        &ldquo;This journal began as a way to survive a heartbreak.
        Somewhere along the way, it became a record of a life finding its way back to itself.
        These pages are not written to ask anyone to return.
        They are written so I never forget who I became.&rdquo;
      </blockquote>
      <p class="about-attribution">&mdash; Ralph</p>
    </div>
  </div>

  <div class="index-footer">
    <blockquote class="footer-quote">
      &ldquo;I started writing because I didn&rsquo;t know what else to do with the weight I was carrying.
      I kept writing because I realized I was slowly carrying less of it.&rdquo;
    </blockquote>
    <p class="footer-attribution">&mdash; Ralph</p>
  </div>
</body>
</html>`;
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
    const isSpecial = entry.file.startsWith("SpecialChapter");
    const html = renderHTML(paragraphs, entry, isSpecial, prevEntry, nextEntry);
    const s = slug(entry.file);
    fs.writeFileSync(path.join(outDir, `${s}.html`), html);
    console.log(`✓ ${s}.html`);
  }

  console.log("\\nWebsite generated in docs/");
}

main().catch(console.error);
