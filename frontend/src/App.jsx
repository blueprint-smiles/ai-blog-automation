import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:10000";

export default function App() {
  const [form, setForm] = useState({
    sheetUrl: "",
    provider: "openai",
    wordCount: 800,
    instructions: "",
    telegramBotToken: "",
    telegramChatId: ""
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const update = (key, value) =>
    setForm(prev => ({ ...prev, [key]: value }));

  async function runAutomation(e) {
    e.preventDefault();
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Automation failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="header">
          <div className="logo">AI</div>
          <div>
            <p className="eyebrow">AUTOMATION MVP</p>
            <h1>AI Blog Automation</h1>
            <p className="subtitle">
              Turn a pending Google Sheet topic into an AI-written blog and send it to Telegram.
            </p>
          </div>
        </header>

        <form onSubmit={runAutomation} className="grid">
          <section className="card wide">
            <div className="cardTitle">
              <span>01</span>
              <h2>Google Sheet</h2>
            </div>
            <label>Google Sheet URL</label>
            <input
              value={form.sheetUrl}
              onChange={e => update("sheetUrl", e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              required
            />
            <p className="hint">Your sheet should have Blog Title and status columns.</p>
          </section>

          <section className="card">
            <div className="cardTitle">
              <span>02</span>
              <h2>AI Writer</h2>
            </div>

            <label>AI Provider</label>
            <div className="providers">
              <button
                type="button"
                className={form.provider === "openai" ? "provider active" : "provider"}
                onClick={() => update("provider", "openai")}
              >
                <strong>ChatGPT</strong>
                <small>OpenAI</small>
              </button>
              <button
                type="button"
                className={form.provider === "gemini" ? "provider active" : "provider"}
                onClick={() => update("provider", "gemini")}
              >
                <strong>Gemini</strong>
                <small>Google</small>
              </button>
            </div>

            <label>Approx. word count</label>
            <input
              type="number"
              min="200"
              max="5000"
              value={form.wordCount}
              onChange={e => update("wordCount", Number(e.target.value))}
            />

            <label>Writing instructions</label>
            <textarea
              value={form.instructions}
              onChange={e => update("instructions", e.target.value)}
              placeholder="Example: Write for a general audience. Use H2 headings, practical examples and a clear conclusion."
            />
          </section>

          <section className="card">
            <div className="cardTitle">
              <span>03</span>
              <h2>Telegram</h2>
            </div>

            <label>Bot Token</label>
            <input
              type="password"
              value={form.telegramBotToken}
              onChange={e => update("telegramBotToken", e.target.value)}
              placeholder="123456:ABC..."
              required
            />

            <label>Chat ID</label>
            <input
              value={form.telegramChatId}
              onChange={e => update("telegramChatId", e.target.value)}
              placeholder="e.g. 123456789"
              required
            />

            <p className="hint">
              These values are sent to your backend for this run and are not stored by the frontend.
            </p>
          </section>

          <section className="runCard wide">
            <div>
              <p className="eyebrow">READY</p>
              <h2>Run the automation</h2>
              <p>Find the next pending topic, generate the blog and send it to Telegram.</p>
            </div>
            <button className="runButton" disabled={running}>
              {running ? "Running..." : "Run Automation →"}
            </button>
          </section>
        </form>

        {(error || result) && (
          <section className="activity">
            <div className="activityHeader">
              <div>
                <p className="eyebrow">ACTIVITY</p>
                <h2>Automation result</h2>
              </div>
              <span className={error ? "status failed" : "status success"}>
                {error ? "Failed" : "Completed"}
              </span>
            </div>

            {error && <div className="error">{error}</div>}

            {result && (
              <>
                <div className="successBox">
                  <strong>✓ Blog sent to Telegram</strong>
                  <span>Topic: {result.topic}</span>
                  <span>Sheet row: {result.rowNumber}</span>
                </div>
                <article className="preview">
                  <h3>Generated Blog</h3>
                  <pre>{result.blog}</pre>
                </article>
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
