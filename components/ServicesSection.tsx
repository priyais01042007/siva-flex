"use client";

import React from "react";

const services = [
  {
    icon: "🪧",
    title: "Normal Frontlit Flex",
    desc: "Cost-effective, weather-resistant flex banners for events, temple festivals, and temporary promotional hoardings.",
    gsm: "240 - 280 GSM",
    finish: "Glossy / Matte",
    popular: true,
  },
  {
    icon: "⭐",
    title: "Star Flex (Heavy Duty)",
    desc: "Premium reinforced flex media designed for large highway billboards and permanent outdoor commercial signage.",
    gsm: "340 - 440 GSM",
    finish: "Ultra High Gloss",
    popular: true,
  },
  {
    icon: "💡",
    title: "Backlit Signboard Flex",
    desc: "Specially formulated for LED and fluorescent lightboxes with vibrant light transmission and evening clarity.",
    gsm: "450 - 510 GSM",
    finish: "Translucent Lightbox",
    popular: false,
  },
  {
    icon: "🎨",
    title: "Self-Adhesive Vinyl",
    desc: "Precision contour cut vinyl with cold lamination for shopfront displays, wall wraps, and vehicle branding.",
    gsm: "100 - 120 Microns",
    finish: "Gloss / Satin Laminated",
    popular: true,
  },
  {
    icon: "📸",
    title: "Eco-Solvent Photo Prints",
    desc: "Photographic grade ultra-high resolution prints ideal for indoor wedding backdrops, exhibitions, and fine art.",
    gsm: "1440 DPI Micro-Piezo",
    finish: "True Color Pigment",
    popular: false,
  },
  {
    icon: "🏢",
    title: "One-Way Vision & Foam Boards",
    desc: "Perforated window film for storefront visibility from inside + rigid foam sunpack sheets for directional signage.",
    gsm: "3mm / 5mm Sunboard",
    finish: "Perforated & Rigid",
    popular: false,
  },
];

export default function ServicesSection() {
  return (
    <section className="services-section">
      <div className="services-container">
        <div className="section-header">
          <span className="section-badge">Industrial Printing Capabilities</span>
          <h2 className="section-title">Our Flex & Digital Printing Range</h2>
          <p className="section-desc">
            Direct factory-scale manufacturing in Palani with Japanese ink technology, catering to printing dealers, sign makers, and enterprises across Dindigul and Tamil Nadu.
          </p>
        </div>

        <div className="services-grid">
          {services.map((s, idx) => (
            <div key={idx} className="service-card glass-panel">
              {s.popular && <span className="popular-badge">Dealer Favorite</span>}
              <div className="service-icon-box">{s.icon}</div>
              <h3 className="service-title">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
              
              <div className="service-meta">
                <div className="meta-tag">
                  <span className="meta-label">Specification</span>
                  <span className="meta-val">{s.gsm}</span>
                </div>
                <div className="meta-tag">
                  <span className="meta-label">Finish</span>
                  <span className="meta-val">{s.finish}</span>
                </div>
              </div>

              <a
                href={`https://wa.me/917598154009?text=Hello%20Siva%20Flex,%20I%20am%20interested%20in%20pricing%20for%20${encodeURIComponent(s.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="service-btn"
              >
                <span>Enquire Rates on WhatsApp</span>
                <span>→</span>
              </a>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .services-section {
          padding: 2.5rem 1.5rem 4rem 1.5rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .services-container {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .section-header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
        }

        .section-badge {
          display: inline-block;
          background: #fdf2f8;
          color: #ec4899;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          border: 1px solid #fbcfe8;
        }

        .section-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .section-desc {
          font-size: 0.95rem;
          color: #64748b;
          margin-top: 0.5rem;
          line-height: 1.5;
        }

        /* Exactly 3 per row on desktop */
        .services-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
        }

        .service-card {
          position: relative;
          border-radius: 20px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(2, 132, 199, 0.14);
          background: #ffffff;
          box-shadow: 0 4px 16px rgba(2, 132, 199, 0.04);
        }

        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 36px rgba(2, 132, 199, 0.12);
          border-color: #0284c7;
        }

        .popular-badge {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          background: linear-gradient(135deg, #ec4899, #db2777);
          color: #ffffff;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
        }

        .service-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #e0f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          margin-bottom: 1.25rem;
        }

        .service-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .service-desc {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 1.25rem;
          flex-grow: 1;
        }

        .service-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 1.25rem;
          border: 1px solid #e2e8f0;
        }

        .meta-tag {
          display: flex;
          flex-direction: column;
        }

        .meta-label {
          font-size: 0.68rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
        }

        .meta-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0284c7;
          margin-top: 0.15rem;
        }

        .service-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #ffffff;
          border: 1.5px solid #0284c7;
          color: #0284c7;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .service-btn:hover {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        }

        @media (max-width: 1024px) {
          .services-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .services-grid {
            grid-template-columns: 1fr;
          }
          .section-title {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </section>
  );
}
