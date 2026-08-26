import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || true
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ai-blog-automation" });
});

function getSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Invalid Google Sheet URL.");
  return match[1];
}

async function getPendingTopic(sheetUrl) {
  const spreadsheetId = getSpreadsheetId(sheetUrl);
  const csvUrl =
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error("Could not read the Google Sheet. Make sure it is accessible to the backend.");
  }

  const csv = await response.text();
  const rows = parseCsv(csv);

  if (rows.length < 2) throw new Error("The sheet has no topic rows.");

  const headers = rows[0].map(v => v.trim().toLowerCase());
  const titleIndex = headers.findIndex(v => v === "blog title" || v === "title");
  const statusIndex = headers.findIndex(v => v === "status");

  if (titleIndex === -1 || statusIndex === -1) {
    throw new Error('Sheet needs columns named "Blog Title" and "status".');
  }

  for (let i = 1; i < rows.length; i++) {
    const title = rows[i][titleIndex]?.trim();
    const status = rows[i][statusIndex]?.trim().toLowerCase();
    if (title && status === "pending") {
      return { title, rowNumber: i + 1 };
    }
  }

  throw new Error("No pending topics found.");
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"' && quoted && next === '"') {
      cell += '"'; i++; continue;
    }
    if (c === '"') { quoted = !quoted; continue; }
    if (c === "," && !quoted) {
      row.push(cell); cell = ""; continue;
    }
    if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function generateWithOpenAI(topic, instructions, wordCount) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

  const prompt = `Write a high-quality blog post about "${topic}".
Target length: approximately ${wordCount} words.
Instructions: ${instructions || "Write naturally, clearly, with useful headings and an engaging introduction."}
Return only the blog content in Markdown.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: prompt
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed.");

  const text = data.output_text ||
    data.output?.flatMap(item => item.content || [])
      .map(c => c.text || "")
      .join("") || "";

  if (!text) throw new Error("OpenAI returned no blog content.");
  return text;
}

async function generateWithGemini(topic, instructions, wordCount) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");

  const prompt = `Write a high-quality blog post about "${topic}".
Target length: approximately ${wordCount} words.
Instructions: ${instructions || "Write naturally, clearly, with useful headings and an engaging introduction."}
Return only the blog content in Markdown.`;

  const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini request failed.");

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no blog content.");
  return text;
}

async function sendTelegram(botToken, chatId, title, blog) {
  if (!botToken || !chatId) throw new Error("Telegram Bot Token and Chat ID are required.");

  const message = `📝 *${title}*\n\n${blog}`;
  const chunks = [];
  for (let i = 0; i < message.length; i += 3900) chunks.push(message.slice(i, i + 3900));

  for (const chunk of chunks) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: "Markdown"
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.description || "Telegram request failed.");
    }
  }
}

app.post("/api/run", async (req, res) => {
  try {
    const {
      sheetUrl,
      provider = "openai",
      instructions,
      wordCount = 800,
      telegramBotToken,
      telegramChatId
    } = req.body;

    if (!sheetUrl) throw new Error("Google Sheet URL is required.");

    const topic = await getPendingTopic(sheetUrl);

    const blog = provider === "gemini"
      ? await generateWithGemini(topic.title, instructions, wordCount)
      : await generateWithOpenAI(topic.title, instructions, wordCount);

    await sendTelegram(telegramBotToken, telegramChatId, topic.title, blog);

    res.json({
      ok: true,
      topic: topic.title,
      rowNumber: topic.rowNumber,
      blog
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`AI Blog Automation API running on port ${port}`);
});
