import { useState } from 'react';
import { Bot, Loader2, MessageSquareText, Sparkles, X } from 'lucide-react';

interface AdminAiToolsProps {
  conversationId: number;
  onUseSuggestedReply: (value: string) => void;
}

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export function AdminAiTools({ conversationId, onUseSuggestedReply }: AdminAiToolsProps) {
  const [summary, setSummary] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingAction, setLoadingAction] = useState<'summary' | 'reply' | null>(null);

  const callAi = async (action: 'summary' | 'suggest-reply') => {
    setLoadingAction(action === 'summary' ? 'summary' : 'reply');
    setNotice('');

    try {
      const response = await fetch(`/api/ai/admin/conversations/${conversationId}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'AI assistance is temporarily unavailable.');

      if (action === 'summary') {
        setSummary(String(payload?.summary || '').trim());
      } else {
        const suggestion = String(payload?.suggestedReply || '').trim();
        if (suggestion) {
          onUseSuggestedReply(suggestion);
          setNotice('Suggested reply placed in the composer. Review and edit it before sending.');
        }
      }
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'AI assistance is temporarily unavailable.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="border-b border-[#E5ECE8] bg-[#F7FAF8] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#52635B]">
          <Bot className="h-3.5 w-3.5 text-[#15803d]" /> Admin AI
        </span>
        <button type="button" onClick={() => void callAi('summary')} disabled={Boolean(loadingAction)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#CFE0D5] bg-white px-3 py-2 text-[9px] font-extrabold text-[#0D7740] shadow-sm transition hover:bg-emerald-50 disabled:opacity-50">
          {loadingAction === 'summary' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquareText className="h-3.5 w-3.5" />}
          Summarize
        </button>
        <button type="button" onClick={() => void callAi('suggest-reply')} disabled={Boolean(loadingAction)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B3B23] px-3 py-2 text-[9px] font-extrabold text-white shadow-sm transition hover:bg-[#14532D] disabled:opacity-50">
          {loadingAction === 'reply' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Suggest Reply
        </button>
        <span className="text-[8px] text-[#8A9992]">Read-only assistance · Admin remains in control</span>
      </div>

      {summary && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-emerald-700"><Sparkles className="h-3.5 w-3.5" /> Conversation Summary</span>
            <button type="button" onClick={() => setSummary('')} className="rounded-lg p-1 text-[#8A9992] hover:bg-[#F1F5F2] hover:text-[#17372D]" aria-label="Close AI summary"><X className="h-3.5 w-3.5" /></button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#36574B]">{summary}</p>
        </div>
      )}

      {notice && <p className="mt-2 rounded-xl border border-[#DDE6E0] bg-white px-3 py-2 text-[9px] font-semibold leading-4 text-[#52635B]">{notice}</p>}
    </div>
  );
}
