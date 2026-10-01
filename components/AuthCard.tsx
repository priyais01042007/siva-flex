"use client";

import React, { useState } from "react";

export default function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign In State
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  
  // Sign Up State
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suMobile, setSuMobile] = useState("");
  const [suAddress, setSuAddress] = useState("");
  const [suGst, setSuGst] = useState("");
  const [suPassword, setSuPassword] = useState("");
  
  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string; id: number } | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: siEmail, password: siPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setMessage({ type: "success", text: data.message });
      setLoggedInUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("siva_flex_customer", JSON.stringify(data.user));
        setTimeout(() => {
          window.location.href = "/customer/send-file";
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in error";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suName,
          email: suEmail,
          mobile: suMobile,
          address: suAddress,
          gst: suGst,
          password: suPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setMessage({ type: "success", text: data.message });
      // Switch to sign in and prefill email
      setSiEmail(suEmail);
      setMode("signin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loggedInUser) {
    return (
      <div className="auth-card-container logged-in-card glass-panel">
        <div className="logged-in-badge">
          <span className="online-dot"></span> Authenticated Dealer
        </div>
        <h3 className="welcome-heading">Welcome, {loggedInUser.name}!</h3>
        <p className="dealer-id-tag">Dealer ID: <strong>DLR-{String(loggedInUser.id).padStart(4, "0")}</strong></p>
        <p className="dealer-email-tag">{loggedInUser.email}</p>

        <div className="dealer-actions-box">
          <div className="action-pill">
            <span className="pill-icon">📁</span>
            <span>Upload New Print File</span>
          </div>
          <div className="action-pill">
            <span className="pill-icon">📊</span>
            <span>View Orders & Ledger</span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={() => {
            setLoggedInUser(null);
            setMessage(null);
          }}
        >
          Sign Out
        </button>

        <style jsx>{`
          .auth-card-container {
            border-radius: 18px;
            padding: 2rem;
            text-align: center;
          }
          .logged-in-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: #ecfdf5;
            color: #059669;
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
            border: 1px solid #a7f3d0;
          }
          .online-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
          }
          .welcome-heading {
            font-size: 1.4rem;
            font-weight: 800;
            color: #0f172a;
          }
          .dealer-id-tag {
            font-size: 0.9rem;
            color: #0284c7;
            margin-top: 0.25rem;
          }
          .dealer-email-tag {
            font-size: 0.8rem;
            color: #64748b;
          }
          .dealer-actions-box {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin: 1.5rem 0;
          }
          .action-pill {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9rem;
            color: #1e293b;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .action-pill:hover {
            background: #e0f2fe;
            border-color: #0284c7;
            transform: translateX(4px);
          }
          .logout-button {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #475569;
            background: #ffffff;
            transition: all 0.2s ease;
          }
          .logout-button:hover {
            background: #fee2e2;
            color: #dc2626;
            border-color: #fca5a5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-card-container glass-panel">
      {/* Mode Switcher Tabs */}
      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === "signin" ? "active" : ""}`}
          onClick={() => {
            setMode("signin");
            setMessage(null);
          }}
        >
          SIGN IN
        </button>
        <button
          className={`auth-tab ${mode === "signup" ? "active" : ""}`}
          onClick={() => {
            setMode("signup");
            setMessage(null);
          }}
        >
          NEW DEALER
        </button>
      </div>

      {message && (
        <div className={`auth-alert ${message.type}`}>
          <span className="alert-icon">{message.type === "success" ? "✓" : "⚠"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="auth-form">
          <div className="form-group">
            <label htmlFor="si-email">Email ID</label>
            <div className="input-wrapper">
              <span className="input-icon">✉</span>
              <input
                id="si-email"
                type="email"
                required
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                placeholder="Enter Your Mail ID"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="si-password">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="si-password"
                type={showPassword ? "text" : "password"}
                required
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                placeholder="Enter Your Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn primary-login-btn"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="secondary-btn signup-trigger-btn"
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
          >
            SIGN UP
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="auth-form">
          <div className="form-group">
            <label htmlFor="su-name">Dealer / Business Name</label>
            <div className="input-wrapper">
              <span className="input-icon">🏢</span>
              <input
                id="su-name"
                type="text"
                required
                value={suName}
                onChange={(e) => setSuName(e.target.value.toUpperCase())}
                placeholder="Enter Your Name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="su-email">Mail ID</label>
            <div className="input-wrapper">
              <span className="input-icon">✉</span>
              <input
                id="su-email"
                type="email"
                required
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                placeholder="Enter Your Mail ID"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="su-mobile">Contact Number</label>
            <div className="input-wrapper">
              <span className="input-icon">📞</span>
              <input
                id="su-mobile"
                type="tel"
                required
                value={suMobile}
                onChange={(e) => setSuMobile(e.target.value)}
                placeholder="Enter 10-digit Number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="su-gst">GST Number (Optional)</label>
            <div className="input-wrapper">
              <span className="input-icon">🧾</span>
              <input
                id="su-gst"
                type="text"
                value={suGst}
                onChange={(e) => setSuGst(e.target.value.toUpperCase())}
                placeholder="Enter GST Number"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="su-address">City / Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📍</span>
              <input
                id="su-address"
                type="text"
                value={suAddress}
                onChange={(e) => setSuAddress(e.target.value)}
                placeholder="City (e.g. Palani, Dindigul)"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="su-password">Create Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                id="su-password"
                type={showPassword ? "text" : "password"}
                required
                value={suPassword}
                onChange={(e) => setSuPassword(e.target.value)}
                placeholder="Enter Your Password"
              />
              <button
                type="button"
                className="eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-btn primary-signup-btn"
            disabled={loading}
          >
            {loading ? "Registering..." : "Submit Registration"}
          </button>

          <button
            type="button"
            className="back-link"
            onClick={() => setMode("signin")}
          >
            ← Already have an account? Sign In
          </button>
        </form>
      )}

      <style jsx>{`
        .auth-card-container {
          width: 100%;
          max-width: 420px;
          border-radius: 20px;
          padding: 1.75rem;
          background: #ffffff;
          box-shadow: 0 16px 40px rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(2, 132, 199, 0.2);
          display: flex;
          flex-direction: column;
        }

        .auth-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 0.3rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
          gap: 0.3rem;
        }

        .auth-tab {
          flex: 1;
          padding: 0.65rem 0.8rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          border-radius: 9px;
          transition: all 0.2s ease;
          text-align: center;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .auth-tab.active {
          background: #ffffff;
          color: #0284c7;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 0.95rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1rem;
          line-height: 1.35;
        }

        .auth-alert.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .auth-alert.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          text-align: left;
        }

        .form-group label {
          font-size: 0.8rem;
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
          min-height: 44px;
        }

        .input-wrapper:focus-within {
          border-color: #0284c7;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .input-icon {
          padding-left: 0.85rem;
          color: #94a3b8;
          font-size: 1rem;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.7rem 0.85rem;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
        }

        .input-wrapper input::placeholder {
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .eye-toggle {
          padding: 0 0.85rem;
          color: #64748b;
          font-size: 1.1rem;
          cursor: pointer;
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        .submit-btn {
          padding: 0.8rem 1rem;
          border-radius: 10px;
          font-size: 0.94rem;
          font-weight: 700;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 46px;
        }

        .primary-login-btn {
          background: #ffffff;
          border: 1.5px solid #0284c7;
          color: #0284c7;
        }

        .primary-login-btn:hover:not(:disabled) {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
        }

        .primary-signup-btn {
          background: #0284c7;
          color: #ffffff;
        }

        .primary-signup-btn:hover:not(:disabled) {
          background: #0369a1;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 0.2rem 0;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }

        .divider span {
          padding: 0 0.5rem;
        }

        .secondary-btn.signup-trigger-btn {
          background: #dc2626;
          color: #ffffff;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          font-size: 0.94rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          transition: all 0.2s ease;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .secondary-btn.signup-trigger-btn:hover {
          background: #b91c1c;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
        }

        .back-link {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0284c7;
          margin-top: 0.5rem;
          text-align: center;
          padding: 0.5rem;
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Viewport Optimizations */
        @media (max-width: 640px) {
          .auth-card-container {
            padding: 1.25rem 1rem;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(2, 132, 199, 0.08);
          }
          .input-wrapper input {
            font-size: 16px; /* Prevents auto-zoom in mobile Safari / iOS */
          }
          .submit-btn,
          .secondary-btn.signup-trigger-btn {
            font-size: 1rem;
            min-height: 48px;
          }
        }
      `}</style>
    </div>
  );
}
