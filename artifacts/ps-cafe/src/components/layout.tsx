import { Link, useLocation } from "wouter";
import { useAlarmSystem } from "@/hooks/use-alarm";

export default function Layout({ children }: { children: React.ReactNode }) {
  useAlarmSystem();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0d0d0d] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/github-export" className={`flex items-center gap-2 transition-colors text-sm font-medium ${location === "/github-export" ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </Link>
          <Link href="/settings" className={`flex items-center gap-2 transition-colors text-base font-medium ${location === "/settings" ? "text-primary" : "text-muted-foreground hover:text-white"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            الإعدادات
          </Link>
        </div>
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-white">PlayStation</span>
          <span className="text-primary">كافيه</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
            <path d="M4.993 3.335A1 1 0 0 0 3 4v16a1 1 0 0 0 1.993.665l5.942-16A1 1 0 0 0 9.9 3.4L4.993 3.335zM9.9 3.4A1 1 0 0 0 8.5 2.5h-1a1 1 0 0 0-.993.865L4.993 3.335 9.9 3.4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" opacity="0"/>
            <path d="M21.67 13.5c.19-.39.33-.8.33-1.25C22 9.35 19.65 7 16.75 7H15V3.02c-.34-.01-.67-.02-1-.02-5.52 0-10 4.48-10 10s4.48 10 10 10c2.54 0 4.86-.95 6.62-2.51l.05.01 1-6.9c0-.04-.01-.08 0-.1zM16.75 15H15v-2h1.75c.55 0 1 .45 1 1s-.45 1-1 1z"/>
          </svg>
        </Link>
      </header>
      <main className="flex-1 p-5 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
