"use client";

import React from "react";

const features = [
  {
    icon: "⚡",
    title: "Same-Day Dispatch",
    subtitle: "Express Order Printing",
    desc: "Fast turnaround times on all frontlit and backlit banners with same-day local delivery and regional bus/courier parcel dispatch across Dindigul.",
    color: "#f59e0b",
  },
  {
    icon: "💎",
    title: "1440 DPI Precision",
    subtitle: "Ultra-Rich Solvent Colors",
    desc: "Industrial Japanese printheads delivering photographic clarity, sharp typography, rich gradients, and maximum outdoor weather durability.",
    color: "#0284c7",
  },
  {
    icon: "📜",
    title: "Dealer Wholesale",
    subtitle: "Transparent Square Foot Rates",
    desc: "Exclusive discounted tiered rates for flex printing dealers, digital studios, sign makers, and regular enterprise print buyers.",
    color: "#10b981",
  },
];

export default function FeatureHighlights() {
  return (
    <section className="features-section">
      <div className="features-container">
        {features.map((f, idx) => (
          <div key={idx} className="feature-card glass-panel">
            <div className="icon-wrapper" style={{ borderColor: `${f.color}35`, backgroundColor: `${f.color}15` }}>
              <span className="feature-emoji">{f.icon}</span>
            </div>
            <div className="card-text">
              <span className="feature-subtitle" style={{ color: f.color }}>{f.subtitle}</span>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .features-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1rem 1.5rem 2.5rem 1.5rem;
          width: 100%;
        }

        .features-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .feature-card {
          border-radius: 18px;
          padding: 1.75rem;
          background: #ffffff;
          border: 1px solid rgba(2, 132, 199, 0.16);
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.06);
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(2, 132, 199, 0.12);
          border-color: #0284c7;
        }

        .icon-wrapper {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid;
          flex-shrink: 0;
        }

        .feature-emoji {
          font-size: 1.8rem;
        }

        .card-text {
          display: flex;
          flex-direction: column;
        }

        .feature-subtitle {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.2rem;
        }

        .feature-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          margin-bottom: 0.4rem;
        }

        .feature-desc {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
        }

        @media (max-width: 960px) {
          .features-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
