import { FormEvent, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, ShieldCheck, Sparkles } from 'lucide-react';

interface CustomerAssistantPanelProps {
  conversationId?: number | null;
  onMessageStored?: () => void;
  onTalkToAdmin?: () => void;
}

const getToken = () => localStorage.getItem('token');

export function CustomerAssistantPanel({ conversationId = null, onMessageStored, onTalkToAdmin }: CustomerAssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [handoffRequired, setHandoffRequired] = useState(false);

  const askAssistant = async (event: FormEvent) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setLoading(true);
    setError('');
    setHandoffRequired(false);

    try {
      const token = getToken();
      const response = await fetch('/api/ai/customer-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: cleanQuestion,
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(payload?.error || 'Rayjin Assistant is temporarily unavailable.'), {
          handoffAvailable: Boolean(payload?.handoffAvailable),
        });
      }

      setAnswer(String(payload?.assistant || '').trim());
      setHandoffRequired(Boolean(payload?.handoffRequired));
      setQuestion('');
      if (conversationId) onMessageStored?.();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Rayjin Assistant is temporarily unavailable. You can still contact Rayjin Hardware Admin.';
      setError(message);
      setHandoffRequired(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-emerald-200 bg-[linear-gradient(120deg,#f6fbf8_0%,#edf8f1_100%)] p-4 shadow-sm" aria-labelledby="rayjin-assistant-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0B3B23] text-emerald-100 shadow-sm">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="rayjin-assistant-title" className="text-sm font-extrabold text-[#17372D]">Rayjin Assistant</h3>
              <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-emerald-700">AI-powered support</span>
            </div>
            <p className="mt-1 max-w-2xl text-[10px] leading-4 text-[#61766D]">
              Ask about products, prices, availability, fulfillment, or your own orders. The assistant is informational and cannot approve orders, verify payments, change stock, or perform Admin actions.
            </p>
            {conversationId ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[8px] font-bold text-emerald-700">
                <ShieldCheck className="h-3 w-3" /> Answers in this thread are saved as clearly labeled AI messages.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {(answer || error) && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 ${error ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#15803d]">
            <Sparkles className="h-3.5 w-3.5" /> Rayjin Assistant
          </div>
          <p className={`mt-2 whitespace-pre-wrap text-[11px] leading-5 ${error ? 'text-amber-900' : 'text-[#36574B]'}`}>{error || answer}</p>
          {handoffRequired && (
            <button type="button" onClick={onTalkToAdmin} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0B3B23] px-3 py-2 text-[9px] font-extrabold text-white transition hover:bg-[#14532D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2">
              <MessageCircle className="h-3.5 w-3.5" /> Talk to Admin
            </button>
          )}
        </div>
      )}

      <form onSubmit={askAssistant} className="mt-4 flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="rayjin-assistant-question" className="sr-only">Ask Rayjin Assistant</label>
          <textarea
            id="rayjin-assistant-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            maxLength={800}
            placeholder="Example: Is there Portland cement in stock, and can I pick it up?"
            className="max-h-28 min-h-[48px] w-full resize-none rounded-2xl border border-[#CFE0D5] bg-white px-4 py-3 text-xs leading-5 text-[#34463F] outline-none transition placeholder:text-[#9AA8A1] focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (question.trim() && !loading) event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="mt-1 flex justify-between px-1 text-[8px] text-[#8A9992]">
            <span>Verified Rayjin data only · High-risk concerns go to Admin</span>
            <span>{question.length}/800</span>
          </div>
        </div>
        <button type="submit" disabled={!question.trim() || loading} className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#15803d] text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2" aria-label="Ask Rayjin Assistant">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  );
}
