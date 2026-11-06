import {
  ArrowLeft,
  CheckCheck,
  ClipboardList,
  Inbox,
  Mail,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { AdminAiTools } from './AdminAiTools';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface ConversationSummary {
  conversationId: number;
  conversationType: 'general' | 'order';
  customerId: number;
  customerName: string;
  customerEmail: string | null;
  orderId: string | null;
  subject: string | null;
  orderStatus: string | null;
  orderFulfillment: string | null;
  orderPaymentStatus: string | null;
  orderPaymentMethod: string | null;
  orderCreatedAt: string | null;
  latestMessage: string | null;
  latestSenderType: 'customer' | 'admin' | 'system' | null;
  latestEventKey: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  messageId: number;
  senderId: number | null;
  senderType: 'customer' | 'admin' | 'system';
  senderName: string;
  message: string;
  eventKey: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ConversationDetail {
  conversation: ConversationSummary;
  messages: ConversationMessage[];
}

interface AdminMessagesProps {
  onOpenOrder?: (orderId: string) => void;
}

type InboxFilter = 'all' | 'unread' | 'order' | 'general';

const DEFAULT_MESSAGE_LIMIT = 1000;

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'No messages yet';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDateTime(value);

  const differenceMs = Date.now() - parsed.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (differenceMs < minute) return 'Just now';
  if (differenceMs < hour) return `${Math.max(1, Math.floor(differenceMs / minute))}m ago`;
  if (differenceMs < day) return `${Math.floor(differenceMs / hour)}h ago`;
  if (differenceMs < 7 * day) return `${Math.floor(differenceMs / day)}d ago`;

  return parsed.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
};

const fulfillmentLabel = (value?: string | null) => {
  if (value === 'shop_go') return 'Shop & Go';
  if (value === 'delivery') return 'Delivery';
  if (value === 'pickup') return 'Pickup';
  return 'Order';
};

const statusLabel = (value?: string | null) => {
  if (!value) return 'Order';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getToken = () => localStorage.getItem('token');

const authHeaders = (withJson = false): HeadersInit => {
  const token = getToken();
  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    return payload?.error || fallback;
  } catch {
    return fallback;
  }
}

export function AdminMessages({ onOpenOrder }: AdminMessagesProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [listError, setListError] = useState('');
  const [conversationError, setConversationError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [messageLimit, setMessageLimit] = useState(DEFAULT_MESSAGE_LIMIT);

  const activeConversationIdRef = useRef<number | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const scrollMessagesToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
  }, []);

  const notifyUnreadChanged = useCallback(() => {
    window.dispatchEvent(new Event('messages-unread-updated'));
  }, []);

  const updateConversationAsRead = useCallback((conversationId: number) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversationId === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation
      )
    );
  }, []);

  const markConversationRead = useCallback(async (conversationId: number) => {
    const response = await fetch(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PUT',
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, 'Unable to update the read status.'));
    }

    updateConversationAsRead(conversationId);
    notifyUnreadChanged();
  }, [notifyUnreadChanged, updateConversationAsRead]);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!getToken()) {
      setListError('Your Admin session is unavailable. Please sign in again.');
      setLoadingList(false);
      return;
    }

    if (!silent) setLoadingList(true);

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to load customer conversations.'));
      }

      const payload = await response.json();
      setConversations(Array.isArray(payload?.conversations) ? payload.conversations : []);
      setListError('');
    } catch (error) {
      if (!silent) {
        setListError(
          error instanceof Error ? error.message : 'Unable to load customer conversations.'
        );
      }
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const loadConversation = useCallback(async (
    conversationId: number,
    { silent = false, scrollToLatest = false } = {}
  ) => {
    if (!getToken()) return;
    if (!silent) setLoadingConversation(true);

    const viewportBeforeRefresh = messagesViewportRef.current;
    const wasNearLatest = Boolean(
      silent &&
      viewportBeforeRefresh &&
      viewportBeforeRefresh.scrollHeight -
        viewportBeforeRefresh.scrollTop -
        viewportBeforeRefresh.clientHeight <
        96
    );

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to load this conversation.'));
      }

      const payload = (await response.json()) as ConversationDetail;
      setConversationDetail(payload);
      setSelectedConversationId(conversationId);
      setConversationError('');

      const hasUnreadForAdmin = Array.isArray(payload?.messages)
        ? payload.messages.some(
            (message) => !message.readAt && message.senderType === 'customer'
          )
        : false;

      if (hasUnreadForAdmin) {
        try {
          await markConversationRead(conversationId);
        } catch (error) {
          console.error('Unable to mark conversation as read:', error);
        }
      }

      if (scrollToLatest || wasNearLatest) {
        requestAnimationFrame(() => {
          scrollMessagesToLatest('smooth');
        });
      }
    } catch (error) {
      if (!silent) {
        setConversationError(
          error instanceof Error ? error.message : 'Unable to load this conversation.'
        );
      }
    } finally {
      if (!silent) setLoadingConversation(false);
    }
  }, [markConversationRead, scrollMessagesToLatest]);

  useEffect(() => {
    void loadConversations();

    const loadLimits = async () => {
      try {
        const response = await fetch('/api/messages/meta/limits', {
          headers: authHeaders(),
        });
        if (!response.ok) return;
        const payload = await response.json();
        setMessageLimit(Number(payload?.maxMessageLength || DEFAULT_MESSAGE_LIMIT));
      } catch (error) {
        console.error('Unable to load message limits:', error);
      }
    };

    void loadLimits();
  }, [loadConversations]);

  useEffect(() => {
    const refreshVisibleMessages = () => {
      if (document.hidden) return;
      void loadConversations({ silent: true });

      const activeId = activeConversationIdRef.current;
      if (activeId) {
        void loadConversation(activeId, { silent: true });
      }
    };

    const conversationTimer = window.setInterval(() => {
      if (document.hidden) return;
      const activeId = activeConversationIdRef.current;
      if (activeId) {
        void loadConversation(activeId, { silent: true });
      }
    }, 12_000);

    const listTimer = window.setInterval(() => {
      if (!document.hidden) {
        void loadConversations({ silent: true });
      }
    }, 30_000);

    window.addEventListener('focus', refreshVisibleMessages);

    return () => {
      window.clearInterval(conversationTimer);
      window.clearInterval(listTimer);
      window.removeEventListener('focus', refreshVisibleMessages);
    };
  }, [loadConversation, loadConversations]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter === 'unread' && conversation.unreadCount <= 0) return false;
      if (filter === 'order' && conversation.conversationType !== 'order') return false;
      if (filter === 'general' && conversation.conversationType !== 'general') return false;

      if (!query) return true;

      const searchable = [
        conversation.customerName,
        conversation.customerEmail,
        conversation.subject,
        conversation.orderId,
        conversation.latestMessage,
        fulfillmentLabel(conversation.orderFulfillment),
        statusLabel(conversation.orderStatus),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [conversations, filter, searchQuery]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations]
  );

  const handleSendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedConversationId || sendingReply) return;

    const message = replyMessage.trim();
    if (!message) return;

    setSendingReply(true);
    setConversationError('');

    try {
      const response = await fetch(
        `/api/messages/conversations/${selectedConversationId}/messages`,
        {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to send the Admin reply.'));
      }

      setReplyMessage('');
      await loadConversation(selectedConversationId, {
        silent: true,
        scrollToLatest: true,
      });
      await loadConversations({ silent: true });
      notifyUnreadChanged();
    } catch (error) {
      setConversationError(
        error instanceof Error ? error.message : 'Unable to send the Admin reply.'
      );
    } finally {
      setSendingReply(false);
    }
  };

  const selectConversation = (conversationId: number) => {
    setConversationError('');
    void loadConversation(conversationId, { scrollToLatest: true });
  };

  const closeConversationOnMobile = () => {
    setSelectedConversationId(null);
    setConversationDetail(null);
    setConversationError('');
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
              Customer Communication
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-[#17372D]">
              Messages
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71817A]">
              Reply to General Inquiries and order-related conversations while keeping each order discussion connected to its Order ID.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalUnread > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800">
                <MessageCircle className="h-3.5 w-3.5" />
                {totalUnread} unread customer {totalUnread === 1 ? 'message' : 'messages'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE6E0] bg-[#F7FAF8] px-3 py-1.5 text-[10px] font-bold text-[#61766d]">
                <CheckCheck className="h-3.5 w-3.5 text-[#15803d]" />
                Inbox up to date
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-[#E5ECE8] bg-[#F9FBFA] px-5 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#61766d]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#15803d]" />
              Only authenticated Admin users can view all customer conversations.
            </span>
            <span className="hidden h-3 w-px bg-[#DDE6E0] sm:block" />
            <span>New customer replies refresh automatically while this page is open.</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#DDE6E0] bg-white shadow-sm">
        <div className="grid h-[clamp(520px,calc(100dvh-21rem),720px)] min-h-0 overflow-hidden xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside
            className={`${
              selectedConversationId ? 'hidden xl:flex' : 'flex'
            } min-h-0 flex-col overflow-hidden border-r-0 border-[#E5ECE8] bg-[#FBFDFC] xl:border-r`}
          >
            <div className="border-b border-[#E5ECE8] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#829089]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search customer, order, or message"
                  aria-label="Search customer conversations"
                  className="h-10 w-full rounded-xl border border-[#DDE6E0] bg-white pl-9 pr-3 text-xs font-medium text-[#34463F] outline-none transition placeholder:text-[#9AA8A1] focus:border-[#2F7D5A] focus:ring-2 focus:ring-[#2F7D5A]/10"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Conversation filters">
                {([
                  ['all', 'All'],
                  ['unread', 'Unread'],
                  ['order', 'Orders'],
                  ['general', 'General'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      filter === value
                        ? 'bg-[#17372D] text-white'
                        : 'border border-[#DDE6E0] bg-white text-[#61766D] hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#166534]'
                    }`}
                  >
                    {label}
                    {value === 'unread' && totalUnread > 0 ? ` (${totalUnread})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#b9c9bf_transparent] [scrollbar-width:thin]">
              {loadingList ? (
                <div className="space-y-3 p-4" aria-label="Loading conversations">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="animate-pulse rounded-2xl border border-[#E6EEE9] bg-white p-4">
                      <div className="h-3 w-32 rounded bg-gray-200" />
                      <div className="mt-3 h-2.5 w-full rounded bg-gray-100" />
                      <div className="mt-2 h-2.5 w-3/4 rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : listError ? (
                <div className="p-5">
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs leading-5 text-red-700">
                    {listError}
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadConversations()}
                    className="mt-3 text-xs font-extrabold text-[#15803d] hover:text-[#166534]"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex min-h-[430px] flex-col items-center justify-center px-7 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#15803d]">
                    <Inbox className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold text-[#17372D]">
                    {searchQuery || filter !== 'all' ? 'No matching conversations' : 'No customer conversations yet'}
                  </h3>
                  <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-[#71817A]">
                    {searchQuery || filter !== 'all'
                      ? 'Try a different search term or filter.'
                      : 'General inquiries and order conversations will appear here when customers start using Messages.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#EDF2EF]">
                  {filteredConversations.map((conversation) => {
                    const isSelected = selectedConversationId === conversation.conversationId;
                    const title =
                      conversation.conversationType === 'order'
                        ? `Order ${conversation.orderId || ''}`
                        : conversation.subject || 'General Inquiry';
                    const previewPrefix =
                      conversation.latestSenderType === 'customer'
                        ? `${conversation.customerName}: `
                        : conversation.latestSenderType === 'admin'
                          ? 'You: '
                          : conversation.latestSenderType === 'system' && conversation.latestEventKey?.startsWith('ai_')
                            ? 'Rayjin Assistant: '
                            : conversation.latestSenderType === 'system'
                              ? 'System: '
                              : '';

                    return (
                      <button
                        key={conversation.conversationId}
                        type="button"
                        onClick={() => selectConversation(conversation.conversationId)}
                        className={`w-full px-4 py-4 text-left transition ${
                          isSelected
                            ? 'bg-[#EAF8F0]'
                            : conversation.unreadCount > 0
                              ? 'bg-emerald-50/45 hover:bg-emerald-50/75'
                              : 'bg-white hover:bg-[#F7FAF8]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            conversation.conversationType === 'order'
                              ? 'bg-[#17372D] text-white'
                              : 'bg-emerald-100 text-[#15803d]'
                          }`}>
                            {conversation.conversationType === 'order'
                              ? <ClipboardList className="h-4 w-4" />
                              : <MessageCircle className="h-4 w-4" />}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-extrabold text-[#17372D]">
                                  {conversation.customerName}
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] font-bold text-[#52645D]">
                                  {title}
                                </span>
                              </span>
                              <span className="shrink-0 text-[8px] font-medium text-[#829089]">
                                {formatRelativeTime(conversation.latestMessageAt || conversation.updatedAt)}
                              </span>
                            </span>

                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${
                                conversation.conversationType === 'order'
                                  ? 'bg-[#EEF4F0] text-[#52645D]'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {conversation.conversationType === 'order'
                                  ? fulfillmentLabel(conversation.orderFulfillment)
                                  : 'General'}
                              </span>
                              {conversation.conversationType === 'order' && (
                                <span className="text-[8px] font-semibold text-[#71817A]">
                                  {statusLabel(conversation.orderStatus)}
                                </span>
                              )}
                              {conversation.unreadCount > 0 && (
                                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#15803d] px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </span>

                            <span className={`mt-1.5 block truncate text-[10px] leading-4 ${
                              conversation.unreadCount > 0
                                ? 'font-semibold text-[#405149]'
                                : 'text-[#829089]'
                            }`}>
                              {conversation.latestMessage
                                ? `${previewPrefix}${conversation.latestMessage}`
                                : 'No messages yet'}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <div className={`${selectedConversationId ? 'flex' : 'hidden xl:flex'} fixed inset-x-0 bottom-0 top-16 z-[60] min-h-0 min-w-0 flex-col overflow-hidden bg-[#F8FBF9] xl:static xl:z-auto`}>
            {conversationDetail ? (
              <>
                <header className="shrink-0 border-b border-[#E5ECE8] bg-white px-4 py-4 sm:px-5">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={closeConversationOnMobile}
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE6E0] text-[#52645D] hover:bg-[#F1F8F4] xl:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17372D] text-white">
                      <UserRound className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-extrabold text-[#17372D]">
                            {conversationDetail.conversation.customerName}
                          </h3>
                          <p className="mt-0.5 truncate text-[10px] text-[#71817A]">
                            {conversationDetail.conversation.customerEmail || 'Customer account'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {conversationDetail.conversation.conversationType === 'general' ? (
                              <>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wide text-emerald-700">
                                  General Inquiry
                                </span>
                                <span className="text-[10px] font-bold text-[#405149]">
                                  {conversationDetail.conversation.subject || 'General Inquiry'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="rounded-full bg-[#EEF4F0] px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wide text-[#52645D]">
                                  {fulfillmentLabel(conversationDetail.conversation.orderFulfillment)}
                                </span>
                                <span className="text-[10px] font-bold text-[#405149]">
                                  {conversationDetail.conversation.orderId}
                                </span>
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">
                                  {statusLabel(conversationDetail.conversation.orderStatus)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {conversationDetail.conversation.orderId && onOpenOrder && (
                          <button
                            type="button"
                            onClick={() => onOpenOrder(conversationDetail.conversation.orderId as string)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#CFE0D7] bg-white px-3 py-2 text-[10px] font-bold text-[#0D6337] transition hover:bg-[#F1F8F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            Open Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </header>

                <AdminAiTools
                  conversationId={conversationDetail.conversation.conversationId}
                  onUseSuggestedReply={(value) => setReplyMessage(value.slice(0, messageLimit))}
                />

                <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 py-5 [scrollbar-color:#b9c9bf_transparent] [scrollbar-width:thin] sm:px-5">
                  {loadingConversation ? (
                    <div className="flex min-h-[420px] items-center justify-center text-xs font-semibold text-[#71817A]">
                      Loading conversation…
                    </div>
                  ) : conversationError && !conversationDetail ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-5 text-center text-xs leading-5 text-red-700">
                      {conversationError}
                    </div>
                  ) : (
                    <div className="mx-auto max-w-3xl space-y-4">
                      {conversationDetail.conversation.conversationType === 'order' && (
                        <div className="rounded-2xl border border-[#DDE6E0] bg-white px-4 py-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-[#15803d]" />
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#52635B]">
                                Order Conversation
                              </span>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                              {statusLabel(conversationDetail.conversation.orderStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-[#819087]">
                            Messages in this thread are connected to {conversationDetail.conversation.orderId}. Use Manage Orders for operational status changes; use this thread for customer communication.
                          </p>
                        </div>
                      )}

                      {conversationDetail.messages.length === 0 ? (
                        <div className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15803d] shadow-sm ring-1 ring-[#E1EAE4]">
                            <Mail className="h-6 w-6" />
                          </span>
                          <h4 className="mt-4 text-sm font-extrabold text-[#17372D]">No messages yet</h4>
                        </div>
                      ) : (
                        conversationDetail.messages.map((message) => {
                          if (message.senderType === 'system') {
                            const isAssistant = Boolean(message.eventKey?.startsWith('ai_'));
                            return (
                              <div key={message.messageId} className="flex justify-center py-1">
                                <div className={`max-w-xl rounded-2xl border px-4 py-3 text-center ${isAssistant ? 'border-emerald-200 bg-white shadow-sm' : 'border-emerald-100 bg-emerald-50/80'}`}>
                                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {isAssistant ? 'Rayjin Assistant · AI' : 'System Update'}
                                  </div>
                                  <p className="mt-1.5 whitespace-pre-wrap text-[11px] font-medium leading-5 text-[#36574B]">
                                    {message.message}
                                  </p>
                                  <span className="mt-1.5 block text-[8px] text-[#8A9992]">
                                    {formatDateTime(message.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          const isAdmin = message.senderType === 'admin';

                          return (
                            <div
                              key={message.messageId}
                              className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex max-w-[88%] items-end gap-2 sm:max-w-[74%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                  isAdmin
                                    ? 'bg-[#15803d] text-white'
                                    : 'border border-[#DDE6E0] bg-white text-[#17372D]'
                                }`}>
                                  {isAdmin
                                    ? <ShieldCheck className="h-3.5 w-3.5" />
                                    : <UserRound className="h-3.5 w-3.5" />}
                                </span>

                                <div>
                                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                                    isAdmin
                                      ? 'rounded-br-md bg-[#15803d] text-white'
                                      : 'rounded-bl-md border border-[#DDE6E0] bg-white text-[#314D42]'
                                  }`}>
                                    <p className="whitespace-pre-wrap break-words text-xs leading-5">
                                      {message.message}
                                    </p>
                                  </div>
                                  <div className={`mt-1 flex items-center gap-1.5 text-[8px] text-[#8A9992] ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                    <span>{isAdmin ? 'You' : message.senderName || conversationDetail.conversation.customerName}</span>
                                    <span>•</span>
                                    <span>{formatDateTime(message.createdAt)}</span>
                                    {isAdmin && message.readAt && (
                                      <CheckCheck className="h-3 w-3 text-emerald-600" aria-label="Read by customer" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="shrink-0 border-t border-[#E5ECE8] bg-white px-4 py-3 shadow-[0_-10px_28px_-24px_rgba(11,59,35,0.45)] sm:px-5">
                  {conversationError && conversationDetail && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">
                      {conversationError}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="admin-conversation-reply" className="sr-only">
                        Reply to customer
                      </label>
                      <textarea
                        id="admin-conversation-reply"
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        maxLength={messageLimit}
                        rows={2}
                        placeholder="Write a reply to the customer…"
                        className="max-h-28 min-h-[46px] w-full resize-none overflow-y-auto rounded-2xl border border-[#DDE6E0] bg-[#F9FBFA] px-4 py-3 text-xs leading-5 text-[#34463F] outline-none transition placeholder:text-[#A0ADA6] focus:border-[#2F7D5A] focus:bg-white focus:ring-2 focus:ring-[#2F7D5A]/10"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            if (replyMessage.trim() && !sendingReply) {
                              event.currentTarget.form?.requestSubmit();
                            }
                          }
                        }}
                      />
                      <div className="mt-1 flex justify-between px-1 text-[8px] text-[#9AA8A1]">
                        <span>Enter to send · Shift+Enter for a new line</span>
                        <span>{replyMessage.length}/{messageLimit}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!replyMessage.trim() || sendingReply}
                      className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#15803d] text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      aria-label="Send Admin reply"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div className="max-w-sm">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-[#15803d] ring-1 ring-emerald-100">
                    <MessagesSquare className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-[#17372D]">
                    Select a customer conversation
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[#71817A]">
                    Choose a conversation from the inbox to review the full history and send an Admin reply.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
