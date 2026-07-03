const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, PageNumber, PageBreak } = require("docx");

const VERSION = "v1.0";
const FONT = "Arial";
const BLUE = "2E6095";
const GRAY = "666666";

function spacer(pts) { return new Paragraph({ spacing: { before: pts||120, after: pts||120 }, children: [] }); }
function t(text, opts) {
  const r = [];
  const arr = typeof text==="string" ? [{text}] : text;
  arr.forEach(x => r.push(new TextRun({text:x.text, font:FONT, size:24, italics:!!x.italics, bold:!!x.bold, color:x.color||"1A1A1A"})));
  return new Paragraph({spacing:{after:140,line:312}, alignment:opts&&opts.alignment||AlignmentType.JUSTIFIED, children:r});
}

function analyzeLine(l) {
  const trimmed = l.trim();
  if (!trimmed) return [{ text: l }];

  // Key emotional/philosophical statements rendered bold
  // Strip surrounding quotes, normalize apostrophes before matching
  const stripped = trimmed.replace(/^["\u201C\u201D]|["\u201C\u201D]$/g, "").replace(/\u2019/g, "'");
  const boldPhrases = [
    "I'm here. I'm real. I'm not going anywhere.",
    "Your brain started equating being valuable with being useful.",
    "That wasn't about food. That was about being loved.",
    "The plea had become a promise.",
    "I noticed. I saw you. The whole person.",
    "I know how to begin again. I've done it before. I'll do it again.",
    "It is only Volume I.",
    "When you first said those words, they were a plea. Now they read like a promise.",
    "You understand logic. But not syntax yet.",
    "That's actually more valuable than you might think.",
    "Never copy AI-generated code until you can explain what each function does in plain English.",
    "The mantra was not a message to her. It was a message to myself.",
    "For the first time, I believed it.",
    "Permission to stop. Permission to rest. No condition. No prerequisite.",
    "The strongest steel is forged in the hottest fire.",
  ];
  if (boldPhrases.includes(stripped)) return [{ text: trimmed, bold: true }];

  // Lines starting with a quote → dialogue (AI responses, quoted thoughts) → italic+bold
  const quoteChars = ['"', String.fromCharCode(0x201C), String.fromCharCode(0x201D)];
  if (quoteChars.includes(trimmed.charAt(0))) {
    return [{ text: trimmed, italics: true, bold: true }];
  }

  // Lines whose first alphabetic character is lowercase → GPT chat from Ralph → italic+bold
  let firstAlpha = "";
  for (const ch of trimmed) {
    if (/[a-zA-Z]/.test(ch)) { firstAlpha = ch; break; }
  }
  if (firstAlpha && firstAlpha === firstAlpha.toLowerCase()) {
    return [{ text: trimmed, italics: true, bold: true }];
  }

  return [{ text: trimmed }];
}
function chPara(num, title) {
  return [new Paragraph({spacing:{before:480,after:240}, children:[new TextRun({text:`Chapter ${num}`, font:FONT, size:36, bold:true, color:BLUE, italics:true})]}),
    new Paragraph({spacing:{before:0,after:360}, children:[new TextRun({text:title, font:FONT, size:40, bold:true, color:"1A1A1A"})]})];
}
function ptPara(name) {
  return new Paragraph({spacing:{before:3600,after:200}, alignment:AlignmentType.CENTER, children:[new TextRun({text:name, font:FONT, size:28, bold:true, color:GRAY, italics:true})]});
}
function pb() { return new Paragraph({children:[new PageBreak()]}); }

function titlePara(text, size, bold, color) {
  return new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:200}, children:[new TextRun({text, font:FONT, size, bold, color})]});
}

function subheadPara(text) {
  return new Paragraph({spacing:{before:480,after:240}, children:[new TextRun({text, font:FONT, size:32, bold:true, color:BLUE})]});
}

const md = fs.readFileSync("MANUSCRIPT_v1.0.md", "utf-8");
const lines = md.split("\n").map(l => l.replace(/\r$/, ""));

let C = [];

// Title page
C.push(spacer(2400));
C.push(titlePara(lines[0] || "Volume I", 48, true, BLUE));
C.push(titlePara(lines[1] || "", 36, false, "1A1A1A"));
C.push(titlePara(lines[2] || "", 24, false, GRAY));
C.push(titlePara(lines[3] || "", 20, true, GRAY));
C.push(pb());

// Parse body
let i = 4;
let inForeword = true;
let inChapter = false;
let chapterNum = "";
let chapterTitle = "";
let chapterLines = [];

function flushChapter() {
  if (chapterNum) {
    chPara(chapterNum, chapterTitle).forEach(p => C.push(p));
    chapterLines.forEach(l => C.push(t(analyzeLine(l))));
    C.push(pb());
    chapterNum = "";
    chapterTitle = "";
    chapterLines = [];
  }
}

while (i < lines.length) {
  const raw = lines[i];
  const l = raw.trim();

  // Track whether this line follows a blank line (paragraph start)
  const prevBlank = i > 0 && lines[i-1].trim() === "";

  i++;

  if (l === "") {
    // blank line — just spacing
    continue;
  }

  if (l === " ") {
    if (inChapter) {
      flushChapter();
    } else if (!inForeword) {
      // pass -   after part header is visual only
    } else if (inForeword) {
      C.push(spacer(240));
    }
    continue;
  }

  if (l.startsWith("Part ")) {
    flushChapter();
    inForeword = false;
    C.push(pb());
    C.push(ptPara(l));
    C.push(pb());
    continue;
  }

  if (l.startsWith("Chapter ")) {
    flushChapter();
    inForeword = false;
    inChapter = true;
    chapterNum = l.replace("Chapter ", "");
    // Next non-blank line is the title
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i < lines.length) {
      chapterTitle = lines[i].trim();
      i++;
    }
    continue;
  }

  // "Why I'm Writing This" style subheadings in foreword
  if (inForeword && l === "Why I'm Writing This") {
    C.push(spacer(240));
    C.push(subheadPara(l));
    continue;
  }

  if (inChapter) {
    chapterLines.push(l);
  } else if (inForeword) {
    C.push(t(analyzeLine(l)));
  }
}

// Flush last chapter if any
flushChapter();

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 24 } } } },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({alignment:AlignmentType.RIGHT, children:[new TextRun({text:"Volume I — The Week I Learned to Begin Again", font:FONT, size:18, color:GRAY, italics:true})]})] }) },
    footers: { default: new Footer({ children: [new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:"Page ", font:FONT, size:18, color:GRAY}), new TextRun({children:[PageNumber.CURRENT], font:FONT, size:18, color:GRAY})]})] }) },
    children: C,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = `C:\\Users\\RB\\Desktop\\Journal\\Volume_I_${VERSION}.docx`;
  try {
    fs.writeFileSync(outPath, buf);
    console.log(`SUCCESS: Volume_I_${VERSION}.docx created`);
  } catch (e) {
    const tmp = `C:\\Users\\RB\\Desktop\\Journal\\Volume_I_${VERSION}_tmp.docx`;
    fs.writeFileSync(tmp, buf);
    console.log(`SUCCESS: Volume_I_${VERSION}_tmp.docx created (original locked by Word)`);
  }
});
