import {
  ArrowLeft,
  CheckCheck,
  ClipboardList,
  Inbox,
  MessageCircle,
  MessagesSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { CustomerAssistantPanel } from './CustomerAssistantPanel';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface CustomerMessageOrder {
  id: string;
  status: string;
  fulfillment: 'pickup' | 'delivery' | 'shop_go';
  created_at?: string | null;
}

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

interface CustomerMessagesProps {
  orders: CustomerMessageOrder[];
  requestedOrderId?: string | null;
  onRequestedOrderHandled?: () => void;
}

type InboxFilter = 'all' | 'order' | 'general';
type ComposerMode = 'general' | 'order';

const DEFAULT_MESSAGE_LIMIT = 1000;
const DEFAULT_SUBJECT_LIMIT = 150;

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

export function CustomerMessages({
  orders,
  requestedOrderId = null,
  onRequestedOrderHandled,
}: CustomerMessagesProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [listError, setListError] = useState('');
  const [conversationError, setConversationError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newConversationType, setNewConversationType] = useState<ComposerMode>('general');
  const [newSubject, setNewSubject] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [limits, setLimits] = useState({
    maxMessageLength: DEFAULT_MESSAGE_LIMIT,
    maxSubjectLength: DEFAULT_SUBJECT_LIMIT,
    minSubjectLength: 3,
  });

  const activeConversationIdRef = useRef<number | null>(null);
  const handledOrderIdRef = useRef<string | null>(null);
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
      setListError('Your session is unavailable. Please sign in again.');
      setLoadingList(false);
      return;
    }

    if (!silent) setLoadingList(true);

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to load your conversations.'));
      }

      const payload = await response.json();
      setConversations(Array.isArray(payload?.conversations) ? payload.conversations : []);
      setListError('');
    } catch (error) {
      if (!silent) {
        setListError(error instanceof Error ? error.message : 'Unable to load your conversations.');
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

      const hasUnreadForCustomer = Array.isArray(payload?.messages)
        ? payload.messages.some(
            (message) =>
              !message.readAt &&
              (message.senderType === 'admin' || message.senderType === 'system')
          )
        : false;

      if (hasUnreadForCustomer) {
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

        setLimits({
          maxMessageLength: Number(payload?.maxMessageLength || DEFAULT_MESSAGE_LIMIT),
          maxSubjectLength: Number(payload?.maxSubjectLength || DEFAULT_SUBJECT_LIMIT),
          minSubjectLength: Number(payload?.minSubjectLength || 3),
        });
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

  useEffect(() => {
    const cleanOrderId = String(requestedOrderId || '').trim();
    if (!cleanOrderId || handledOrderIdRef.current === cleanOrderId) return;

    handledOrderIdRef.current = cleanOrderId;

    const openRequestedOrderConversation = async () => {
      setLoadingConversation(true);
      setConversationError('');
      setShowNewMessage(false);

      try {
        const response = await fetch('/api/messages/conversations', {
          method: 'POST',
          headers: authHeaders(true),
          body: JSON.stringify({
            conversationType: 'order',
            orderId: cleanOrderId,
          }),
        });

        if (!response.ok) {
          throw new Error(
            await readApiError(response, 'Unable to open this order conversation.')
          );
        }

        const payload = (await response.json()) as ConversationDetail;
        const conversationId = Number(payload?.conversation?.conversationId);

        if (!Number.isInteger(conversationId)) {
          throw new Error('The order conversation could not be resolved.');
        }

        await loadConversation(conversationId, { scrollToLatest: true });
        await loadConversations({ silent: true });
        onRequestedOrderHandled?.();
      } catch (error) {
        setConversationError(
          error instanceof Error ? error.message : 'Unable to open this order conversation.'
        );
      } finally {
        setLoadingConversation(false);
      }
    };

    void openRequestedOrderConversation();
  }, [
    requestedOrderId,
    onRequestedOrderHandled,
    loadConversation,
    loadConversations,
  ]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter !== 'all' && conversation.conversationType !== filter) {
        return false;
      }

      if (!query) return true;

      const searchable = [
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

  const startNewMessage = () => {
    setSelectedConversationId(null);
    setConversationDetail(null);
    setConversationError('');
    setShowNewMessage(true);
    setNewConversationType('general');
    setNewSubject('');
    setNewOrderId('');
    setNewMessage('');
  };

  const closeConversationOnMobile = () => {
    setSelectedConversationId(null);
    setConversationDetail(null);
    setConversationError('');
    setShowNewMessage(false);
  };

  const handleCreateConversation = async (event: FormEvent) => {
    event.preventDefault();
    if (creatingConversation) return;

    const cleanMessage = newMessage.trim();
    if (!cleanMessage) {
      setConversationError('Please enter a message before sending.');
      return;
    }

    if (newConversationType === 'general') {
      const subject = newSubject.trim();
      if (subject.length < limits.minSubjectLength) {
        setConversationError(
          `Subject must be at least ${limits.minSubjectLength} characters.`
        );
        return;
      }
    } else if (!newOrderId) {
      setConversationError('Please choose the order you want to ask about.');
      return;
    }

    setCreatingConversation(true);
    setConversationError('');

    try {
      const body =
        newConversationType === 'general'
          ? {
              conversationType: 'general',
              subject: newSubject.trim(),
              message: cleanMessage,
            }
          : {
              conversationType: 'order',
              orderId: newOrderId,
              message: cleanMessage,
            };

      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to start the conversation.'));
      }

      const payload = (await response.json()) as ConversationDetail;
      const conversationId = Number(payload?.conversation?.conversationId);

      setShowNewMessage(false);
      setNewSubject('');
      setNewOrderId('');
      setNewMessage('');

      await loadConversations({ silent: true });
      if (Number.isInteger(conversationId)) {
        await loadConversation(conversationId, { scrollToLatest: true });
      }
      notifyUnreadChanged();
    } catch (error) {
      setConversationError(
        error instanceof Error ? error.message : 'Unable to start the conversation.'
      );
    } finally {
      setCreatingConversation(false);
    }
  };

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
        throw new Error(await readApiError(response, 'Unable to send your message.'));
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
        error instanceof Error ? error.message : 'Unable to send your message.'
      );
    } finally {
      setSendingReply(false);
    }
  };

  const selectConversation = (conversationId: number) => {
    setShowNewMessage(false);
    setConversationError('');
    void loadConversation(conversationId, { scrollToLatest: true });
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <section className="overflow-hidden rounded-[28px] border border-[#dfe9e2] bg-white shadow-[0_18px_45px_-34px_rgba(11,59,35,0.45)]">
        <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#15803d] ring-1 ring-emerald-100">
                <MessagesSquare className="h-[18px] w-[18px]" />
              </span>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#15803d]">
                Customer communication
              </p>
            </div>

            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#17372d]">
              Messages
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#61766d]">
              Ask Rayjin Hardware about products, pickup, delivery, Shop &amp; Go, or a specific order. Order conversations stay connected to their Order ID for easier follow-up.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalUnread > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-800">
                <MessageCircle className="h-3.5 w-3.5" />
                {totalUnread} unread
              </span>
            )}

            <button
              type="button"
              onClick={startNewMessage}
              className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166534] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              New Message
            </button>
          </div>
        </div>

        <div className="border-t border-[#e6eee9] bg-[#fbfdfc] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#61766d]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#15803d]" />
              Messages are available only inside your signed-in customer account.
            </span>
            <span className="hidden h-3 w-px bg-[#dfe9e2] sm:block" />
            <span>New replies refresh automatically while this page is open.</span>
          </div>
        </div>
      </section>

      <CustomerAssistantPanel
        conversationId={selectedConversationId}
        onMessageStored={() => {
          if (selectedConversationId) {
            void loadConversation(selectedConversationId, { silent: true, scrollToLatest: true });
            void loadConversations({ silent: true });
          }
        }}
        onTalkToAdmin={() => {
          if (!selectedConversationId) {
            startNewMessage();
            return;
          }
          setReplyMessage((current) => current || 'I need assistance from Rayjin Hardware Admin regarding this concern.');
          requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
        }}
      />

      <section className="overflow-hidden rounded-[26px] border border-[#dfe9e2] bg-white shadow-[0_20px_48px_-36px_rgba(11,59,35,0.58)]">
        <div className="grid h-[clamp(440px,calc(100dvh-29rem),680px)] min-h-0 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={`${
              selectedConversationId || showNewMessage ? 'hidden lg:flex' : 'flex'
            } min-h-0 flex-col overflow-hidden border-r-0 border-[#e3ece6] bg-[#fbfdfc] lg:border-r`}
          >
            <div className="border-b border-[#e3ece6] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9992]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search conversations"
                  aria-label="Search conversations"
                  className="h-10 w-full rounded-xl border border-[#dde7e1] bg-white pl-9 pr-3 text-xs font-medium text-[#314d42] outline-none transition placeholder:text-[#9aa8a1] focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="mt-3 flex gap-1.5" role="group" aria-label="Conversation filters">
                {([
                  ['all', 'All'],
                  ['order', 'Orders'],
                  ['general', 'General'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      filter === value
                        ? 'bg-[#17372d] text-white'
                        : 'border border-[#dfe9e2] bg-white text-[#61766d] hover:border-emerald-200 hover:bg-emerald-50 hover:text-[#166534]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#b9c9bf_transparent] [scrollbar-width:thin]">
              {loadingList ? (
                <div className="space-y-3 p-4" aria-label="Loading conversations">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="animate-pulse rounded-2xl border border-[#e6eee9] bg-white p-4">
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
                <div className="flex min-h-[420px] flex-col items-center justify-center px-7 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#15803d]">
                    <Inbox className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold text-[#17372d]">
                    {searchQuery || filter !== 'all' ? 'No matching conversations' : 'Your inbox is ready'}
                  </h3>
                  <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-[#71827a]">
                    {searchQuery || filter !== 'all'
                      ? 'Try a different search or filter.'
                      : 'Start a general inquiry or message Rayjin Hardware about one of your orders.'}
                  </p>
                  {!searchQuery && filter === 'all' && (
                    <button
                      type="button"
                      onClick={startNewMessage}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-[11px] font-extrabold text-[#15803d] transition hover:bg-emerald-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Start a message
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#edf2ef]">
                  {filteredConversations.map((conversation) => {
                    const isSelected = selectedConversationId === conversation.conversationId;
                    const title =
                      conversation.conversationType === 'order'
                        ? `Order ${conversation.orderId || ''}`
                        : conversation.subject || 'General Inquiry';
                    const previewPrefix =
                      conversation.latestSenderType === 'customer'
                        ? 'You: '
                        : conversation.latestSenderType === 'system' && conversation.latestEventKey?.startsWith('ai_')
                          ? 'Rayjin Assistant: '
                          : conversation.latestSenderType
                            ? 'Rayjin Hardware: '
                            : '';

                    return (
                      <button
                        key={conversation.conversationId}
                        type="button"
                        onClick={() => selectConversation(conversation.conversationId)}
                        className={`group w-full px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
                          isSelected
                            ? 'bg-emerald-50/80'
                            : conversation.unreadCount > 0
                              ? 'bg-white hover:bg-emerald-50/50'
                              : 'bg-transparent hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              conversation.conversationType === 'order'
                                ? 'bg-[#17372d] text-white'
                                : 'bg-emerald-100 text-[#15803d]'
                            }`}
                          >
                            {conversation.conversationType === 'order' ? (
                              <ShoppingBag className="h-4 w-4" />
                            ) : (
                              <MessageCircle className="h-4 w-4" />
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className={`truncate text-xs ${conversation.unreadCount > 0 ? 'font-extrabold text-[#17372d]' : 'font-bold text-[#314d42]'}`}>
                                {title}
                              </span>
                              <span className="shrink-0 text-[9px] font-medium text-[#8a9992]">
                                {formatRelativeTime(conversation.latestMessageAt || conversation.updatedAt)}
                              </span>
                            </span>

                            <span className="mt-1 flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
                                conversation.conversationType === 'order'
                                  ? 'bg-[#edf4ef] text-[#52635b]'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {conversation.conversationType === 'order' ? fulfillmentLabel(conversation.orderFulfillment) : 'General'}
                              </span>
                              {conversation.orderStatus && (
                                <span className="truncate text-[9px] font-semibold text-[#819087]">
                                  {statusLabel(conversation.orderStatus)}
                                </span>
                              )}
                            </span>

                            <span className={`mt-2 block truncate text-[10px] leading-4 ${conversation.unreadCount > 0 ? 'font-semibold text-[#52635b]' : 'text-[#819087]'}`}>
                              {conversation.latestMessage
                                ? `${previewPrefix}${conversation.latestMessage}`
                                : 'No messages yet — open this conversation to start.'}
                            </span>
                          </span>

                          {conversation.unreadCount > 0 && (
                            <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[#15803d] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#e3ece6] bg-white px-4 py-3">
              <p className="text-[9px] leading-4 text-[#8a9992]">
                {conversations.length} conversation{conversations.length === 1 ? '' : 's'} in your account
              </p>
            </div>
          </aside>

          <div
            className={`${
              selectedConversationId || showNewMessage ? 'flex' : 'hidden lg:flex'
            } fixed inset-x-0 bottom-0 top-16 z-[60] min-h-0 min-w-0 flex-col overflow-hidden bg-white lg:static lg:z-auto`}
          >
            {showNewMessage ? (
              <>
                <div className="shrink-0 flex items-center gap-3 border-b border-[#e6eee9] px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={closeConversationOnMobile}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe9e2] text-[#52635b] transition hover:bg-emerald-50 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#15803d]">
                      New conversation
                    </p>
                    <h3 className="mt-1 text-base font-extrabold text-[#17372d]">
                      How can Rayjin Hardware help?
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewMessage(false)}
                    className="ml-auto hidden h-9 w-9 items-center justify-center rounded-xl text-[#71827a] transition hover:bg-[#f1f6f3] lg:flex"
                    aria-label="Close new message"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateConversation} className="flex flex-1 flex-col">
                  <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                    <div>
                      <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#61766d]">
                        Message Type
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setNewConversationType('general')}
                          className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                            newConversationType === 'general'
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-[#dfe9e2] bg-white hover:border-emerald-200 hover:bg-[#fbfdfc]'
                          }`}
                        >
                          <MessageCircle className="h-5 w-5 text-[#15803d]" />
                          <span className="mt-3 block text-xs font-extrabold text-[#17372d]">
                            General question
                          </span>
                          <span className="mt-1 block text-[10px] leading-4 text-[#71827a]">
                            Ask about a product, store service, pickup, or delivery.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewConversationType('order')}
                          className={`rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                            newConversationType === 'order'
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-[#dfe9e2] bg-white hover:border-emerald-200 hover:bg-[#fbfdfc]'
                          }`}
                        >
                          <ClipboardList className="h-5 w-5 text-[#15803d]" />
                          <span className="mt-3 block text-xs font-extrabold text-[#17372d]">
                            About an order
                          </span>
                          <span className="mt-1 block text-[10px] leading-4 text-[#71827a]">
                            Keep your question connected to a specific Order ID.
                          </span>
                        </button>
                      </div>
                    </div>

                    {newConversationType === 'general' ? (
                      <div>
                        <label htmlFor="message-subject" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                          Subject
                        </label>
                        <input
                          id="message-subject"
                          type="text"
                          value={newSubject}
                          onChange={(event) => setNewSubject(event.target.value)}
                          maxLength={limits.maxSubjectLength}
                          placeholder="Example: 1-inch PVC availability"
                          className="h-11 w-full rounded-xl border border-[#dfe9e2] bg-white px-4 text-xs font-semibold text-[#314d42] outline-none transition placeholder:text-[#a0ada6] focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                        />
                        <p className="mt-1.5 text-right text-[9px] text-[#9aa8a1]">
                          {newSubject.length}/{limits.maxSubjectLength}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="message-order" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                          Order
                        </label>
                        <select
                          id="message-order"
                          value={newOrderId}
                          onChange={(event) => setNewOrderId(event.target.value)}
                          className="h-11 w-full rounded-xl border border-[#dfe9e2] bg-white px-4 text-xs font-semibold text-[#314d42] outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="">Select an order</option>
                          {orders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.id} — {fulfillmentLabel(order.fulfillment)} — {statusLabel(order.status)}
                            </option>
                          ))}
                        </select>
                        {orders.length === 0 && (
                          <p className="mt-2 text-[10px] text-amber-700">
                            You do not have an order record to attach yet. Use a General question instead.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="new-message-body" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#819087]">
                        Message
                      </label>
                      <textarea
                        id="new-message-body"
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        maxLength={limits.maxMessageLength}
                        rows={7}
                        placeholder="Write your question or concern clearly so our team can help you."
                        className="w-full resize-none rounded-2xl border border-[#dfe9e2] bg-white px-4 py-3 text-sm leading-6 text-[#314d42] outline-none transition placeholder:text-[#a0ada6] focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                      />
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-[9px] text-[#9aa8a1]">
                        <span>Please avoid sending passwords or payment-card details.</span>
                        <span>{newMessage.length}/{limits.maxMessageLength}</span>
                      </div>
                    </div>

                    {conversationError && (
                      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                        {conversationError}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-[#e6eee9] bg-[#fbfdfc] px-5 py-4 sm:px-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewMessage(false)}
                        className="rounded-xl border border-[#dfe9e2] bg-white px-4 py-2.5 text-xs font-bold text-[#61766d] transition hover:bg-[#f1f6f3]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingConversation}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#15803d] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {creatingConversation ? 'Sending…' : 'Send Message'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : selectedConversationId ? (
              <>
                <div className="shrink-0 flex items-center gap-3 border-b border-[#e6eee9] px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={closeConversationOnMobile}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dfe9e2] text-[#52635b] transition hover:bg-emerald-50 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17372d] text-white shadow-sm">
                    <ShieldCheck className="h-[18px] w-[18px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#17372d]">
                      {conversationDetail?.conversation.conversationType === 'order'
                        ? `Order ${conversationDetail?.conversation.orderId || ''}`
                        : conversationDetail?.conversation.subject || 'General Inquiry'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-[#71827a]">
                      <span>Rayjin Hardware</span>
                      {conversationDetail?.conversation.conversationType === 'order' && (
                        <>
                          <span>•</span>
                          <span>{fulfillmentLabel(conversationDetail.conversation.orderFulfillment)}</span>
                          <span>•</span>
                          <span>{statusLabel(conversationDetail.conversation.orderStatus)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {conversationDetail?.conversation.conversationType === 'order' && (
                    <span className="hidden rounded-full border border-[#dfe9e2] bg-[#fbfdfc] px-3 py-1.5 text-[9px] font-extrabold text-[#52635b] sm:inline-flex">
                      Order Conversation
                    </span>
                  )}
                </div>

                <div ref={messagesViewportRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-[#f8fbf9] px-4 py-5 [scrollbar-color:#b9c9bf_transparent] [scrollbar-width:thin] sm:px-6">
                  {loadingConversation && !conversationDetail ? (
                    <div className="flex h-full min-h-[360px] items-center justify-center">
                      <div className="text-center">
                        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-[#15803d]" />
                        <p className="mt-3 text-xs font-semibold text-[#71827a]">Loading conversation…</p>
                      </div>
                    </div>
                  ) : conversationError && !conversationDetail ? (
                    <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-red-50 p-5 text-center text-xs leading-5 text-red-700">
                      {conversationError}
                    </div>
                  ) : conversationDetail ? (
                    <div className="mx-auto max-w-3xl space-y-4">
                      {conversationDetail.conversation.conversationType === 'order' && (
                        <div className="rounded-2xl border border-[#dfe9e2] bg-white px-4 py-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-4 w-4 text-[#15803d]" />
                              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#52635b]">
                                {conversationDetail.conversation.orderId}
                              </span>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                              {statusLabel(conversationDetail.conversation.orderStatus)}
                            </span>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-[#819087]">
                            This conversation is linked to your {fulfillmentLabel(conversationDetail.conversation.orderFulfillment)} order. Operational status and payment details remain available in My Orders.
                          </p>
                        </div>
                      )}

                      {conversationDetail.messages.length === 0 ? (
                        <div className="py-14 text-center">
                          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#15803d] shadow-sm ring-1 ring-[#e1eae4]">
                            <MessageCircle className="h-6 w-6" />
                          </span>
                          <h4 className="mt-4 text-sm font-extrabold text-[#17372d]">Start the conversation</h4>
                          <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[#71827a]">
                            Send a message below and it will stay connected to this conversation.
                          </p>
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
                                    {isAssistant ? 'Rayjin Assistant · AI' : 'Rayjin Hardware Update'}
                                  </div>
                                  <p className="mt-1.5 whitespace-pre-wrap text-[11px] font-medium leading-5 text-[#36574b]">
                                    {message.message}
                                  </p>
                                  <span className="mt-1.5 block text-[8px] text-[#8a9992]">
                                    {formatDateTime(message.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          const isCustomer = message.senderType === 'customer';

                          return (
                            <div
                              key={message.messageId}
                              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex max-w-[86%] items-end gap-2 sm:max-w-[72%] ${isCustomer ? 'flex-row-reverse' : ''}`}>
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                  isCustomer
                                    ? 'bg-[#15803d] text-white'
                                    : 'border border-[#dfe9e2] bg-white text-[#15803d]'
                                }`}>
                                  {isCustomer ? <UserRound className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                                </span>

                                <div>
                                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                                    isCustomer
                                      ? 'rounded-br-md bg-[#15803d] text-white'
                                      : 'rounded-bl-md border border-[#dfe9e2] bg-white text-[#314d42]'
                                  }`}>
                                    <p className="whitespace-pre-wrap break-words text-xs leading-5">
                                      {message.message}
                                    </p>
                                  </div>
                                  <div className={`mt-1 flex items-center gap-1.5 text-[8px] text-[#8a9992] ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                                    <span>{isCustomer ? 'You' : 'Rayjin Hardware'}</span>
                                    <span>•</span>
                                    <span>{formatDateTime(message.createdAt)}</span>
                                    {isCustomer && message.readAt && (
                                      <CheckCheck className="h-3 w-3 text-emerald-600" aria-label="Read" />
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
                  ) : null}
                </div>

                <form onSubmit={handleSendReply} className="shrink-0 border-t border-[#e6eee9] bg-white px-4 py-3 shadow-[0_-10px_28px_-24px_rgba(11,59,35,0.45)] sm:px-5">
                  {conversationError && conversationDetail && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-semibold text-red-700">
                      {conversationError}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor="conversation-reply" className="sr-only">
                        Reply to Rayjin Hardware
                      </label>
                      <textarea
                        id="conversation-reply"
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                        maxLength={limits.maxMessageLength}
                        rows={2}
                        placeholder="Write a reply…"
                        className="max-h-28 min-h-[46px] w-full resize-none overflow-y-auto rounded-2xl border border-[#dfe9e2] bg-[#fbfdfc] px-4 py-3 text-xs leading-5 text-[#314d42] outline-none transition placeholder:text-[#a0ada6] focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            if (replyMessage.trim() && !sendingReply) {
                              event.currentTarget.form?.requestSubmit();
                            }
                          }
                        }}
                      />
                      <div className="mt-1 flex justify-between px-1 text-[8px] text-[#9aa8a1]">
                        <span>Enter to send · Shift+Enter for a new line</span>
                        <span>{replyMessage.length}/{limits.maxMessageLength}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!replyMessage.trim() || sendingReply}
                      className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#15803d] text-white shadow-sm transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                      aria-label="Send reply"
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
                  <h3 className="mt-5 text-lg font-extrabold text-[#17372d]">
                    Select a conversation
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[#71827a]">
                    Choose a conversation from your inbox to view the full history and reply to Rayjin Hardware.
                  </p>
                  <button
                    type="button"
                    onClick={startNewMessage}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#15803d] transition hover:bg-emerald-50"
                  >
                    <Plus className="h-4 w-4" />
                    New Message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
