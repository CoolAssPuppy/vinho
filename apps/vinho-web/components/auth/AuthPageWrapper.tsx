"use client";

import Image from "next/image";

type AuthPageWrapperProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showMarketing?: boolean;
};

function MarketingPanel() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "32px",
      color: "white",
    }}>
      <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Vinho</h2>
      <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", marginBottom: "28px" }}>
        Learn wine through terroir, history, and taste.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
        {[
          "Upload and save wines you've tried",
          "Record where you've tasted them",
          "Explore regions on an interactive map",
          "Discover wines from the Vinho community",
        ].map((item) => (
          <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "14px", color: "rgba(255,255,255,0.8)" }}>
            <span style={{ marginTop: "6px", width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuthPageWrapper({ children, title, subtitle, showMarketing }: AuthPageWrapperProps) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "bottom" }}
          priority
          sizes="100vw"
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      </div>

      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "48px 16px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: showMarketing ? "820px" : "420px",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          display: showMarketing ? "grid" : "block",
          gridTemplateColumns: showMarketing ? "1fr 1fr" : undefined,
          overflow: "hidden",
        }}>
          {showMarketing && <MarketingPanel />}
          <div style={{
            padding: "32px",
            borderLeft: showMarketing ? "1px solid rgba(255,255,255,0.1)" : undefined,
          }}>
            <h1 style={{ fontSize: "24px", fontWeight: 600, color: "white", marginBottom: "4px" }}>{title}</h1>
            {subtitle && <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>{subtitle}</p>}
            {!subtitle && <div style={{ marginBottom: "24px" }} />}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
