import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type ExportResult = {
  success: boolean;
  repoUrl: string;
  owner: string;
  repoName: string;
  uploaded: number;
  failed: number;
  total: number;
};

type Step = "idle" | "validating" | "creating" | "uploading" | "done" | "error";

export default function GithubExport() {
  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState("ps-cafe-manager");
  const [description, setDescription] = useState("PlayStation Cafe Manager — Arabic RTL Management System");
  const [isPrivate, setIsPrivate] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExportResult | null>(null);

  const handleExport = async () => {
    if (!token.trim() || !repoName.trim()) return;
    setStep("validating");
    setError("");
    setResult(null);

    try {
      setStep("creating");
      await new Promise((r) => setTimeout(r, 400));
      setStep("uploading");

      const res = await fetch(`${API}/api/github-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), repoName: repoName.trim(), description, isPrivate }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStep("error");
        setError(data.error ?? "حدث خطأ غير متوقع");
        return;
      }

      setResult(data);
      setStep("done");
    } catch (e: unknown) {
      setStep("error");
      setError(e instanceof Error ? e.message : "تعذر الاتصال بالخادم");
    }
  };

  const reset = () => {
    setStep("idle");
    setError("");
    setResult(null);
  };

  const isLoading = step === "validating" || step === "creating" || step === "uploading";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="text-right">
        <h1 className="text-3xl font-black text-white mb-1">تصدير إلى GitHub</h1>
        <p className="text-muted-foreground text-sm">
          يرفع كامل الكود المصدري إلى مستودع GitHub جديد بـ commit واحد
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-[#0f0f18] border border-white/8 p-5 space-y-3">
        <h2 className="text-base font-bold text-primary text-right">كيف يعمل؟</h2>
        <ol className="text-sm text-muted-foreground space-y-2 text-right list-none">
          {[
            "تدخل GitHub Personal Access Token بصلاحية repo",
            "تختار اسم المستودع",
            "التطبيق يُنشئ المستودع ويرفع كل الملفات بـ commit واحد",
            "تحصل على رابط المستودع مباشرة",
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3 flex-row-reverse">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        {/* Token instructions */}
        <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-700/30 text-amber-300 text-xs text-right space-y-1">
          <p className="font-bold">للحصول على Token:</p>
          <p>
            GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
          </p>
          <p className="text-amber-400">✓ اختر صلاحية: <code className="bg-black/30 px-1 rounded">repo</code> (كاملة)</p>
        </div>
      </div>

      {/* Form */}
      {step !== "done" && (
        <div className="rounded-xl bg-[#0f0f18] border border-white/8 p-6 space-y-4">

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block text-right">
              GitHub Personal Access Token <span className="text-red-400">*</span>
            </label>
            <Input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              className="bg-black/60 border-white/10 text-white font-mono text-sm"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block text-right">
              اسم المستودع <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="ps-cafe-manager"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
              disabled={isLoading}
              className="bg-black/60 border-white/10 text-white font-mono text-sm text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground block text-right">وصف المستودع</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className="bg-black/60 border-white/10 text-white text-right text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-muted-foreground">مستودع خاص (Private)</span>
            <button
              type="button"
              onClick={() => setIsPrivate((v) => !v)}
              disabled={isLoading}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                isPrivate ? "bg-primary" : "bg-white/15"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  isPrivate ? "translate-x-0.5" : "translate-x-5"
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {step === "error" && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-sm text-right">
              {error}
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={isLoading || !token.trim() || !repoName.trim()}
            className="w-full bg-[#1a1a2e] hover:bg-[#16213e] border border-white/15 hover:border-primary/50 text-white font-bold h-12 text-base transition-all duration-200 flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span>
                  {step === "validating" && "جارٍ التحقق من الـ Token..."}
                  {step === "creating" && "جارٍ إنشاء المستودع..."}
                  {step === "uploading" && "جارٍ رفع الملفات... قد يستغرق دقيقة"}
                </span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                رفع الكود إلى GitHub
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success */}
      {step === "done" && result && (
        <div className="rounded-xl bg-[#0a1f0a] border border-green-700/40 p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-black text-green-400">تم الرفع بنجاح!</h2>
          </div>

          {/* Repo URL */}
          <div className="p-4 rounded-lg bg-black/40 border border-green-700/30 flex items-center gap-3">
            <a
              href={result.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-green-300 font-mono text-sm break-all hover:underline text-left"
            >
              {result.repoUrl}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(result.repoUrl)}
              className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="نسخ الرابط"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "ملف مرفوع", value: result.uploaded, color: "text-green-400" },
              { label: "إجمالي الملفات", value: result.total, color: "text-white" },
              { label: "فشل الرفع", value: result.failed, color: result.failed > 0 ? "text-red-400" : "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-black/30 p-3">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <a
              href={result.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg bg-[#1a1a2e] border border-white/15 hover:border-primary/50 text-white font-bold text-sm transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              فتح المستودع
            </a>
            <Button onClick={reset} variant="outline" className="border-white/15 text-muted-foreground hover:text-white h-11">
              رفع مجدداً
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
