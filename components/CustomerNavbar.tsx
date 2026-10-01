"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function CustomerNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCustomer({
              id: String(data.user.id),
              name: data.user.name || "DEALER",
              email: data.user.email,
            });
            localStorage.setItem("siva_flex_customer", JSON.stringify(data.user));
            return;
          }
        }
      } catch (e) {
        console.error("Session load error:", e);
      }

      // Fallback to local storage if offline
      const stored = localStorage.getItem("siva_flex_customer");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCustomer(parsed);
        } catch {}
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("siva_flex_customer");
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  const navItems = [
    { label: "Send File", href: "/customer/send-file", emoji: "📤" },
    { label: "Delivered Files", href: "/customer/delivered-files", emoji: "📦" },
    { label: "Report", href: "/customer/report", emoji: "📊" },
    { label: "Invoice", href: "/customer/invoice", emoji: "🧾" },
  ];

  return (
    <>
      {/* CMYK Accent Bar matching Admin & Home Page */}
      <div className="cmyk-accent-bar" aria-hidden="true" />

      {/* Unified Single Navigation Bar (Logo on left, Links in middle, User & Logout on right) */}
      <nav className="unified-nav-bar">
        <div className="nav-inner">
          {/* Left: Siva Flex Logo */}
          <div className="nav-brand">
            <Link href="/customer/send-file" className="logo-box" title="Siva Flex Customer Portal">
              <Image
                src="/siva_flux_logo.png"
                alt="Siva Flex Palani Logo"
                width={42}
                height={38}
                priority
                style={{ objectFit: "contain" }}
              />
            </Link>
          </div>

          {/* Center: Navigation Links matching Admin UI tabs */}
          <div className="nav-tabs-group">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-tab ${isActive ? "active" : ""}`}
                >
                  <span className="tab-emoji">{item.emoji}</span>
                  <span className="tab-name">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Customer Profile Chip & Logout Button */}
          <div className="nav-user-actions">
            {customer && (
              <div className="customer-info-chip" title="Logged in customer">
                <span className="user-icon">👤</span>
                <span className="user-text">
                  <strong>{customer.name}</strong>
                  <span className="user-email"> ({customer.email})</span>
                </span>
              </div>
            )}

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Logout from customer portal"
            >
              <span>Logout</span>
              <span>⎋</span>
            </button>
          </div>
        </div>
      </nav>

      <style jsx>{`
        .cmyk-accent-bar {
          height: 3.5px;
          width: 100%;
          background: linear-gradient(90deg, #0284c7 0%, #ec4899 35%, #f59e0b 70%, #10b981 100%);
        }

        .unified-nav-bar {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(2, 132, 199, 0.14);
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1.5rem;
          gap: 1.5rem;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          margin-right: 1rem;
        }

        .logo-box {
          background: #ffffff;
          padding: 0.2rem 0.35rem;
          border-radius: 10px;
          border: 1px solid rgba(2, 132, 199, 0.18);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .logo-box:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
        }

        .nav-tabs-group {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 0.2rem 0;
        }

        .nav-tabs-group::-webkit-scrollbar {
          display: none;
        }

        .nav-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.55rem 1.15rem;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #334155;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .nav-tab:hover {
          background: #f1f5f9;
          color: #0284c7;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }

        .nav-tab.active {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border-color: #0284c7;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
          transform: translateY(-1px);
        }

        .tab-emoji {
          font-size: 1.15rem;
          line-height: 1;
        }

        .tab-name {
          line-height: 1;
          letter-spacing: 0.01em;
        }

        .nav-user-actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-shrink: 0;
          margin-left: 1rem;
        }

        .customer-info-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 0.45rem 0.85rem;
          border-radius: 10px;
          font-size: 0.86rem;
          color: #0369a1;
        }

        .user-icon {
          font-size: 1rem;
        }

        @media (max-width: 900px) {
          .customer-info-chip {
            display: none;
          }
        }

        .logout-button {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: #fff1f2;
          color: #e11d48;
          border: 1.5px solid #fecdd3;
          padding: 0.52rem 1.1rem;
          border-radius: 10px;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(225, 29, 72, 0.08);
        }

        .logout-button:hover {
          background: #ffe4e6;
          border-color: #fda4af;
          color: #be123c;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(225, 29, 72, 0.15);
        }

        @media (max-width: 900px) {
          .nav-inner {
            padding: 0.5rem 0.85rem;
            gap: 0.75rem;
          }
          .nav-tabs-group {
            gap: 0.45rem;
          }
          .nav-tab {
            padding: 0.45rem 0.75rem;
            font-size: 0.82rem;
          }
        }
      `}</style>
    </>
  );
}
