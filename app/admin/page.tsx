"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    try {
      const stored = localStorage.getItem("siva_admin_user");
      if (stored) {
        router.push("/admin/flex");
      }
    } catch {
      // ignore
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid Mail ID or Password.");
      }

      // Save session and redirect to flex admin page
      localStorage.setItem("siva_admin_user", JSON.stringify(data.admin));
      router.push("/admin/flex");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to authenticate.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-wrapper">
      {/* CMYK Accent Bar matching Home Page */}
      <div className="cmyk-accent-bar" aria-hidden="true" />

      <main className="admin-login-container">
        <div className="admin-card glass-panel">
          {/* Logo & Header */}
          <div className="card-header">
            <div className="logo-box">
              <Image
                src="/siva_flux_logo.png"
                alt="Siva Flex Palani Logo"
                width={130}
                height={50}
                priority
                style={{ objectFit: "contain" }}
              />
            </div>
            <h1 className="title">Admin Sign In</h1>
            <p className="subtitle">Siva Flex Management System • Palani</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {errorMsg && (
              <div className="error-alert" role="alert">
                <span className="error-icon">⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="admin-email">Enter Your Mail ID</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Mail ID"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">Enter Your Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Your Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>
        </div>
      </main>

      <style jsx>{`
        .admin-page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #e0f7fa 0%, #ffffff 50%, #e0f2fe 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .cmyk-accent-bar {
          height: 3.5px;
          width: 100%;
          background: linear-gradient(90deg, #0284c7 0%, #ec4899 35%, #f59e0b 70%, #10b981 100%);
        }

        .admin-login-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
        }

        .admin-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 16px 40px rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(2, 132, 199, 0.2);
        }

        .card-header {
          text-align: center;
          margin-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .logo-box {
          background: #ffffff;
          padding: 0.4rem 0.8rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(2, 132, 199, 0.18);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.85rem;
        }

        .title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.82rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 0.2rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.35;
        }

        .error-icon {
          font-size: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          text-align: left;
        }

        .form-group label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          background: #f8fafc;
          transition: all 0.2s ease;
          min-height: 46px;
        }

        .input-wrapper:focus-within {
          border-color: #0284c7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .input-icon {
          padding-left: 0.85rem;
          color: #94a3b8;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border: none;
          background: transparent;
          font-size: 0.92rem;
          color: #0f172a;
          outline: none;
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
          font-size: 0.88rem;
        }

        .toggle-eye {
          padding: 0 0.85rem;
          color: #64748b;
          font-size: 1.05rem;
          cursor: pointer;
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        .submit-btn {
          margin-top: 0.4rem;
          padding: 0.8rem;
          background: #0284c7;
          color: #ffffff;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 700;
          transition: all 0.2s ease;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0369a1;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .admin-card {
            padding: 1.5rem 1.25rem;
          }
          .input-wrapper input {
            font-size: 16px; /* Prevents auto-zoom on mobile devices */
          }
        }
      `}</style>
    </div>
  );
}
