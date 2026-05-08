import { useState, useRef, useEffect } from "react";
import { X, Send, MessageSquare, Search, ChevronRight, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};
type View = "home" | "messages" | "help" | "conversation";

const WEBHOOK_URL =
  "https://auvia-io.app.n8n.cloud/webhook/4a682286-88f0-4e81-af89-39765db7cc63/chat";

const FALLBACK_REPLY =
  "Sorry, I'm having trouble connecting right now. Please emails us at **admin@auvia.io** or try again in a moment.";

const HELP_ARTICLES = [
  {
    title: "What does Auvia do?",
    preview:
      "Auvia answers your enquiries in seconds, qualifies the lead, and books a meeting straight into your fee earner's calendar, 24 hours a day.",
  },
  {
    title: "How quickly can it go live on our site?",
    preview:
      "We learn your firm, build it, and deploy within days. No technical work required from your team.",
  },
  {
    title: "Does it work for accountancy firms too?",
    preview:
      "Yes, Auvia is built for both law firms and accountancy practices. We tune the qualification flow to your practice areas.",
  },
  {
    title: "How much does it cost?",
    preview:
      "Pricing depends on enquiry volume and the practice areas you want covered. Send us a note and we'll come back with tailored numbers.",
  },
];

// 24 hours — after this, the conversation auto-resets so the agent doesn't
// resurface stale context the next day.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "jqs_chat_state_v1";

type StoredState = {
  sessionId: string;
  messages: Message[];
  createdAt: number;
};

function newSessionId(): string {
  return "sess_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
}

function loadStoredState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (
        parsed &&
        typeof parsed.sessionId === "string" &&
        Array.isArray(parsed.messages) &&
        typeof parsed.createdAt === "number" &&
        Date.now() - parsed.createdAt < SESSION_TTL_MS
      ) {
        return parsed;
      }
    }
  } catch {
    // localStorage may be unavailable (e.g. some embedded contexts) — fall through.
  }
  return { sessionId: newSessionId(), messages: [], createdAt: Date.now() };
}

function saveStoredState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quietly ignore quota / availability errors.
  }
}

async function callWebhook(message: string, sessionId: string): Promise<string> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatInput: message, sessionId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // n8n Chat Trigger returns { output: "..." }; tolerate a few common shapes.
    const reply = data.output ?? data.reply ?? data.text ?? data.message;
    if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty reply");
    return reply.trim();
  } catch (err) {
    console.error("Webhook error:", err);
    return FALLBACK_REPLY;
  }
}

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1">
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
  </div>
);

const TeamAvatars = () => (
  <div className="flex -space-x-2">
    {["bg-primary", "bg-accent", "bg-secondary"].map((c, i) => (
      <div
        key={i}
        className={`w-7 h-7 rounded-full border-2 border-background ${c} flex items-center justify-center text-[10px] font-semibold text-white`}
      >
        {["J", "Q", "S"][i]}
      </div>
    ))}
  </div>
);

export const Chatbot = () => {
  // Restore session + history (if any) from localStorage on first render.
  const initialState = useRef<StoredState>(loadStoredState());
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [messages, setMessages] = useState<Message[]>(initialState.current.messages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>(initialState.current.sessionId);
  const createdAtRef = useRef<number>(initialState.current.createdAt);

  // Persist messages whenever they change so the conversation survives reloads
  // and cross-page navigation within the 24-hour TTL.
  useEffect(() => {
    saveStoredState({
      sessionId: sessionIdRef.current,
      messages,
      createdAt: createdAtRef.current,
    });
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (view === "conversation" && inputRef.current) inputRef.current.focus();
  }, [view]);

  // Re-focus the input after each new message so the user can keep typing
  // without clicking back into the box.
  useEffect(() => {
    if (view === "conversation" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, view]);

  // Allow other parts of the page (e.g. the homepage hero CTA) to open the
  // chatbot via a window event — keeps the bot's internal state private.
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setView("conversation");
    };
    window.addEventListener("open-chatbot", onOpen);
    return () => window.removeEventListener("open-chatbot", onOpen);
  }, []);

  // When the conversation view first opens with no messages, ask n8n for its
  // opening greeting so the welcome message comes from the AI, not hardcoded.
  const greetedRef = useRef(false);
  useEffect(() => {
    if (view !== "conversation" || greetedRef.current || messages.length > 0) return;
    greetedRef.current = true;
    void (async () => {
      setIsTyping(true);
      const reply = await callWebhook("__init__", sessionIdRef.current);
      setMessages([{ role: "assistant", content: reply }]);
      setIsTyping(false);
    })();
  }, [view, messages.length]);

  const startConversation = (seed?: string) => {
    setView("conversation");
    if (seed) setTimeout(() => handleSend(seed), 100);
  };

  // Queue of messages waiting to be dispatched. Allows the user to keep typing
  // while the agent is still replying — each queued message is sent in order
  // as soon as the previous reply completes.
  const pendingQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    while (pendingQueueRef.current.length > 0) {
      const next = pendingQueueRef.current.shift()!;
      setIsTyping(true);
      const reply = await callWebhook(next, sessionIdRef.current);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsTyping(false);
    }
    isProcessingRef.current = false;
  };

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    pendingQueueRef.current.push(msg);
    void processQueue();
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] h-[540px] max-h-[calc(100vh-7rem)] rounded-2xl bg-background shadow-2xl shadow-foreground/10 border border-border overflow-hidden flex flex-col">
          {view === "home" && (
            <>
              <div className="relative px-5 pt-5 pb-6 bg-linear-to-br from-primary via-primary to-secondary text-primary-foreground">
                <div className="flex items-start justify-between mb-4">
                  <TeamAvatars />
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <h2 className="text-xl font-semibold leading-tight mb-0.5">
                  Hi there{" "}
                  <span
                    className="inline-block"
                    style={{ animation: "wiggle 1s ease-in-out infinite" }}
                  >
                    👋
                  </span>
                </h2>
                <h2 className="text-xl font-semibold leading-tight opacity-80">How can we help?</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 space-y-3">
                <button
                  onClick={() => startConversation()}
                  className="w-full bg-card border border-border rounded-xl p-4 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-card-foreground">
                      Send us a message
                    </h3>
                    <Send className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We typically reply in a few minutes
                  </p>
                </button>
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-card-foreground mb-2">
                      Find an answer fast
                    </h3>
                    <button
                      onClick={() => setView("help")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-left"
                    >
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Search for help</span>
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {HELP_ARTICLES.slice(0, 3).map((a) => (
                      <button
                        key={a.title}
                        onClick={() => startConversation(a.title)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors group"
                      >
                        <span className="text-xs text-card-foreground line-clamp-1">{a.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background grid grid-cols-3">
                <button
                  onClick={() => setView("home")}
                  className="flex flex-col items-center gap-1 py-3 text-primary"
                >
                  <div className="w-5 h-5 rounded-sm bg-primary" />
                  <span className="text-[10px] font-medium">Home</span>
                </button>
                <button
                  onClick={() => startConversation()}
                  className="flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Messages</span>
                </button>
                <button
                  onClick={() => setView("help")}
                  className="flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Search className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Help</span>
                </button>
              </div>
            </>
          )}
          {view === "help" && (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <button
                  onClick={() => setView("home")}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <h2 className="text-sm font-semibold text-foreground">Help</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/60">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search for help"
                    className="flex-1 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {HELP_ARTICLES.map((a) => (
                  <button
                    key={a.title}
                    onClick={() => startConversation(a.title)}
                    className="w-full text-left px-4 py-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h4 className="text-sm font-medium text-foreground">{a.title}</h4>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.preview}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "conversation" && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setView("home")}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2.5 flex-1">
                  <TeamAvatars />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">JQS Team</p>
                    <p className="text-[11px] text-muted-foreground">
                      Typically replies in a few minutes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-card-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-neutral max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-3 pb-3 pt-2 border-t border-border bg-background">
                <div className="flex items-center gap-2 bg-card border border-input rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.95] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center mt-2">
                  <a
                    href="https://www.auvia.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    Powered by Auvia
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg shadow-foreground/20 flex items-center justify-center transition-all duration-300 active:scale-[0.92] ${
          open
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:scale-105"
        }`}
        aria-label="Open chat"
      >
        {open ? <X className="w-4 h-4" /> : <MessageSquare className="w-5 h-5" strokeWidth={2.2} />}
      </button>
    </>
  );
};
