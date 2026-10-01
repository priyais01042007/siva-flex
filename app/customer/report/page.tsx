"use client";

import React, { useState, useEffect, useMemo } from "react";

interface ReportItem {
  id: string;
  date: string;
  file?: string;
  fileName?: string;
  width?: string;
  height?: string;
  area?: string;
  number: string;
  amount: string;
  notes: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gst?: string;
}

interface SummaryInfo {
  totalSales: number;
  totalPaid: number;
  balance: number;
}

export default function CustomerReportPage() {
  const [statementType, setStatementType] = useState<"invoice" | "debit">("invoice");
  const [statementTitle, setStatementTitle] = useState<string>("Purchase Statement");

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [records, setRecords] = useState<ReportItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [summary, setSummary] = useState<SummaryInfo | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [hasQueried, setHasQueried] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [customerId, setCustomerId] = useState<string>("99");

  useEffect(() => {
    const stored = localStorage.getItem("siva_flex_customer");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id) setCustomerId(String(parsed.id));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchReport = async (typeOverride?: "invoice" | "debit", sOverride?: string, eOverride?: string) => {
    const targetS = sOverride !== undefined ? sOverride : startDate;
    const targetE = eOverride !== undefined ? eOverride : endDate;

    if (!targetS && !targetE && !sOverride && !eOverride) {
      alert("Please select From Date and To Date to get report.");
      return;
    }

    setLoading(true);
    setHasQueried(true);
    const targetType = typeOverride || statementType;

    try {
      let url = `/api/customer/report?customerId=${customerId}&type=${targetType}`;
      if (targetS) url += `&sdate=${targetS}`;
      if (targetE) url += `&edate=${targetE}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
        setCustomer(json.customer || null);
        setSummary(json.summary || null);
        setStatementTitle(json.statementTitle || (targetType === "debit" ? "Debit Statement" : "Purchase Statement"));
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Failed to load customer report:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatementChange = (type: "invoice" | "debit") => {
    setStatementType(type);
    if (hasQueried || startDate || endDate) {
      fetchReport(type);
    }
  };

  // Quick preset dates
  const applyPreset = (preset: "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "all") => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let fromStr = "";
    let toStr = "";

    if (preset === "today") {
      fromStr = fmt(now);
      toStr = fmt(now);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      fromStr = fmt(y);
      toStr = fmt(y);
    } else if (preset === "this_week") {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      fromStr = fmt(monday);
      toStr = fmt(now);
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      fromStr = fmt(first);
      toStr = fmt(now);
    } else if (preset === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      fromStr = fmt(first);
      toStr = fmt(last);
    } else if (preset === "all") {
      fromStr = "2020-01-01";
      toStr = fmt(now);
    }

    setStartDate(fromStr);
    setEndDate(toStr);
    fetchReport(statementType, fromStr, toStr);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return "⇅";
    return sortAsc ? "▲" : "▼";
  };

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          r.date.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q) ||
          r.amount.includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          (r.file && r.file.toLowerCase().includes(q))
        );
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date": {
          const tA = new Date(a.date).getTime() || 0;
          const tB = new Date(b.date).getTime() || 0;
          cmp = tA - tB;
          break;
        }
        case "file":
          cmp = (a.file || "").localeCompare(b.file || "");
          break;
        case "number":
          cmp = (a.number || "").localeCompare(b.number || "", undefined, { numeric: true });
          break;
        case "amount":
          cmp = Number(a.amount || 0) - Number(b.amount || 0);
          break;
        case "notes":
          cmp = (a.notes || "").localeCompare(b.notes || "");
          break;
        default:
          cmp = 0;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [records, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Export handlers
  const handleCopy = () => {
    if (filteredRecords.length === 0) return;
    let header = "";
    let body = "";

    if (statementType === "invoice") {
      header = "Invoice Date\tInvoice File\tInvoice Number\tInvoice Amount\tInvoice Notes\n";
      body = filteredRecords
        .map((r) => `${r.date}\t${r.file || ""}\t${r.number}\t${r.amount}\t${r.notes}`)
        .join("\n");
    } else {
      header = "Debit Date\tDebit Number\tDebit Amount\tDebit Notes\n";
      body = filteredRecords
        .map((r) => `${r.date}\t${r.number}\t${r.amount}\t${r.notes}`)
        .join("\n");
    }

    navigator.clipboard.writeText(header + body);
    alert("Report data copied to clipboard!");
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    let header = "";
    let rows = "";

    if (statementType === "invoice") {
      header = "Invoice Date,Invoice File,Invoice Number,Invoice Amount,Invoice Notes\r\n";
      rows = filteredRecords
        .map(
          (r) =>
            `"${r.date}","${(r.file || "").replace(/"/g, '""')}","${r.number}",${r.amount},"${r.notes.replace(/"/g, '""')}"`
        )
        .join("\r\n");
    } else {
      header = "Debit Date,Debit Number,Debit Amount,Debit Notes\r\n";
      rows = filteredRecords
        .map(
          (r) =>
            `"${r.date}","${r.number}",${r.amount},"${r.notes.replace(/"/g, '""')}"`
        )
        .join("\r\n");
    }

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${statementTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;
    let header = "";
    let rows = "";

    if (statementType === "invoice") {
      header = "Invoice Date\tInvoice File\tInvoice Number\tInvoice Amount\tInvoice Notes\r\n";
      rows = filteredRecords
        .map((r) => `${r.date}\t${r.file || ""}\t${r.number}\t${r.amount}\t${r.notes}`)
        .join("\r\n");
    } else {
      header = "Debit Date\tDebit Number\tDebit Amount\tDebit Notes\r\n";
      rows = filteredRecords
        .map((r) => `${r.date}\t${r.number}\t${r.amount}\t${r.notes}`)
        .join("\r\n");
    }

    const blob = new Blob(["\uFEFF" + header + rows], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${statementTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="customer-report-page">
      {/* Statement Selector & Customer Financial Summary Card */}
      <div className="statement-control-card">
        <div className="statement-select-strip">
          <span className="report-title-label">Report:</span>
          <div className="statement-tabs">
            <button
              type="button"
              onClick={() => handleStatementChange("invoice")}
              className={`statement-btn ${statementType === "invoice" ? "active" : ""}`}
            >
              📄 Invoice Statement
            </button>
            <button
              type="button"
              onClick={() => handleStatementChange("debit")}
              className={`statement-btn ${statementType === "debit" ? "active" : ""}`}
            >
              💳 Debit Statement
            </button>
          </div>
        </div>

        {/* Date Filter & Presets Strip */}
        <div className="date-filter-section">
          <div className="date-inputs-row">
            <div className="date-field">
              <label>From Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="filter-date-input"
              />
            </div>

            <div className="date-field">
              <label>To Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="filter-date-input"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchReport()}
              disabled={loading}
              className="get-report-btn"
            >
              {loading ? "Loading..." : "Get Report"}
            </button>
          </div>

          <div className="presets-row">
            <span className="presets-label">Presets:</span>
            <button type="button" onClick={() => applyPreset("today")} className="preset-chip">Today</button>
            <button type="button" onClick={() => applyPreset("yesterday")} className="preset-chip">Yesterday</button>
            <button type="button" onClick={() => applyPreset("this_week")} className="preset-chip">This Week</button>
            <button type="button" onClick={() => applyPreset("this_month")} className="preset-chip">This Month</button>
            <button type="button" onClick={() => applyPreset("last_month")} className="preset-chip">Last Month</button>
            <button type="button" onClick={() => applyPreset("all")} className="preset-chip reset">All Dates</button>
          </div>
        </div>

        {/* Customer Profile & Balances Strip - Shown when report is queried */}
        {hasQueried && customer && (
          <div className="customer-summary-box">
            <div className="customer-profile-block">
              <div className="cust-title">{statementTitle}</div>
              <div className="cust-name">{customer.name || "SIGARAM"}</div>
              <div className="cust-meta">{customer.address || "palani"}</div>
              <div className="cust-meta">{customer.phone || "9025011789"}</div>
              <div className="cust-meta email">{customer.email || "sigaramdesignspln@gmail.com"}</div>
            </div>

            <div className="financial-stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Invoiced (Sales)</span>
                <span className="stat-value sales">
                  ₹{Number(summary?.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Paid (Debits)</span>
                <span className="stat-value paid">
                  ₹{Number(summary?.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`stat-card ${(summary?.balance || 0) > 0 ? "balance-due" : "balance-clear"}`}>
                <span className="stat-label">Net Balance</span>
                <span className="stat-value balance">
                  ₹{Number(summary?.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Table Header Strip: Export & Search */}
        <div className="table-header-strip">
          <div className="export-buttons-group">
            <button onClick={handleCopy} className="dt-btn" title="Copy to clipboard">
              Copy
            </button>
            <button onClick={handleExportCSV} className="dt-btn" title="Export as CSV">
              CSV
            </button>
            <button onClick={handleExportExcel} className="dt-btn" title="Export as Excel">
              Excel
            </button>
            <button onClick={() => window.print()} className="dt-btn" title="Print statement">
              Print
            </button>
          </div>

          <div className="table-filter-controls">
            <div className="entries-wrap">
              <label htmlFor="rep-entries">Show</label>
              <select
                id="rep-entries"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="entries-select"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="search-wrap">
              <label htmlFor="rep-search">Search:</label>
              <input
                id="rep-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search statement records..."
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Table Scroll Area */}
        <div className="table-scroll-area">
          <table className="statement-table">
            <thead>
              {statementType === "invoice" ? (
                <tr>
                  <th style={{ width: "20%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                    Invoice Date <span className="sort-indicator">{getSortIcon("date")}</span>
                  </th>
                  <th style={{ width: "40%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("file")}>
                    Invoice File <span className="sort-indicator">{getSortIcon("file")}</span>
                  </th>
                  <th style={{ width: "12%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("number")}>
                    Invoice Number <span className="sort-indicator">{getSortIcon("number")}</span>
                  </th>
                  <th style={{ width: "13%", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("amount")}>
                    Invoice Amount <span className="sort-indicator">{getSortIcon("amount")}</span>
                  </th>
                  <th style={{ width: "15%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("notes")}>
                    Invoice Notes <span className="sort-indicator">{getSortIcon("notes")}</span>
                  </th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: "25%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                    Debit Date <span className="sort-indicator">{getSortIcon("date")}</span>
                  </th>
                  <th style={{ width: "25%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("number")}>
                    Debit Number <span className="sort-indicator">{getSortIcon("number")}</span>
                  </th>
                  <th style={{ width: "25%", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("amount")}>
                    Debit Amount <span className="sort-indicator">{getSortIcon("amount")}</span>
                  </th>
                  <th style={{ width: "25%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("notes")}>
                    Debit Notes <span className="sort-indicator">{getSortIcon("notes")}</span>
                  </th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={statementType === "invoice" ? 5 : 4} className="loading-cell">
                    Fetching statement records...
                  </td>
                </tr>
              ) : !hasQueried ? (
                <tr>
                  <td colSpan={statementType === "invoice" ? 5 : 4} className="empty-cell">
                    Please select From Date and To Date, then click <strong>Get Report</strong> to view records.
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={statementType === "invoice" ? 5 : 4} className="empty-cell">
                    No transactions found for the selected period.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) =>
                  statementType === "invoice" ? (
                    <tr key={r.id}>
                      <td className="date-cell">{r.date}</td>
                      <td className="file-cell">{r.file || r.fileName || "—"}</td>
                      <td className="num-cell">
                        <strong>#{r.number}</strong>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0284c7" }}>
                        ₹{r.amount}
                      </td>
                      <td className="notes-cell">{r.notes || "—"}</td>
                    </tr>
                  ) : (
                    <tr key={r.id}>
                      <td className="date-cell">{r.date}</td>
                      <td className="num-cell">
                        <strong>{r.number}</strong>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                        ₹{r.amount}
                      </td>
                      <td className="notes-cell">{r.notes || "—"}</td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="table-footer-strip">
          <div className="footer-info">
            Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} entries
          </div>

          <div className="pagination-group">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="page-btn"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                p = currentPage - 2 + i;
                if (p > totalPages) p = totalPages - (4 - i);
              }
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`page-btn page-num ${currentPage === p ? "active" : ""}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .customer-report-page {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Top Company Contact Card */
        .company-header-card {
          background: #ffffff;
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }

        .company-info-block {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .info-title {
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #0284c7;
          letter-spacing: 0.04em;
        }

        .info-detail {
          font-size: 0.92rem;
          color: #1e293b;
          font-weight: 600;
        }

        .phone-sep {
          color: #cbd5e1;
        }

        /* Statement Control Card */
        .statement-control-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          padding: 1.5rem 1.75rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .statement-select-strip {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .report-title-label {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .statement-tabs {
          display: inline-flex;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 3px;
          gap: 4px;
        }

        .statement-btn {
          border: none;
          background: transparent;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 700;
          padding: 0.5rem 1.25rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .statement-btn.active {
          background: #0284c7;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
        }

        /* Customer Summary Box */
        .customer-summary-box {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 1.5rem;
          padding: 1.25rem;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        @media (max-width: 850px) {
          .customer-summary-box {
            grid-template-columns: 1fr;
          }
        }

        .customer-profile-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .cust-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.15rem;
        }

        .cust-name {
          font-size: 1.3rem;
          font-weight: 800;
          color: #0f172a;
        }

        .cust-meta {
          font-size: 0.88rem;
          color: #475569;
        }

        .cust-meta.email {
          color: #0284c7;
          font-weight: 500;
        }

        .financial-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 650px) {
          .financial-stats-grid {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 1.2rem;
          font-weight: 800;
        }

        .stat-value.sales {
          color: #0284c7;
        }

        .stat-value.paid {
          color: #16a34a;
        }

        .stat-card.balance-due .stat-value.balance {
          color: #dc2626;
        }

        .stat-card.balance-clear .stat-value.balance {
          color: #059669;
        }

        /* Date Filter Section */
        .date-filter-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .date-inputs-row {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .date-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .filter-date-input {
          height: 38px;
          padding: 0.35rem 0.65rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          background: #fff;
          outline: none;
        }

        .filter-date-input:focus {
          border-color: #0284c7;
        }

        .get-report-btn {
          height: 38px;
          padding: 0 1.5rem;
          background: #0284c7;
          border: none;
          color: #fff;
          font-weight: 700;
          font-size: 0.92rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .get-report-btn:hover:not(:disabled) {
          background: #0369a1;
        }

        .presets-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .presets-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
        }

        .preset-chip {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.25rem 0.65rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preset-chip:hover {
          background: #e2e8f0;
          color: #0284c7;
          border-color: #0284c7;
        }

        .preset-chip.reset {
          background: #e0f2fe;
          border-color: #bae6fd;
          color: #0284c7;
        }

        /* Table Card */
        .table-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          padding: 1.5rem 1.75rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }

        .table-header-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .export-buttons-group {
          display: inline-flex;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid #ccc;
        }

        .dt-btn {
          background: #e9ecef;
          color: #212529;
          border: none;
          border-right: 1px solid #ccc;
          padding: 0.375rem 0.85rem;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .dt-btn:last-child {
          border-right: none;
        }

        .dt-btn:hover {
          background: #dde2e6;
        }

        .table-filter-controls {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .entries-wrap {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.88rem;
          color: #475569;
        }

        .entries-select {
          height: 32px;
          padding: 0.15rem 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 0.88rem;
          background: #fff;
          outline: none;
          cursor: pointer;
        }

        .entries-select:focus {
          border-color: #0284c7;
        }

        .search-wrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.9rem;
          color: #333;
        }

        .search-input {
          height: 32px;
          padding: 0.25rem 0.5rem;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 0.9rem;
          outline: none;
        }

        .search-input:focus {
          border-color: #80bdff;
        }

        .sort-indicator {
          display: inline-block;
          margin-left: 0.25rem;
          font-size: 0.8rem;
          color: #0284c7;
        }

        .table-scroll-area {
          overflow-x: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        .statement-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .statement-table th {
          background-color: #eaf4fd;
          color: #1e3a8a;
          font-weight: 600;
          padding: 0.65rem 0.75rem;
          border-bottom: 2px solid #b6d4fe;
          white-space: nowrap;
        }

        .statement-table td {
          padding: 0.65rem 0.75rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .statement-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .date-cell {
          white-space: nowrap;
          color: #334155;
        }

        .file-cell {
          font-weight: 500;
          color: #1e293b;
          word-break: break-all;
        }

        .num-cell {
          white-space: nowrap;
        }

        .notes-cell {
          color: #64748b;
        }

        .table-footer-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1.25rem;
          font-size: 0.85rem;
          color: #495057;
        }

        .pagination-group {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .page-btn {
          background: #f8f9fa;
          border: 1px solid #ced4da;
          padding: 0.3rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #007bff;
        }

        .page-btn:hover:not(:disabled) {
          background: #e9ecef;
        }

        .page-btn:disabled {
          color: #6c757d;
          cursor: not-allowed;
          opacity: 0.65;
        }

        .page-num.active {
          background: #0284c7 !important;
          color: #ffffff !important;
          border-color: #0284c7 !important;
          font-weight: 700;
        }

        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 2.5rem !important;
          color: #64748b;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
