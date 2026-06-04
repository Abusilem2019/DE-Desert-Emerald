import { useState, useRef, useEffect } from "react";
import { Send, MapPin, Phone, Briefcase, Loader2, Sparkles, MessageCircle, Building2, Stethoscope, Pill, ChevronDown, Copy, Check, Download } from "lucide-react";
import { useDeSearch, useDeSuggest } from "@workspace/api-client-react";
import type { Entity } from "@workspace/api-client-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: Entity[];
  answer?: string | null;
  total?: number;
  loading?: boolean;
  searchQuery?: string;
  searchCategory?: string;
};

const CATEGORIES = [
  { label: "الكل", value: "", icon: Sparkles },
  { label: "طبي", value: "Medical", icon: Stethoscope },
  { label: "صيدلية", value: "صيدلية", icon: Pill },
  { label: "أعمال", value: "General_Business", icon: Building2 },
];

const QUICK_REGIONS = ["الجيزة", "القاهرة", "الإسكندرية", "العمرانية", "المهندسين", "الهرم"];

function getCategoryLabel(cat: string | null | undefined): string {
  if (!cat) return "";
  if (cat.includes("Medical") || cat === "Medical") return "طبي";
  if (cat === "صيدلية" || cat === "Pharmacy") return "صيدلية";
  if (cat === "General_Business") return "أعمال";
  return cat;
}

function getCategoryColor(cat: string | null | undefined): string {
  if (!cat) return "bg-secondary text-secondary-foreground";
  if (cat.includes("Medical")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (cat === "صيدلية") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (cat === "General_Business") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-secondary text-secondary-foreground";
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="نسخ"
      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

function CopyAllPhonesBtn({ entities }: { entities: Entity[] }) {
  const [copied, setCopied] = useState(false);
  const phones = entities.filter(e => e.phone).map(e => `${e.name}: ${e.phone}`).join("\n");
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(phones); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Download className="h-4 w-4" />}
      {copied ? "تم النسخ!" : `نسخ كل الأرقام (${entities.filter(e => e.phone).length})`}
    </button>
  );
}

function EntityCard({ entity }: { entity: Entity }) {
  const location = [entity.address, entity.region, entity.governorate].filter(Boolean).join("، ");
  const catLabel = getCategoryLabel(entity.category);
  const catColor = getCategoryColor(entity.category);

  return (
    <div className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-base text-primary leading-tight">{entity.name}</h4>
        {catLabel && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${catColor}`}>
            {catLabel}
          </span>
        )}
      </div>

      {entity.doctor_name && (
        <p className="text-sm text-muted-foreground mb-2">{entity.doctor_name}</p>
      )}

      <div className="space-y-1.5 text-sm">
        {entity.specialty && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{entity.specialty}</span>
          </div>
        )}

        {location && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
            <span className="leading-tight">{location}</span>
          </div>
        )}
      </div>

      {(entity.phone || entity.whatsapp) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
          {entity.phone && (
            <div className="flex items-center gap-1">
              <a
                href={`tel:${entity.phone.replace(/[^0-9+]/g, "")}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{entity.phone}</span>
              </a>
              <CopyBtn value={entity.phone} label="نسخ الرقم" />
            </div>
          )}
          {entity.whatsapp && (
            <a
              href={`https://wa.me/2${entity.whatsapp.replace(/^0/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              واتساب
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showAllMap, setShowAllMap] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const searchMutation = useDeSearch();
  const { data: suggestions } = useDeSuggest({ q: "" });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSearch = async (text: string, catOverride?: string) => {
    if (!text.trim()) return;
    const cat = catOverride ?? selectedCategory;
    const reg = selectedRegion;

    const userLabel = [text, cat ? `[${getCategoryLabel(cat) || cat}]` : "", reg ? `📍${reg}` : ""].filter(Boolean).join(" ");
    const userMsgId = Math.random().toString();
    const asstMsgId = Math.random().toString();

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: userLabel },
      { id: asstMsgId, role: "assistant", content: "", loading: true },
    ]);
    setQuery("");

    try {
      const result = await searchMutation.mutateAsync({
        data: {
          query: reg ? `${text} ${reg}` : text,
          limit: 20,
          category: cat || undefined,
        },
      });

      setMessages(prev =>
        prev.map(msg =>
          msg.id === asstMsgId
            ? { ...msg, loading: false, results: result.results, answer: result.answer, total: result.total, searchQuery: text, searchCategory: cat }
            : msg
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === asstMsgId
            ? { ...msg, loading: false, content: "عذراً، حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى." }
            : msg
        )
      );
    }
  };

  const handleLoadMore = async (msg: Message) => {
    if (!msg.searchQuery) return;
    const result = await searchMutation.mutateAsync({
      data: {
        query: selectedRegion ? `${msg.searchQuery} ${selectedRegion}` : msg.searchQuery,
        limit: 50,
        category: msg.searchCategory || undefined,
      },
    });
    setMessages(prev =>
      prev.map(m =>
        m.id === msg.id ? { ...m, results: result.results, total: result.total } : m
      )
    );
    setShowAllMap(prev => ({ ...prev, [msg.id]: true }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[860px] border border-border rounded-xl bg-card overflow-hidden shadow-sm relative">
      {/* Filters bar */}
      <div className="flex flex-col gap-2 px-4 pt-3 pb-2 border-b border-border bg-secondary/20">
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Region quick filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <MapPin className="h-3 w-3" /> منطقة:
          </span>
          <button
            onClick={() => setSelectedRegion("")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
              selectedRegion === "" ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            الكل
          </button>
          {QUICK_REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setSelectedRegion(selectedRegion === r ? "" : r)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                selectedRegion === r ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-bold text-foreground">كيف يمكنني مساعدتك اليوم؟</h2>
              <p className="text-muted-foreground leading-relaxed">
                اسألني عن أي عيادة، مستشفى، أو صيدلية في مصر. أستطيع العثور على الأرقام، العناوين، والتخصصات بسهولة.
              </p>
            </div>
            {suggestions && suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(s.text)}
                    className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground rounded-full text-sm font-medium transition-colors border border-border/50"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start w-full"}`}
            >
              {msg.role === "user" ? (
                <div className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[80%]">
                  <p className="text-base">{msg.content}</p>
                </div>
              ) : (
                <div className="bg-secondary/40 border border-border px-4 py-4 rounded-2xl rounded-tr-sm shadow-sm space-y-4 w-full">
                  {msg.loading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm animate-pulse">جاري البحث في الأعماق...</span>
                    </div>
                  ) : (
                    <>
                      {msg.content && <p className="text-foreground">{msg.content}</p>}

                      {msg.answer && (
                        <div className="pb-3 border-b border-border/50 flex items-start justify-between gap-2">
                          <p className="text-foreground leading-relaxed font-medium">{msg.answer}</p>
                          {msg.total !== undefined && (
                            <span className="shrink-0 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-mono">
                              {msg.total.toLocaleString("ar-EG")} نتيجة
                            </span>
                          )}
                        </div>
                      )}

                      {msg.results && msg.results.length > 0 ? (
                        <div className="space-y-3 w-full">
                          {msg.results.map(entity => (
                            <EntityCard key={entity.id} entity={entity} />
                          ))}

                          {/* Actions row */}
                          <div className="flex gap-2 pt-1">
                            {msg.results.some(e => e.phone) && (
                              <CopyAllPhonesBtn entities={msg.results} />
                            )}
                            {msg.total !== undefined && msg.total > (msg.results?.length ?? 0) && !showAllMap[msg.id] && (
                              <button
                                onClick={() => handleLoadMore(msg)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-primary/40 rounded-xl text-sm text-primary hover:bg-primary/5 transition-colors"
                              >
                                <ChevronDown className="h-4 w-4" />
                                عرض المزيد ({(msg.total - (msg.results?.length ?? 0)).toLocaleString("ar-EG")} نتيجة أخرى)
                              </button>
                            )}
                          </div>
                        </div>
                      ) : msg.results && msg.results.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <p>لم أتمكن من العثور على نتائج مطابقة لطلبك.</p>
                          <p className="text-sm mt-1">جرب استخدام كلمات مختلفة أو تغيير الفلاتر.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-background border-t border-border">
        <form
          onSubmit={e => { e.preventDefault(); handleSearch(query); }}
          className="relative max-w-3xl mx-auto flex items-end gap-2 bg-secondary/30 rounded-2xl p-2 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
        >
          <textarea
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSearch(query);
              }
            }}
            placeholder="ابحث عن طبيب، عيادة، مستشفى..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none p-3 outline-none text-base placeholder:text-muted-foreground/70"
            rows={1}
            dir="rtl"
          />
          <button
            type="submit"
            disabled={!query.trim() || searchMutation.isPending}
            className="shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5 rtl:-scale-x-100" />
            <span className="sr-only">إرسال</span>
          </button>
        </form>
      </div>
    </div>
  );
}
