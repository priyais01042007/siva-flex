"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import AuthCard from "./AuthCard";

const slides = [
  { id: 1, image: "/1.jpeg", alt: "Siva Flex Palani - Digital Printing Machine Banner" },
  { id: 2, image: "/2.jpeg", alt: "Heavy-Duty Wide-Format Printing Machinery" },
  { id: 3, image: "/3.jpeg", alt: "Vibrant Color Output Flex Roll Prints" },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 45) {
        // Swiped left -> next slide
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      } else if (diff < -45) {
        // Swiped right -> prev slide
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Left: Full Unobstructed Showcase Banner Carousel */}
        <div 
          className="carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="carousel-inner">
            {slides.map((s, idx) => (
              <div
                key={s.id}
                className={`carousel-slide ${idx === currentSlide ? "active" : ""}`}
                aria-hidden={idx !== currentSlide}
              >
                <div className="slide-image-container">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    priority={idx === 0}
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 750px"
                  />
                </div>
              </div>
            ))}

            {/* Slider Navigation Arrows */}
            <button
              type="button"
              className="carousel-nav prev"
              onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
              aria-label="Previous Banner"
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-nav next"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              aria-label="Next Banner"
            >
              ›
            </button>

            {/* Indicator Dots */}
            <div className="carousel-dots">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`dot ${idx === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Modern Sign In & Sign Up Card */}
        <div className="auth-wrapper">
          <AuthCard />
        </div>
      </div>

      <style jsx>{`
        .hero-section {
          padding: 1.25rem 1.25rem 2rem 1.25rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-container {
          display: flex;
          align-items: stretch;
          gap: 1.75rem;
          flex-wrap: wrap;
        }

        .carousel-wrapper {
          flex: 1 1 600px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .carousel-inner {
          position: relative;
          width: 100%;
          aspect-ratio: 1280 / 627;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(2, 132, 199, 0.22);
          background: #0f172a;
          touch-action: pan-y;
        }

        .carousel-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s ease;
          pointer-events: none;
          transform: scale(1.02);
        }

        .carousel-slide.active {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1);
        }

        .slide-image-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .carousel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #0f172a;
          font-size: 1.8rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .carousel-nav:hover {
          background: #ffffff;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
          transform: translateY(-50%) scale(1.08);
          color: #0284c7;
        }

        .carousel-nav.prev {
          left: 0.85rem;
        }

        .carousel-nav.next {
          right: 0.85rem;
        }

        .carousel-dots {
          position: absolute;
          bottom: 0.75rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.45rem;
          z-index: 10;
          background: rgba(15, 23, 42, 0.45);
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dot.active {
          width: 26px;
          background: #ffffff;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
        }

        .auth-wrapper {
          flex: 0 0 390px;
          display: flex;
          align-items: stretch;
          justify-content: center;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .hero-container {
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }
          .carousel-wrapper {
            width: 100%;
            flex: 1 1 auto;
          }
          .auth-wrapper {
            width: 100%;
            max-width: 480px;
            flex: 1 1 auto;
          }
        }

        @media (max-width: 640px) {
          .hero-section {
            padding: 0.85rem 0.85rem 1.5rem 0.85rem;
          }
          .carousel-inner {
            border-radius: 14px;
          }
          .carousel-nav {
            width: 34px;
            height: 34px;
            font-size: 1.4rem;
          }
          .carousel-nav.prev {
            left: 0.4rem;
          }
          .carousel-nav.next {
            right: 0.4rem;
          }
          .carousel-dots {
            bottom: 0.5rem;
            padding: 0.25rem 0.6rem;
          }
          .dot {
            width: 7px;
            height: 7px;
          }
          .dot.active {
            width: 20px;
          }
          .auth-wrapper {
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}

