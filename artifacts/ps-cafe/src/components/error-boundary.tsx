import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          color: "#fff",
          fontFamily: "Cairo, sans-serif",
          direction: "rtl",
          padding: 24,
          gap: 20,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56 }}>⚠️</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#8b5cf6" }}>
          حدث خطأ في التطبيق
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", maxWidth: 400, lineHeight: 1.7 }}>
          {this.state.error?.message || "خطأ غير معروف"}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "12px 32px",
            background: "#8b5cf6",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Cairo, sans-serif",
            cursor: "pointer",
          }}
        >
          إعادة تحميل التطبيق
        </button>
      </div>
    );
  }
}
