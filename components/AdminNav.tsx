"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("siva_admin_user");
    } catch {
      // ignore
    }
    window.location.href = "/admin/login";
  };

  const navItems = [
    { label: "Flex", href: "/admin/flex", emoji: "🪧" },
    { label: "Supplier", href: "/admin/supplier", emoji: "🏭" },
    { label: "Customer", href: "/admin/customer", emoji: "👥" },
    { label: "Live Files", href: "/admin/live-files", emoji: "📁" },
    { label: "Report", href: "/admin/reports", emoji: "📊" },
  ];

  return (
    <>
      {/* CMYK Accent Bar matching Home Page */}
      <div className="cmyk-accent-bar" aria-hidden="true" />

      {/* Unified Single Navigation Bar (Logo on far left, Links in middle, Logout on right) */}
      <nav className="unified-nav-bar">
        <div className="nav-inner">
          {/* Left: Siva Flex Logo (Small, far left) */}
          <div className="nav-brand">
            <Link href="/admin/flex" className="logo-box" title="Siva Flex Admin Portal">
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

          {/* Center: Navigation Links without numbers */}
          <div className="nav-tabs-group">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/admin/flex" && (pathname === "/admin" || pathname === "/admin/dashboard"));

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

          {/* Right: Only Logout Button */}
          <div className="nav-user-actions">
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              title="Logout from admin session"
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

        /* Center Navigation Tabs with generous spacing */
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
          flex-shrink: 0;
          margin-left: 1rem;
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
