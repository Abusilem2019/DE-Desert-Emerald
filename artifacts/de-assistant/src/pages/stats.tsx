import { useState } from "react";
import { useDeStats } from "@workspace/api-client-react";
import { Loader2, Database, Phone, CheckCircle, TrendingUp, Map, LayoutGrid, Copy, Check } from "lucide-react";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function BarItem({ name, count, total, color }: { name: string; count: number; total: number; color: string }) {
  const pct = Math.round((count / total) * 100);
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate max-w-[60%]">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{pct}%</span>
          <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-mono">{count.toLocaleString("ar-EG")}</span>
        </div>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function getCatLabel(name: string): string {
  if (name === "General_Business") return "أعمال عامة";
  if (name === "Medical" || name === "Medical_Service") return "طبي";
  if (name === "Beauty_Wellness") return "تجميل وعناية";
  return name;
}

export default function StatsPage() {
  const { data: stats, isLoading, isError } = useDeStats();

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>جاري تحميل الإحصائيات...</p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive space-y-2">
        <p className="text-xl font-bold">حدث خطأ أثناء جلب البيانات</p>
        <p className="text-muted-foreground">يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    );
  }

  const phonesPct = Math.round((stats.total_with_phone / stats.total_entities) * 100);
  const verifiedPct = Math.round((stats.total_verified / stats.total_entities) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">إحصائيات النظام</h1>
        <p className="text-muted-foreground">نظرة شاملة على قاعدة بيانات زمردة الصحراء</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الكيانات</p>
            <h3 className="text-4xl font-black font-mono tracking-tight text-foreground">
              {stats.total_entities.toLocaleString("ar-EG")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">من مصادر Titan الميدانية</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 w-fit">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">بيانات برقم هاتف</p>
            <h3 className="text-4xl font-black font-mono tracking-tight text-foreground">
              {stats.total_with_phone.toLocaleString("ar-EG")}
            </h3>
            <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${phonesPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{phonesPct}% من الإجمالي</p>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 w-fit">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">كيانات موثقة</p>
            <h3 className="text-4xl font-black font-mono tracking-tight text-foreground">
              {stats.total_verified.toLocaleString("ar-EG")}
            </h3>
            <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${verifiedPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{verifiedPct}% نسبة التوثيق</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {stats.category_breakdown && stats.category_breakdown.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/30 flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">توزيع التصنيفات</h3>
          </div>
          <div className="p-5">
            <ul className="space-y-4">
              {stats.category_breakdown.map((item, i) => {
                const colors = ["bg-primary", "bg-blue-400", "bg-purple-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400", "bg-teal-400"];
                return (
                  <BarItem
                    key={i}
                    name={getCatLabel(item.name)}
                    count={item.count}
                    total={stats.total_entities}
                    color={colors[i % colors.length]}
                  />
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Specialties + Regions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/30 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">أبرز التخصصات</h3>
          </div>
          <div className="p-5">
            <ul className="space-y-4">
              {stats.top_specialties.map((item, i) => (
                <BarItem key={i} name={item.name} count={item.count} total={stats.top_specialties[0].count} color="bg-primary" />
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/30 flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">التوزيع الجغرافي</h3>
          </div>
          <div className="p-5">
            <ul className="space-y-4">
              {stats.top_regions.map((item, i) => (
                <BarItem key={i} name={item.name} count={item.count} total={stats.top_regions[0].count} color="bg-emerald-500" />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
