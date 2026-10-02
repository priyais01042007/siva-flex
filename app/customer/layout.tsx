import React from "react";
import CustomerNavbar from "@/components/CustomerNavbar";
import SessionTimeoutGuard from "@/components/SessionTimeoutGuard";

export const metadata = {
  title: "Dealer Portal - Siva Flex Palani",
  description: "Upload flex files, track live printing queues, and download invoices.",
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="customer-app-wrapper">
      <SessionTimeoutGuard />
      <CustomerNavbar />
      <main className="customer-dashboard-area">{children}</main>
      <style>{`
        .customer-app-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #e0f7fa 0%, #ffffff 50%, #e0f2fe 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #0f172a;
        }
        .customer-dashboard-area {
          flex: 1;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 1.25rem 0.75rem 3rem 0.75rem;
        }
      `}</style>
    </div>
  );
}
