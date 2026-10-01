"use client";

import React, { useState, useMemo } from "react";
import AdminNav from "@/components/AdminNav";

interface ReportItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gst?: string;
  date: string;
  number: string;
  amount: string;
  notes: string;
  width?: string;
  height?: string;
  area?: string;
  fileName?: string;
}

// Helper to format date into DD-MM-YYYY for filenames
function formatDDMMYYYY(val: string): string {
  if (!val) return "";
  const s = String(val).trim();
  const m1 = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m1) {
    const y = m1[1];
    const m = String(parseInt(m1[2], 10)).padStart(2, "0");
    const d = String(parseInt(m1[3], 10)).padStart(2, "0");
    return `${d}-${m}-${y}`;
  }
  const m2 = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m2) {
    const p1 = parseInt(m2[1], 10);
    const p2 = parseInt(m2[2], 10);
    const y2 = m2[3];
    let d2: string, m2v: string;
    if (p1 > 12) {
      d2 = String(p1).padStart(2, "0");
      m2v = String(p2).padStart(2, "0");
    } else if (p2 > 12) {
      m2v = String(p1).padStart(2, "0");
      d2 = String(p2).padStart(2, "0");
    } else {
      d2 = String(p1).padStart(2, "0");
      m2v = String(p2).padStart(2, "0");
    }
    return `${d2}-${m2v}-${y2}`;
  }
  return s.replace(/[/.]/g, "-");
}

function getTodayDDMMYYYY(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}

// Clean date/time: strictly remove any .000000 or fractional seconds
function cleanDateTime(val: string): string {
  if (!val) return "";
  let s = String(val).trim().replace(/\.000000$/, "").replace(/\.\d+$/, "");
  if (s.length === 10) {
    s = `${s} 00:00:00`;
  }
  return s;
}

export default function StatementReportPage() {
  const [statementType, setStatementType] = useState<string>("customer_sales");
  const [statementTitle, setStatementTitle] = useState<string>("Customer Sales Statement");
  const [sdate, setSdate] = useState<string>("");
  const [edate, setEdate] = useState<string>("");

  // DO NOT preload records. Only load after clicking "Get"
  const [records, setRecords] = useState<ReportItem[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entriesPerPage, setEntriesPerPage] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Fetch report data ONLY when user explicitly submits form or applies preset
  const loadStatementData = async (typeOverride?: string, fromOverride?: string, toOverride?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const targetType = typeOverride || statementType;
      const targetFrom = fromOverride !== undefined ? fromOverride : sdate;
      const targetTo = toOverride !== undefined ? toOverride : edate;

      const params = new URLSearchParams();
      params.set("type", targetType);
      if (targetFrom) params.set("sdate", targetFrom);
      if (targetTo) params.set("edate", targetTo);

      const res = await fetch(`/api/admin/reports?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load statement report");
      }

      const cleanData = (json.data || []).map((r: any) => ({
        ...r,
        date: cleanDateTime(r.date),
      }));
      setRecords(cleanData);
      setStatementTitle(json.statementTitle || "Statement Report");
      setHasSearched(true);
      setCurrentPage(1);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading reports");
    } finally {
      setLoading(false);
    }
  };

  const handleGetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStatementData();
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
      fromStr = "";
      toStr = "";
    }

    setSdate(fromStr);
    setEdate(toStr);
    loadStatementData(undefined, fromStr, toStr);
  };

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          r.name.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.number.toLowerCase().includes(q) ||
          r.amount.includes(q) ||
          r.notes.toLowerCase().includes(q) ||
          r.date.includes(q) ||
          (r.gst && r.gst.toLowerCase().includes(q))
        );
      });
    }

    return [...list].sort((a, b) => {
      let valA: string | number = a.date;
      let valB: string | number = b.date;
      if (sortField === "amount") {
        valA = parseFloat(a.amount) || 0;
        valB = parseFloat(b.amount) || 0;
      } else if (sortField === "number") {
        valA = a.number;
        valB = b.number;
      } else if (sortField === "name") {
        valA = a.name;
        valB = b.name;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, searchQuery, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  // Aggregate stats
  const totalAmountSum = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);
  }, [filteredRecords]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / entriesPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, filteredRecords.length);
  const currentRows = filteredRecords.slice(startIndex, endIndex);

  // Pagination page buttons generator (guarantees unique keys)
  const getPaginationPages = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);

    if (current > 3) {
      pages.push("ellipsis-1");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("ellipsis-2");
    }

    pages.push(total);
    return pages;
  };

  // Standardized export filename: [FirstField]_[FromDate]_[ToDate].[ext]
  const getExportFilename = (ext: string): string => {
    let cleanTitle = statementTitle.replace(/[^a-zA-Z0-9]/g, "");
    if (!cleanTitle) cleanTitle = "StatementReport";

    const fromFormatted = formatDDMMYYYY(sdate) || getTodayDDMMYYYY();
    const toFormatted = formatDDMMYYYY(edate) || fromFormatted || getTodayDDMMYYYY();

    return `${cleanTitle}_${fromFormatted}_${toFormatted}.${ext}`;
  };

  // Export Handlers
  const copyWithFallback = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2500);
      }).catch(() => {
        execCommandCopy(text);
      });
    } else {
      execCommandCopy(text);
    }
  };

  const execCommandCopy = (text: string) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const handleCopyClipboard = () => {
    if (filteredRecords.length === 0) return;
    const lines = filteredRecords.map((r) => {
      return `${r.name}\t${r.phone}\t${cleanDateTime(r.date)}\t${r.number}\t${r.amount}\t${r.notes}`;
    });
    const header = "Entity\tPhone\tDate\tNumber\tAmount\tNotes";
    const text = [header, ...lines].join("\n");
    copyWithFallback(text);
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    let col1 = "Customer";
    let col2 = "Sales Date";
    let col3 = "Sales Number";
    let col4 = "Sales Amount";
    let col5 = "Sales Notes";

    if (statementType === "customer_credit") {
      col1 = "Customer";
      col2 = "Credit Date";
      col3 = "Credit Number";
      col4 = "Credit Amount";
      col5 = "Credit Notes";
    } else if (statementType === "supplier_purchase") {
      col1 = "Supplier";
      col2 = "Invoice Date";
      col3 = "Invoice Number";
      col4 = "Invoice Amount";
      col5 = "Invoice Notes";
    } else if (statementType === "supplier_debit") {
      col1 = "Supplier";
      col2 = "Debit Date";
      col3 = "Debit Number";
      col4 = "Debit Amount";
      col5 = "Debit Notes";
    }

    const headers = [col1, "Contact Info", col2, col3, col4, col5];
    const csvRows = [
      headers.join(","),
      ...filteredRecords.map((r) => {
        const contact = `${r.phone} | ${r.email} | ${r.address}${r.gst ? ` | GST: ${r.gst}` : ""}`;
        return [
          `"${r.name.replace(/"/g, '""')}"`,
          `"${contact.replace(/"/g, '""')}"`,
          `"${r.date}"`,
          `"${r.number.replace(/"/g, '""')}"`,
          `"${r.amount}"`,
          `"${r.notes.replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ];

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFilename("csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;

    let col1 = "Customer";
    let col2 = "Sales Date";
    let col3 = "Sales Number";
    let col4 = "Sales Amount";
    let col5 = "Sales Notes";

    if (statementType === "customer_credit") {
      col1 = "Customer";
      col2 = "Credit Date";
      col3 = "Credit Number";
      col4 = "Credit Amount";
      col5 = "Credit Notes";
    } else if (statementType === "supplier_purchase") {
      col1 = "Supplier";
      col2 = "Invoice Date";
      col3 = "Invoice Number";
      col4 = "Invoice Amount";
      col5 = "Invoice Notes";
    } else if (statementType === "supplier_debit") {
      col1 = "Supplier";
      col2 = "Debit Date";
      col3 = "Debit Number";
      col4 = "Debit Amount";
      col5 = "Debit Notes";
    }

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <h2>${statementTitle}</h2>
        <table border="1">
          <thead>
            <tr style="background:#e0f2fe;">
              <th>${col1}</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Email</th>
              <th>${col2}</th>
              <th>${col3}</th>
              <th>${col4}</th>
              <th>${col5}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords
              .map(
                (r) => `
              <tr>
                <td>${r.name}</td>
                <td>${r.address}</td>
                <td>${r.phone}</td>
                <td>${r.email}</td>
                <td>${r.date}</td>
                <td>${r.number}</td>
                <td>${r.amount}</td>
                <td>${r.notes}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f1f5f9;">
              <td colspan="6" style="text-align:right;">Total:</td>
              <td>${totalAmountSum.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFilename("xls");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const isCustomer = statementType.startsWith("customer");
  const isSales = statementType === "customer_sales";
  const isCredit = statementType === "customer_credit";
  const isPurchase = statementType === "supplier_purchase";

  const entityColTitle = isCustomer ? "Customer" : "Supplier";
  const dateColTitle = isSales
    ? "Salse Date"
    : isCredit
    ? "Credit Date"
    : isPurchase
    ? "Invoice Date"
    : "Debit Date";

  const numColTitle = isSales
    ? "Salse Number"
    : isCredit
    ? "Credit Number"
    : isPurchase
    ? "Invoice Number"
    : "Debit Number";

  const amtColTitle = isSales
    ? "Salse Amount"
    : isCredit
    ? "Credit Amount"
    : isPurchase
    ? "Invoice Amount"
    : "Debit Amount";

  const notesColTitle = isSales
    ? "Salse Notes"
    : isCredit
    ? "Credit Notes"
    : isPurchase
    ? "Invoice Notes"
    : "Debit Notes";

  return (
    <div className="admin-app-wrapper">
      <AdminNav />

      <main className="dashboard-content-area">
        {/* Top Header Card matching Customer & Supplier Payment style */}
        <div className="statement-header-card glass-panel">
          <div className="header-info-box">
            <h2 className="page-heading">Statement Report</h2>
            <p className="page-subheading">
              Select a statement type and date range, then click <strong>Get</strong> to inspect the accountancy ledger.
            </p>
          </div>

          {/* Accountancy Summary Badges (Matching Customer/Supplier Rupees view) */}
          <div className="accountancy-summary-section">
            <div className="acc-card entries-acc-card">
              <div className="acc-pill-badge badge-entries">Total Entries</div>
              <div className="acc-amount-val">
                {hasSearched ? filteredRecords.length.toLocaleString() : "—"}
              </div>
              <div className="acc-count-hint">
                {hasSearched ? `${statementTitle}` : "No query executed"}
              </div>
            </div>

            <div className="acc-card amount-acc-card">
              <div className="acc-pill-badge badge-amount">Total Amount</div>
              <div className="acc-amount-val">
                {hasSearched
                  ? `₹${totalAmountSum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "₹0.00"}
              </div>
              <div className="acc-count-hint">
                {sdate || edate ? `${sdate || "Start"} to ${edate || "Latest"}` : "All recorded dates"}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar Panel (Form matches Supplier/Customer Transaction Header) */}
        <div className="filter-panel glass-panel">
          <form onSubmit={handleGetSubmit} className="statement-filter-form">
            <div className="filter-group select-statement-group">
              <label htmlFor="statementSelect" className="filter-label">
                Select Statement <span className="req-star">*</span>
              </label>
              <select
                id="statementSelect"
                value={statementType}
                onChange={(e) => {
                  setStatementType(e.target.value);
                  setHasSearched(false);
                  setRecords([]);
                }}
                className="filter-input"
              >
                <option value="supplier_purchase">Supplier Purchase Statement</option>
                <option value="supplier_debit">Supplier Debit Statement</option>
                <option value="customer_sales">Customer Sales Statement</option>
                <option value="customer_credit">Customer Credit Statement</option>
              </select>
            </div>

            <div className="filter-group date-group">
              <label htmlFor="sdate" className="filter-label">
                Start Date
              </label>
              <input
                type="date"
                id="sdate"
                name="sdate"
                value={sdate}
                onChange={(e) => setSdate(e.target.value)}
                className="filter-input font-mono"
              />
            </div>

            <div className="filter-group date-group">
              <label htmlFor="edate" className="filter-label">
                End Date
              </label>
              <input
                type="date"
                id="edate"
                name="edate"
                value={edate}
                onChange={(e) => setEdate(e.target.value)}
                className="filter-input font-mono"
              />
            </div>

            <div className="filter-action-group">
              <button type="submit" className="get-action-btn" disabled={loading}>
                {loading ? <span className="btn-spinner"></span> : "Get"}
              </button>
            </div>
          </form>

          {/* Quick Presets Row */}
          <div className="presets-bar">
            <span className="presets-title">Date Presets:</span>
            <div className="preset-chips-list">
              <button type="button" onClick={() => applyPreset("today")} className="preset-chip-btn">
                Today
              </button>
              <button type="button" onClick={() => applyPreset("yesterday")} className="preset-chip-btn">
                Yesterday
              </button>
              <button type="button" onClick={() => applyPreset("this_week")} className="preset-chip-btn">
                This Week
              </button>
              <button type="button" onClick={() => applyPreset("this_month")} className="preset-chip-btn">
                This Month
              </button>
              <button type="button" onClick={() => applyPreset("last_month")} className="preset-chip-btn">
                Last Month
              </button>
              <button type="button" onClick={() => applyPreset("all")} className="preset-chip-btn all-chip">
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Table Card - Exactly Styled Like Customer/Supplier Ledger Page */}
        <div className="ledger-card glass-panel">
          {/* Header Row: Tab / Statement Title & Export Buttons */}
          <div className="ledger-header-row">
            <div className="active-statement-indicator">
              <span className="statement-type-icon">{isCustomer ? "👥" : "🏭"}</span>
              <span className="statement-type-title">{statementTitle}</span>
              {hasSearched && (
                <span className="count-pill">
                  {filteredRecords.length.toLocaleString()} entries
                </span>
              )}
            </div>

            {/* Export Buttons (Exact matches to customer & supplier payment pages) */}
            <div className="export-btn-group">
              <button
                type="button"
                className="export-chip"
                onClick={handleCopyClipboard}
                title="Copy to clipboard"
                disabled={filteredRecords.length === 0}
              >
                Copy
              </button>
              <button
                type="button"
                className="export-chip"
                onClick={handleExportCSV}
                title="Download as CSV"
                disabled={filteredRecords.length === 0}
              >
                CSV
              </button>
              <button
                type="button"
                className="export-chip"
                onClick={handleExportExcel}
                title="Export as Excel"
                disabled={filteredRecords.length === 0}
              >
                Excel
              </button>
              <button
                type="button"
                className="export-chip"
                onClick={() => window.print()}
                title="Print Statement"
                disabled={filteredRecords.length === 0}
              >
                Print
              </button>
            </div>
          </div>

          {copiedNotification && <div className="copied-toast">✓ Copied to clipboard!</div>}

          {/* Table Filter Bar: Show X entries & Real-time Search */}
          <div className="table-filter-bar">
            <div className="entries-select-wrapper">
              <span>Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
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

            <div className="search-box-wrapper">
              <span className="search-ico">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search..."
                className="ledger-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table Body Area */}
          {loading ? (
            <div className="state-placeholder-box">
              <div className="spinner"></div>
              <p>Loading statement entries from database...</p>
            </div>
          ) : errorMsg ? (
            <div className="state-placeholder-box error-box">
              <p className="err-txt">⚠ {errorMsg}</p>
              <button type="button" onClick={() => loadStatementData()} className="retry-btn">
                Retry
              </button>
            </div>
          ) : !hasSearched ? (
            <div className="state-placeholder-box empty-initial">
              <div className="empty-ico">🗓</div>
              <h3 className="empty-title">Ready to Generate Statement Report</h3>
              <p className="empty-desc">
                Select your desired statement type and date range above, then click{" "}
                <strong>Get</strong> to retrieve data.
              </p>
              <button
                type="button"
                onClick={() => loadStatementData()}
                className="initial-get-btn"
              >
                Load Statement
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="state-placeholder-box">
              <div className="empty-ico">📂</div>
              <h3 className="empty-title">No data available in table</h3>
              <p className="empty-desc">No records match your selected statement or date criteria.</p>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="retry-btn"
              >
                View All Time
              </button>
            </div>
          ) : (
            <div className="table-responsive-container">
              <table className="statement-table" id="tbl">
                <thead>
                  <tr>
                    {/* Column 1: Customer / Supplier */}
                    <th
                      className="sortable-th"
                      onClick={() => handleSort("name")}
                      style={{ width: "36%" }}
                    >
                      <div className="th-content">
                        <span>{entityColTitle}</span>
                        <span className="sort-indicator">
                          {sortField === "name" ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      </div>
                    </th>

                    {/* Column 2: Date */}
                    <th
                      className="sortable-th"
                      onClick={() => handleSort("date")}
                      style={{ width: "22%" }}
                    >
                      <div className="th-content">
                        <span>{dateColTitle}</span>
                        <span className="sort-indicator">
                          {sortField === "date" ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      </div>
                    </th>

                    {/* Column 3: Number */}
                    <th
                      className="sortable-th"
                      onClick={() => handleSort("number")}
                      style={{ width: "12%" }}
                    >
                      <div className="th-content">
                        <span>{numColTitle}</span>
                        <span className="sort-indicator">
                          {sortField === "number" ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      </div>
                    </th>

                    {/* Column 4: Amount */}
                    <th
                      className="sortable-th text-right"
                      onClick={() => handleSort("amount")}
                      style={{ width: "15%" }}
                    >
                      <div className="th-content justify-end">
                        <span>{amtColTitle}</span>
                        <span className="sort-indicator">
                          {sortField === "amount" ? (sortAsc ? "▲" : "▼") : "⇅"}
                        </span>
                      </div>
                    </th>

                    {/* Column 5: Notes */}
                    <th style={{ width: "15%" }}>{notesColTitle}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, idx) => (
                    <tr key={`${r.id}-${idx}`} className="statement-row">
                      {/* Entity Column: Name, Address, Phone, Email, GST */}
                      <td className="entity-cell">
                        <div className="entity-content">
                          <div className="entity-title-row">
                            <span className="entity-type-ico">{isCustomer ? "👤" : "🏭"}</span>
                            <span className="entity-primary-name">{r.name || "—"}</span>
                          </div>
                          {r.address && <div className="entity-address-line">{r.address}</div>}
                          <div className="entity-contact-inline">
                            {r.phone && (
                              <span className="contact-item">
                                📞 <a href={`tel:${r.phone}`}>{r.phone}</a>
                              </span>
                            )}
                            {r.email && (
                              <span className="contact-item">
                                ✉ <a href={`mailto:${r.email}`}>{r.email}</a>
                              </span>
                            )}
                          </div>
                          {r.gst && <div className="entity-gst-line">GST: {r.gst}</div>}
                          {r.fileName && (
                            <div className="entity-file-spec">
                              📄 {r.fileName} {r.width && r.height ? `(${r.width} × ${r.height} ft)` : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date Column */}
                      <td className="date-cell">
                        <span className="mono-date-text">{cleanDateTime(r.date)}</span>
                      </td>

                      {/* Number Column */}
                      <td className="number-cell">
                        <span className="mono-number-text">{r.number || "0"}</span>
                      </td>

                      {/* Amount Column */}
                      <td className="amount-cell text-right">
                        <span className="amount-value-bold">
                          {parseFloat(r.amount).toFixed(2)}
                        </span>
                      </td>

                      {/* Notes Column */}
                      <td className="notes-cell">
                        {r.notes ? (
                          <span className="notes-pill">{r.notes}</span>
                        ) : (
                          <span className="notes-empty">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="tfoot-summary-row">
                    <td colSpan={3} className="text-right">
                      <strong>Total ({filteredRecords.length.toLocaleString()} entries):</strong>
                    </td>
                    <td className="text-right">
                      <strong className="tfoot-total-amount">
                        {totalAmountSum.toFixed(2)}
                      </strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Table Footer: Entries Counter & Pagination */}
          <div className="table-footer-row">
            <div className="footer-entries-info">
              {filteredRecords.length > 0 ? (
                <>
                  Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{" "}
                  <strong>{filteredRecords.length.toLocaleString()}</strong> entries
                </>
              ) : (
                "Showing 0 to 0 of 0 entries"
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-nav-group">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="page-button prev-button"
                >
                  Previous
                </button>

                <div className="page-nums-list">
                  {getPaginationPages(validCurrentPage, totalPages).map((p, idx) => {
                    if (typeof p === "string") {
                      return (
                        <span key={`ellipsis-${idx}`} className="page-dots">
                          …
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-btn-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`page-num-button ${validCurrentPage === p ? "active-page" : ""}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="page-button next-button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .admin-app-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 40%, #e0f2fe 100%);
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          color: #0f172a;
        }

        .dashboard-content-area {
          flex: 1;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 1.25rem 1rem 3rem 1rem;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.14);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
          margin-bottom: 1.25rem;
        }

        /* Top Statement Header (Matches customer/supplier payment) */
        .statement-header-card {
          padding: 1.25rem 1.4rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .page-heading {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.2rem 0;
          letter-spacing: -0.01em;
        }

        .page-subheading {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }

        /* 3-Tier Accountancy Badges (Strictly matching customer/supplier view) */
        .accountancy-summary-section {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .acc-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.65rem 1rem;
          min-width: 150px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .acc-pill-badge {
          display: inline-block;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          width: fit-content;
          margin-bottom: 0.25rem;
        }

        .badge-entries {
          background: #f1f5f9;
          color: #475569;
        }

        .badge-amount {
          background: #dcfce7;
          color: #15803d;
        }

        .acc-amount-val {
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
        }

        .amount-acc-card .acc-amount-val {
          color: #15803d;
        }

        .acc-count-hint {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 0.1rem;
        }

        /* Filter Panel */
        .filter-panel {
          padding: 1.15rem 1.4rem;
        }

        .statement-filter-form {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .select-statement-group {
          flex: 2;
          min-width: 260px;
        }

        .date-group {
          flex: 1.2;
          min-width: 160px;
        }

        .filter-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
        }

        .req-star {
          color: #ef4444;
        }

        .filter-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.45rem 0.65rem;
          font-size: 0.86rem;
          color: #0f172a;
          outline: none;
          background: #ffffff;
          transition: border-color 0.15s ease;
          height: 38px;
        }

        .filter-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
        }

        .font-mono {
          font-family: monospace;
        }

        .filter-action-group {
          margin-bottom: 0.5px;
        }

        .get-action-btn {
          height: 38px;
          padding: 0 1.6rem;
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: #ffffff;
          font-weight: 800;
          font-size: 0.9rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
        }

        .get-action-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0369a1, #075985);
          transform: translateY(-1px);
        }

        .get-action-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Presets Bar */
        .presets-bar {
          margin-top: 0.85rem;
          padding-top: 0.75rem;
          border-top: 1px dashed #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .presets-title {
          font-size: 0.76rem;
          font-weight: 700;
          color: #64748b;
        }

        .preset-chips-list {
          display: flex;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .preset-chip-btn {
          padding: 0.25rem 0.55rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.76rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .preset-chip-btn:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .preset-chip-btn.all-chip {
          background: #e0f2fe;
          border-color: #7dd3fc;
          color: #0369a1;
        }

        .preset-chip-btn.all-chip:hover {
          background: #bae6fd;
        }

        /* Ledger Card (Matches customer_payment.php ledger-card) */
        .ledger-card {
          padding: 1.25rem 1.4rem;
        }

        .ledger-header-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.85rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .active-statement-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .statement-type-icon {
          font-size: 1.15rem;
        }

        .statement-type-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .count-pill {
          font-size: 0.75rem;
          font-weight: 700;
          color: #0284c7;
          background: #e0f2fe;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
        }

        /* Export Button Group (Exact match to Customer/Supplier page) */
        .export-btn-group {
          display: flex;
          gap: 0.35rem;
        }

        .export-chip {
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .export-chip:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .export-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .copied-toast {
          background: #dcfce7;
          color: #15803d;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          border: 1px solid #86efac;
          margin-bottom: 0.6rem;
          width: fit-content;
        }

        /* Filter & Search Bar (Exact match to Customer/Supplier page) */
        .table-filter-bar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 0.8rem;
          margin-bottom: 0.85rem;
        }

        .entries-select-wrapper {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.82rem;
          color: #475569;
        }

        .entries-select {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          font-size: 0.82rem;
          background: #ffffff;
        }

        .search-box-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 240px;
        }

        .search-ico {
          position: absolute;
          left: 0.6rem;
          font-size: 0.82rem;
          opacity: 0.6;
          pointer-events: none;
        }

        .ledger-search-input {
          width: 100%;
          padding: 0.35rem 1.8rem 0.35rem 2rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 0.82rem;
          outline: none;
        }

        .ledger-search-input:focus {
          border-color: #0284c7;
        }

        .clear-search-btn {
          position: absolute;
          right: 0.5rem;
          background: none;
          border: none;
          font-size: 0.75rem;
          color: #94a3b8;
          cursor: pointer;
        }

        /* Table Structure (Exact match to Customer/Supplier page) */
        .table-responsive-container {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .statement-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.84rem;
          text-align: left;
        }

        .statement-table thead th {
          background: #f8fafc;
          color: #1e293b;
          font-weight: 700;
          padding: 0.65rem 0.8rem;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .sortable-th {
          cursor: pointer;
          user-select: none;
        }

        .sortable-th:hover {
          background: #f1f5f9;
        }

        .th-content {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .justify-end {
          justify-content: flex-end;
        }

        .sort-indicator {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .text-right {
          text-align: right;
        }

        .statement-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s ease;
        }

        .statement-table tbody tr:hover {
          background: #f8fafc;
        }

        .statement-table tbody td {
          padding: 0.65rem 0.8rem;
          vertical-align: top;
        }

        /* Entity Cell */
        .entity-content {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .entity-title-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .entity-type-ico {
          font-size: 0.95rem;
        }

        .entity-primary-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .entity-address-line {
          font-size: 0.78rem;
          color: #64748b;
        }

        .entity-contact-inline {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          margin-top: 0.1rem;
        }

        .contact-item a {
          color: #0284c7;
          text-decoration: none;
        }

        .contact-item a:hover {
          text-decoration: underline;
        }

        .entity-gst-line {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          background: #f1f5f9;
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          width: fit-content;
          margin-top: 0.15rem;
        }

        .entity-file-spec {
          font-size: 0.74rem;
          color: #0284c7;
          font-weight: 600;
          margin-top: 0.15rem;
        }

        /* Date & Number cells */
        .mono-date-text,
        .mono-number-text {
          font-family: monospace;
          font-size: 0.82rem;
          color: #334155;
          font-weight: 600;
        }

        .amount-value-bold {
          font-family: monospace;
          font-size: 0.92rem;
          font-weight: 800;
          color: #047857;
        }

        .notes-pill {
          font-size: 0.78rem;
          color: #475569;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          display: inline-block;
        }

        .notes-empty {
          color: #cbd5e1;
        }

        /* Footer Row */
        .tfoot-summary-row td {
          background: #f8fafc;
          border-top: 2px solid #e2e8f0;
          padding: 0.75rem 0.8rem;
          font-size: 0.86rem;
        }

        .tfoot-total-amount {
          font-family: monospace;
          font-size: 1rem;
          font-weight: 800;
          color: #047857;
        }

        /* Table Footer Row */
        .table-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-top: 0.85rem;
          flex-wrap: wrap;
        }

        .footer-entries-info {
          font-size: 0.8rem;
          color: #64748b;
        }

        .pagination-nav-group {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .page-button {
          height: 30px;
          padding: 0 0.75rem;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .page-button:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }

        .page-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-nums-list {
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        .page-num-button {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .page-num-button:hover {
          background: #f1f5f9;
        }

        .page-num-button.active-page {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        .page-dots {
          padding: 0 0.25rem;
          color: #94a3b8;
          font-weight: 700;
        }

        /* State Placeholder Box */
        .state-placeholder-box {
          padding: 3.5rem 1rem;
          text-align: center;
        }

        .empty-ico {
          font-size: 2.2rem;
          margin-bottom: 0.5rem;
        }

        .empty-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.3rem 0;
        }

        .empty-desc {
          font-size: 0.85rem;
          color: #64748b;
          max-width: 480px;
          margin: 0 auto;
        }

        .initial-get-btn,
        .retry-btn {
          margin-top: 1rem;
          padding: 0.5rem 1.25rem;
          border-radius: 6px;
          border: 1px solid #0284c7;
          background: #0284c7;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .initial-get-btn:hover,
        .retry-btn:hover {
          background: #0369a1;
        }

        .err-txt {
          color: #dc2626;
          font-weight: 700;
        }

        .spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #e2e8f0;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin: 0 auto 0.75rem auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
