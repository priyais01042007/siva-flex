"use client";

import React from "react";
import Image from "next/image";

export default function Header() {
  const googleMapsUrl = "https://www.google.com/maps/search/?api=1&query=106+ABT+COMPLEX+DINDUGAL+ROAD+PALANI+624601";
  const whatsappUrl = "https://wa.me/917598154009?text=Hello%20Siva%20Flex,%20I%20would%20like%20to%20enquire%20about%20printing%20services.";

  return (
    <header className="site-header">
      {/* Top Flex Print CMYK Spectrum Accent Bar */}
      <div className="cmyk-accent-bar" aria-hidden="true" />

      <div className="header-container">
        {/* Brand Logo & Name */}
        <div className="header-brand">
          <div className="logo-card">
            <Image
              src="/siva_flux_logo.png"
              alt="Siva Flex Palani Logo"
              width={62}
              height={56}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-title">
                <span className="text-red">SIVA</span> <span className="text-cursive">Flex</span>
              </h1>
              <span className="brand-city-badge">Palani</span>
            </div>
            <p className="brand-subtitle">Digital Printing &amp; Signage Solutions</p>
          </div>
        </div>

        {/* Location Section - Highlighted & Clickable to Google Maps */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="header-highlight-card location-card"
          title="Open Siva Flex Palani on Google Maps"
        >
          <div className="info-icon location-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className="info-content">
            <div className="badge-row">
              <span className="highlight-badge location-badge">
                <span className="badge-dot rose-dot"></span>
                Location
              </span>
              <span className="action-hint map-hint">Maps ↗</span>
            </div>
            <p className="info-main">106, ABT COMPLEX, DINDUGAL ROAD,</p>
            <p className="info-sub">PALANI - 624601, TAMIL NADU</p>
          </div>
        </a>

        {/* Contact & WhatsApp Enquiry Section - Highlighted & Clickable to WhatsApp */}
        <div className="header-highlight-card enquiry-card">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="info-icon whatsapp-icon live-pulse"
            title="Chat on WhatsApp (+91 75981 54009)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.83 2.41c-1.47 0-2.93-.39-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.27-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.13.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.23-.19-.48-.32z"/>
            </svg>
          </a>

          <div className="info-content">
            <div className="badge-row">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="highlight-badge enquiry-badge"
              >
                <span className="badge-dot green-dot"></span>
                For Enquiry &amp; Orders
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-hint whatsapp-hint"
              >
                WhatsApp 💬
              </a>
            </div>

            <a href="mailto:sivaflexpalani@gmail.com" className="contact-link" title="Send Email">
              ✉ sivaflexpalani@gmail.com
            </a>

            <div className="phone-numbers">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="phone-pill whatsapp-pill"
                title="Chat on WhatsApp"
              >
                <span className="pill-dot">●</span>
                +91 75981 54009
              </a>
              <span className="phone-sep">•</span>
              <a
                href="tel:+917200050800"
                className="phone-pill call-pill"
                title="Direct Phone Call"
              >
                📞 +91 72000 50800
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(2, 132, 199, 0.16);
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
          transition: all 0.3s ease;
        }

        .cmyk-accent-bar {
          height: 3.5px;
          width: 100%;
          background: linear-gradient(90deg, #0284c7 0%, #ec4899 35%, #f59e0b 70%, #10b981 100%);
        }

        .header-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1.25rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* Brand Block */
        .header-brand {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-shrink: 0;
        }

        .logo-card {
          background: #ffffff;
          padding: 0.2rem 0.4rem;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(2, 132, 199, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .logo-card:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 14px rgba(2, 132, 199, 0.18);
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .brand-title {
          font-size: 1.55rem;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        .text-red {
          color: #dc2626;
          text-shadow: 0 1px 2px rgba(220, 38, 38, 0.15);
        }

        .text-cursive {
          font-family: 'Amita', cursive, sans-serif;
          color: #0f172a;
          font-style: italic;
          margin-left: 0.15rem;
        }

        .brand-city-badge {
          background: #eff6ff;
          color: #0284c7;
          border: 1px solid #bfdbfe;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
        }

        .brand-subtitle {
          font-size: 0.74rem;
          color: #475569;
          font-weight: 600;
          margin-top: 0.15rem;
          letter-spacing: 0.01em;
        }

        /* Highlighted Interactive Cards */
        .header-highlight-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.6rem 0.95rem;
          border-radius: 14px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
          color: inherit;
        }

        /* Location Card Highlight Styling */
        .location-card {
          background: linear-gradient(135deg, #fff5f7 0%, #ffffff 100%);
          border: 1.5px solid #fda4af;
          box-shadow: 0 4px 14px rgba(244, 63, 94, 0.08);
          cursor: pointer;
        }

        .location-card:hover {
          transform: translateY(-2px);
          border-color: #f43f5e;
          box-shadow: 0 6px 20px rgba(244, 63, 94, 0.18);
          background: #ffffff;
        }

        /* Enquiry Card Highlight Styling */
        .enquiry-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          border: 1.5px solid #86efac;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);
        }

        .enquiry-card:hover {
          transform: translateY(-2px);
          border-color: #10b981;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.18);
        }

        /* Icon containers */
        .info-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .location-icon {
          background: #ffe4e6;
          color: #e11d48;
          border: 1px solid #fecdd3;
        }

        .whatsapp-icon {
          background: #dcfce7;
          color: #059669;
          border: 1px solid #bbf7d0;
          text-decoration: none;
          cursor: pointer;
        }

        .whatsapp-icon:hover {
          transform: scale(1.08);
          background: #10b981;
          color: #ffffff;
        }

        .info-content {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        /* Badges & Micro-Hints */
        .badge-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.15rem;
        }

        .highlight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          text-decoration: none;
        }

        .location-badge {
          background: #ffe4e6;
          color: #be123c;
          border: 1px solid #fecdd3;
        }

        .enquiry-badge {
          background: #dcfce7;
          color: #047857;
          border: 1px solid #bbf7d0;
          cursor: pointer;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .rose-dot {
          background: #e11d48;
        }

        .green-dot {
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .action-hint {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.12rem 0.4rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .map-hint {
          background: #f1f5f9;
          color: #475569;
        }

        .location-card:hover .map-hint {
          background: #e11d48;
          color: #ffffff;
        }

        .whatsapp-hint {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .whatsapp-hint:hover {
          background: #059669;
          color: #ffffff;
        }

        /* Typography */
        .info-main {
          font-size: 0.82rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
        }

        .info-sub {
          font-size: 0.74rem;
          color: #0284c7;
          font-weight: 700;
          line-height: 1.2;
        }

        .contact-link {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0284c7;
          text-decoration: none;
          transition: color 0.2s ease;
          display: inline-flex;
          align-items: center;
        }

        .contact-link:hover {
          color: #0369a1;
          text-decoration: underline;
        }

        .phone-numbers {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.2rem;
          flex-wrap: wrap;
        }

        .phone-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.74rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .whatsapp-pill {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .whatsapp-pill:hover {
          background: #10b981;
          color: #ffffff;
          border-color: #10b981;
        }

        .call-pill {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .call-pill:hover {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
        }

        .pill-dot {
          color: #10b981;
          font-size: 0.65rem;
        }

        .whatsapp-pill:hover .pill-dot {
          color: #ffffff;
        }

        .phone-sep {
          color: #cbd5e1;
          font-size: 0.7rem;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .header-container {
            gap: 0.85rem;
          }
          .header-highlight-card {
            flex: 1 1 calc(50% - 1rem);
          }
        }

        @media (max-width: 768px) {
          .site-header {
            padding-bottom: 0.25rem;
          }
          .header-container {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
            padding: 0.6rem 0.85rem;
          }
          .header-brand {
            justify-content: center;
            width: 100%;
          }
          .header-highlight-card {
            width: 100%;
            flex: 1 1 100%;
          }
          .phone-numbers {
            width: 100%;
          }
          .phone-pill {
            flex: 1;
            justify-content: center;
            padding: 0.4rem 0.5rem;
            font-size: 0.78rem;
          }
          .phone-sep {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .brand-title {
            font-size: 1.35rem;
          }
          .brand-subtitle {
            font-size: 0.7rem;
          }
          .logo-card {
            padding: 0.25rem 0.5rem;
          }
          .info-main {
            font-size: 0.78rem;
          }
          .info-sub {
            font-size: 0.72rem;
          }
        }
      `}</style>
    </header>
  );
}

