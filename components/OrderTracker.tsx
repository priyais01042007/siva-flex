"use client";

import React, { useState } from "react";

interface OrderData {
  id: number;
  fileName: string;
  width: string;
  height: string;
  area: string;
  quantity: string;
  totalAmount: string;
  status: string;
  statusCode: number;
  step: number;
  color: string;
  invoiceNumber: string | null;
  registerTime: string;
  deliveredTime: string;
}

export default function OrderTracker() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);

  const handleTrack = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`/api/track-order?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order not found");
      }

      setOrder(data.order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Order Registered", sub: "File received" },
    { num: 2, title: "Printing", sub: "Solvent print run" },
    { num: 3, title: "Finished", sub: "Cut & Eyelet" },
    { num: 4, title: "Delivered", sub: "Ready for pickup / courier" },
  ];

  return (
    <section className="tracker-section">
      <div className="tracker-card glass-panel">
        <div className="tracker-header">
          <span className="tracker-badge">🔍 Live Order Verification</span>
          <h3 className="tracker-title">Track Your Flex Print Order Status</h3>
          <p className="tracker-desc">Enter your Order ID or Artwork File Name to check production and delivery progress in real time.</p>
        </div>

        <form 
          className="search-form" 
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack(query);
          }}
        >
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Enter Order ID (e.g. 10577, 12465, 2426) or File Name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="track-btn" disabled={loading}>
              {loading ? "Checking..." : "Track Status"}
            </button>
          </div>
        </form>

        <div className="quick-suggestions">
          <span>Quick check samples:</span>
          {["10577", "12465", "2426"].map((sampleId) => (
            <button
              key={sampleId}
              type="button"
              className="sample-btn"
              onClick={() => {
                setQuery(sampleId);
                handleTrack(sampleId);
              }}
            >
              Order #{sampleId}
            </button>
          ))}
        </div>

        {error && (
          <div className="tracker-error">
            <span>⚠</span> {error}
          </div>
        )}

        {order && (
          <div className="order-result-card animate-fade-in">
            <div className="order-result-header">
              <div>
                <span className="order-id-label">Print Job ID: #{order.id}</span>
                <h4 className="order-file-name">{order.fileName}</h4>
              </div>
              <div 
                className="status-badge"
                style={{ backgroundColor: `${order.color}20`, color: order.color, borderColor: `${order.color}50` }}
              >
                <span className="status-dot" style={{ backgroundColor: order.color }}></span>
                {order.status}
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="stepper-container">
              {steps.map((st) => {
                const isPassed = order.step >= st.num;
                const isCurrent = order.step === st.num;
                return (
                  <div key={st.num} className={`step-item ${isPassed ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                    <div className="step-circle">
                      {isPassed ? "✓" : st.num}
                    </div>
                    <div className="step-info">
                      <span className="step-title">{st.title}</span>
                      <span className="step-sub">{st.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Specs Grid */}
            <div className="specs-grid">
              <div className="spec-box">
                <span className="spec-label">Dimensions</span>
                <span className="spec-val">{order.width}&apos; × {order.height}&apos;</span>
              </div>
              <div className="spec-box">
                <span className="spec-label">Total Area</span>
                <span className="spec-val">{order.area} Sq.Ft.</span>
              </div>
              <div className="spec-box">
                <span className="spec-label">Quantity</span>
                <span className="spec-val">{order.quantity} Pcs</span>
              </div>
              <div className="spec-box">
                <span className="spec-label">Amount</span>
                <span className="spec-val font-accent">₹{parseFloat(order.totalAmount || "0").toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="timestamps-footer">
              <span>📅 Registered: <strong>{order.registerTime}</strong></span>
              <span>🚚 Dispatch / Delivered: <strong>{order.deliveredTime}</strong></span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tracker-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1rem 1.5rem 2.5rem 1.5rem;
        }

        .tracker-card {
          border-radius: 24px;
          padding: 2.25rem;
          background: #ffffff;
          border: 1px solid rgba(2, 132, 199, 0.16);
          box-shadow: 0 12px 36px rgba(2, 132, 199, 0.08);
        }

        .tracker-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 1.5rem auto;
        }

        .tracker-badge {
          display: inline-block;
          background: #e0f2fe;
          color: #0284c7;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .tracker-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .tracker-desc {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 0.4rem;
        }

        .search-form {
          max-width: 680px;
          margin: 0 auto;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 2px solid #cbd5e1;
          border-radius: 14px;
          padding: 0.4rem;
          transition: all 0.2s ease;
        }

        .search-box:focus-within {
          border-color: #0284c7;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.12);
        }

        .search-icon {
          padding: 0 0.85rem;
          font-size: 1.1rem;
          color: #94a3b8;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
        }

        .track-btn {
          background: #0284c7;
          color: #ffffff;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .track-btn:hover:not(:disabled) {
          background: #0369a1;
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
        }

        .quick-suggestions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-top: 0.85rem;
          font-size: 0.8rem;
          color: #64748b;
          flex-wrap: wrap;
        }

        .sample-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0284c7;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sample-btn:hover {
          background: #e0f2fe;
          border-color: #0284c7;
        }

        .tracker-error {
          max-width: 680px;
          margin: 1.25rem auto 0 auto;
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .order-result-card {
          margin-top: 2rem;
          padding: 1.75rem;
          background: #f8fafc;
          border-radius: 18px;
          border: 1px solid rgba(2, 132, 199, 0.2);
        }

        .order-result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .order-id-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0284c7;
          text-transform: uppercase;
        }

        .order-file-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0.2rem;
          word-break: break-all;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 1rem;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 700;
          border: 1.5px solid;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .stepper-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0 2rem 0;
          padding: 1.25rem;
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          opacity: 0.5;
        }

        .step-item.completed {
          opacity: 1;
        }

        .step-item.current {
          opacity: 1;
        }

        .step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .step-item.completed .step-circle {
          background: #10b981;
          color: #ffffff;
        }

        .step-item.current .step-circle {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.2);
        }

        .step-info {
          display: flex;
          flex-direction: column;
        }

        .step-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
        }

        .step-sub {
          font-size: 0.7rem;
          color: #64748b;
        }

        .specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .spec-box {
          background: #ffffff;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .spec-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }

        .spec-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 0.2rem;
        }

        .font-accent {
          color: #dc2626;
        }

        .timestamps-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 0.75rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .timestamps-footer strong {
          color: #0f172a;
        }
      `}</style>
    </section>
  );
}
