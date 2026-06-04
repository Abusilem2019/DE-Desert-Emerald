import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Activity, MessageSquare } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <span className="text-primary/90">DE</span>
            <span className="text-muted-foreground font-normal mx-1">|</span>
            <span>زمردة الصحراء</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link 
              href="/" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">البحث</span>
            </Link>
            <Link 
              href="/stats" 
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === "/stats" ? "text-primary" : "text-muted-foreground"}`}
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">الإحصائيات</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col container max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border/40 py-6 md:px-8 md:py-0 text-center text-sm text-muted-foreground">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row max-w-4xl mx-auto">
          <p className="font-medium text-primary">ما لا يعرفه جوجل يعرفه DE</p>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>{health?.status === "ok" ? "النظام يعمل بنجاح" : "يتم التحقق من النظام..."}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
