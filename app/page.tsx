"use client";

import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeatureHighlights from "@/components/FeatureHighlights";
import ServicesSection from "@/components/ServicesSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="main-wrapper">
      <Header />
      
      {/* Notice Bar */}
      <div className="sub-notice-bar">
        <div className="notice-container">
          <span className="notice-badge">Announcement</span>
          <span className="notice-text">
            ⚡ Welcome to Siva Flex Palani! Dealer online order uploads and same-day delivery are active across Dindigul district.
          </span>
          <a
            href="https://wa.me/917598154009"
            target="_blank"
            rel="noopener noreferrer"
            className="notice-link"
          >
            Instant WhatsApp Desk →
          </a>
        </div>
      </div>

      {/* Hero Section with Full Visible Banner & Dealer Login Portal */}
      <HeroSection />

      {/* Prominent Feature Highlights Strip (Same-Day Dispatch, 1440 DPI, Dealer Wholesale) */}
      <FeatureHighlights />

      {/* Production Stats Counter Banner */}
      <section className="stats-banner">
        <div className="stats-container">
          <div className="stat-card">
            <span className="stat-number">23,800+</span>
            <span className="stat-label">Print Orders Produced</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Solvent Color Vibrancy</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">35+</span>
            <span className="stat-label">Verified Regional Dealers</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">Same-Day</span>
            <span className="stat-label">Express Production</span>
          </div>
        </div>
      </section>

      {/* Services Showcase (Strictly 3 per row) */}
      <ServicesSection />

      <Footer />

      <style jsx>{`
        .main-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .sub-notice-bar {
          background: linear-gradient(90deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          padding: 0.5rem 1.5rem;
          font-size: 0.8rem;
        }

        .notice-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .notice-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.7rem;
        }

        .notice-text {
          font-weight: 500;
        }

        .notice-link {
          font-weight: 700;
          color: #bae6fd;
          text-decoration: underline;
        }

        .notice-link:hover {
          color: #ffffff;
        }

        .stats-banner {
          background: #ffffff;
          border-top: 1px solid rgba(2, 132, 199, 0.12);
          border-bottom: 1px solid rgba(2, 132, 199, 0.12);
          padding: 2rem 1.5rem;
          width: 100%;
        }

        .stats-container {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          text-align: center;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 900;
          color: #0284c7;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .sub-notice-bar {
            padding: 0.5rem 1rem;
          }
          .notice-container {
            justify-content: center;
            text-align: center;
            flex-direction: column;
            gap: 0.4rem;
          }
          .stats-banner {
            padding: 1.5rem 1rem;
          }
          .stats-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem 0.75rem;
          }
          .stat-number {
            font-size: 1.75rem;
          }
          .stat-label {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 380px) {
          .stats-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
