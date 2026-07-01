const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Header, Footer, PageNumber, BorderStyle
} = require("docx");

const FONT = "Georgia";
const FONT_HEADING = "Georgia";
const BLUE = "2E75B6";
const DARK = "1A1A2E";
const GRAY = "999999";
const BODY = "333333";

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
  { file: "Journal_Day8_2026-07-01", title: "The Tomorrow I Thought Would Never Come" },
];

function parseDate(file, entry) {
  if (entry && entry.date) {
    const d = new Date(entry.date + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }
  const m = file.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return "";
  const d = new Date(m[0] + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getDayLabel(file) {
  if (file === "Introduction" || file === "SpecialChapter0") return "Introduction";
  if (file.startsWith("SpecialChapter")) {
    const m = file.match(/SpecialChapter(\d+)/);
    return m ? `Special Chapter ${m[1]}` : "Special Chapter";
  }
  const mDecimal = file.match(/Day(\d+\.\d+)/);
  if (mDecimal) return `Day ${mDecimal[1]}`;
  const m = file.match(/Day(\d+)/);
  return m ? `Day ${m[1]}` : "";
}

function parseMD(content, file) {
  const lines = content.split("\n").map(l => l.replace(/\r$/, ""));
  let bodyStart = 0;

  // Skip all heading and blank lines at the start (handles consecutive headings with blanks between)
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
    if (trimmed === "---") {
      paragraphs.push("---");
      continue;
    }
    if (trimmed.match(/^#{1,3}\s/)) {
      paragraphs.push(trimmed);
      continue;
    }
    paragraphs.push(trimmed);
  }

  return paragraphs.filter(p => p !== "");
}

function buildDoc(paragraphs, file, dateLabel, subtitle) {
  const children = [];
  const isSpecial = file.startsWith("SpecialChapter") && file !== "SpecialChapter0";

  if (!isSpecial) {
    // Date line
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: dateLabel, font: "Arial", size: 22, color: GRAY, italics: true })]
    }));

    // Subtitle
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [new TextRun({ text: subtitle, font: FONT_HEADING, size: 42, bold: true, color: DARK })]
    }));

    // Decorative divider
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } },
      children: [new TextRun({ text: "₊‧.°.⋆•", font: FONT, size: 24, color: "CCCCCC" })]
    }));
  }

  let starCount = 0;

  for (const para of paragraphs) {
    if (para === "---") {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "✦", font: FONT, size: 18, color: BLUE })]
      }));
      continue;
    }

    if (para === "✦") {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "✦", font: FONT, size: 18, color: BLUE })]
      }));
      continue;
    }

    if (para === "₊‧.°.⋆•") {
      if (!isSpecial) continue; // Journals get auto dividers
      starCount++;
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: starCount > 1 ? 480 : 0, after: 120 },
        border: starCount > 1
          ? { top: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } }
          : { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } },
        children: [new TextRun({ text: "₊‧.°.⋆•", font: FONT, size: 24, color: "CCCCCC" })]
      }));
      continue;
    }

    if (para === "★") {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [new TextRun({ text: "★", font: FONT, size: 18, color: BLUE })]
      }));
      continue;
    }

    if (isSpecial && para === subtitle) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: para, font: FONT_HEADING, size: 42, bold: true, color: DARK })]
      }));
      continue;
    }
    if (para.startsWith("## ")) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: para.replace(/^##\s*/, ""), font: FONT_HEADING, size: 42, bold: true, color: DARK })]
      }));
      continue;
    }
    if (para.startsWith("### ")) {
      children.push(new Paragraph({
        spacing: { before: 360, after: 200 },
        children: [new TextRun({ text: para.replace(/^###\s*/, ""), font: FONT_HEADING, size: 32, bold: true, color: BLUE })]
      }));
      continue;
    }

    // Parse inline bold and italic
    const runs = [];
    let remaining = para;
    while (remaining.length > 0) {
      // Bold+italic ***text***
      const biMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
      if (biMatch) {
        runs.push(new TextRun({ text: biMatch[1], bold: true, italics: true, size: 24, font: FONT, color: BODY }));
        remaining = remaining.slice(biMatch[0].length);
        continue;
      }
      // Bold **text**
      const bMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (bMatch) {
        runs.push(new TextRun({ text: bMatch[1], bold: true, size: 24, font: FONT, color: BODY }));
        remaining = remaining.slice(bMatch[0].length);
        continue;
      }
      // Italic *text*
      const iMatch = remaining.match(/^\*(.+?)\*/);
      if (iMatch) {
        runs.push(new TextRun({ text: iMatch[1], italics: true, size: 24, font: FONT, color: BODY }));
        remaining = remaining.slice(iMatch[0].length);
        continue;
      }
      // Plain text up to next marker
      const next = remaining.search(/\*|$/);
      if (next > 0) {
        runs.push(new TextRun({ text: remaining.slice(0, next), size: 24, font: FONT, color: BODY }));
        remaining = remaining.slice(next);
      } else if (next === 0) {
        runs.push(new TextRun({ text: remaining[0], size: 24, font: FONT, color: BODY }));
        remaining = remaining.slice(1);
      } else {
        if (remaining) runs.push(new TextRun({ text: remaining, size: 24, font: FONT, color: BODY }));
        break;
      }
    }

    children.push(new Paragraph({
      spacing: { after: 240, line: 360 },
      indent: { firstLine: 0 },
      alignment: AlignmentType.JUSTIFIED,
      children: runs.length > 0 ? runs : [new TextRun({ text: para, size: 24, font: FONT, color: BODY })]
    }));
  }

  // Ending divider
  if (!isSpecial) {
    children.push(new Paragraph({
      spacing: { before: 480, after: 120 },
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 1 } },
      children: [new TextRun({ text: "₊‧.°.⋆•", font: FONT, size: 24, color: "CCCCCC" })]
    }));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24, color: BODY }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
            children: [new TextRun({ text: file === "Introduction" || file === "SpecialChapter0" ? subtitle : `Ralph's Journal — ${getDayLabel(file)}`, font: "Arial", size: 18, color: GRAY, italics: true })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
            children: [
              new TextRun({ text: "Ralph's Journal  •  Page ", font: "Arial", size: 18, color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GRAY })
            ]
          })]
        })
      },
      children,
    }]
  });
}

async function main() {
  for (const entry of JOURNALS) {
    const { file, title } = entry;
    const mdPath = `C:\\Users\\RB\\Desktop\\Journal\\${file}.md`;
    const content = fs.readFileSync(mdPath, "utf-8");
    const dateLabel = parseDate(file, entry);
    const paragraphs = parseMD(content, file);
    const doc = buildDoc(paragraphs, file, dateLabel, title);
    const buffer = await Packer.toBuffer(doc);
    const outPath = `C:\\Users\\RB\\Desktop\\Journal\\${file}.docx`;
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ ${file}.docx regenerated`);
  }
  console.log("All journals regenerated successfully.");
}

main().catch(console.error);
