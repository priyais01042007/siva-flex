"use client";

import React from "react";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Col 1: Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-logo-card">
              <Image
                src="/siva_flux_logo.png"
                alt="Siva Flex"
                width={62}
                height={56}
                style={{ objectFit: "contain" }}
              />
            </div>
            <p className="footer-bio">
              Palani’s leading digital flex and wide-format printing press. Empowering printing dealers, advertising agencies, and local businesses with express high-definition solvent prints.
            </p>
            <div className="footer-timing">
              <span className="timing-icon">🕒</span>
              <span>Mon – Sat: 9:00 AM – 9:30 PM</span>
            </div>
          </div>

          {/* Col 2: Printing Capabilities */}
          <div className="footer-col">
            <h4 className="footer-heading">Printing Services</h4>
            <ul className="footer-links">
              <li>Frontlit & Backlit Flex Banners</li>
              <li>Star Flex (Heavy Outdoor Hoardings)</li>
              <li>Self-Adhesive Glossy & Matte Vinyl</li>
              <li>Eco-Solvent Photographic Posters</li>
              <li>Glow Sign Boards & LED Lightboxes</li>
              <li>One-Way Vision Window Films</li>
            </ul>
          </div>

          {/* Col 3: Dealer & Workflow */}
          <div className="footer-col">
            <h4 className="footer-heading">Dealer Workflow</h4>
            <ul className="footer-links">
              <li>Dealer Registration</li>
              <li>File Upload Guidelines (.TIFF / .PDF)</li>
              <li>Live Print Order Tracking</li>
              <li>Square Footage Rates</li>
              <li>Palani & Regional Delivery Network</li>
            </ul>
          </div>

          {/* Col 4: Factory & Direct Support */}
          <div className="footer-col">
            <h4 className="footer-heading">Factory & Direct Contact</h4>
            <div className="contact-list">
              <div className="contact-item">
                <span className="c-icon">📍</span>
                <span>106ABT COMPLEX, DINDUGAL ROAD, PALANI - 624601, TAMIL NADU</span>
              </div>
              <div className="contact-item">
                <span className="c-icon">✉</span>
                <a href="mailto:sivaflexpalani@gmail.com">sivaflexpalani@gmail.com</a>
              </div>
              <div className="contact-item">
                <span className="c-icon">📞</span>
                <div className="phone-stack">
                  <a href="tel:+917598154009">+91 75981 54009</a>
                  <a href="tel:+917200050800">+91 72000 50800</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar (NO Let's Solve Tech reference) */}
        <div className="footer-bottom">
          <p>© 2026 Siva Flex Printing Management. All rights reserved.</p>
          <div className="bottom-badges">
            <span className="badge-pill">Quality Guaranteed</span>
            <span className="badge-pill">Palani, Tamil Nadu</span>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Action Button */}
      <a
        href="https://wa.me/917598154009?text=Hello%20Siva%20Flex,%20I%20have%20an%20enquiry%20regarding%20printing%20orders."
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp-btn live-pulse"
        title="Chat with Siva Flex Support"
      >
        <span className="wa-icon">💬</span>
        <span className="wa-text">WhatsApp Support</span>
      </a>

      <style jsx>{`
        .site-footer {
          background: #0f172a;
          color: #f8fafc;
          padding: 4rem 1.5rem 2rem 1.5rem;
          border-top: 2px solid rgba(2, 132, 199, 0.3);
        }

        .footer-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 2.5rem;
          margin-bottom: 3.5rem;
        }

        .footer-col {
          display: flex;
          flex-direction: column;
        }

        .footer-logo-card {
          display: inline-block;
          background: #ffffff;
          padding: 0.2rem 0.4rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          width: fit-content;
        }

        .footer-bio {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .footer-timing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #38bdf8;
          font-weight: 600;
        }

        .footer-heading {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 1.25rem;
          position: relative;
          padding-bottom: 0.5rem;
        }

        .footer-heading::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          width: 32px;
          height: 2px;
          background: #0284c7;
          border-radius: 2px;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          font-size: 0.85rem;
          color: #cbd5e1;
        }

        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          line-height: 1.4;
        }

        .c-icon {
          color: #38bdf8;
          font-size: 1rem;
        }

        .phone-stack {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .contact-item a {
          color: #38bdf8;
          transition: color 0.2s ease;
        }

        .contact-item a:hover {
          color: #7dd3fc;
          text-decoration: underline;
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 0.82rem;
          color: #94a3b8;
        }

        .bottom-badges {
          display: flex;
          gap: 0.65rem;
        }

        .badge-pill {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          color: #cbd5e1;
        }

        .floating-whatsapp-btn {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          background: #10b981;
          color: #ffffff;
          padding: 0.75rem 1.25rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          z-index: 999;
          transition: all 0.3s ease;
        }

        .floating-whatsapp-btn:hover {
          background: #059669;
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 12px 30px rgba(16, 185, 129, 0.5);
        }

        .wa-icon {
          font-size: 1.2rem;
        }

        @media (max-width: 640px) {
          .footer-bottom {
            flex-direction: column;
            text-align: center;
          }
          .floating-whatsapp-btn .wa-text {
            display: none;
          }
          .floating-whatsapp-btn {
            padding: 0.85rem;
          }
        }
      `}</style>
    </footer>
  );
}
