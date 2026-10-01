"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";

interface InvoiceDateRow {
  date: string;
  totalFiles: number;
  invoiceNumber: string;
  totalAmount: string;
}

interface InvoiceBillItem {
  sno: number;
  id: string;
  fileType: string;
  fileName: string;
  width: string;
  height: string;
  area: string;
  areaFormula: string;
  rate: string;
  qty: string;
  flexAmt: string;
  gst: string;
  cgst: string;
  sgst: string;
  gstAmt: string;
  totalAmt: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gst?: string;
}

interface InvoiceBillData {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  customer: CustomerInfo;
  items: InvoiceBillItem[];
  totalFlexAmt: string;
  totalGstAmt: string;
  grandTotal: string;
}

export default function CustomerInvoicePage() {
  const [viewMode, setViewMode] = useState<"dates" | "bill">("dates");
  const [datesList, setDatesList] = useState<InvoiceDateRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [billData, setBillData] = useState<InvoiceBillData | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [hasQueried, setHasQueried] = useState<boolean>(false);
  const [billLoading, setBillLoading] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sorting
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [customerId, setCustomerId] = useState<string>("99");

  useEffect(() => {
    let cid = "99";
    const stored = localStorage.getItem("siva_flex_customer");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.id) {
          cid = String(parsed.id);
          setCustomerId(cid);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Check if URL has ?date= or ?bid=
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date") || params.get("bid");
    if (dateParam) {
      loadBillDetail(dateParam, cid);
    }
  }, []);

  const fetchDates = async (cId?: string, sDate?: string, eDate?: string) => {
    const targetS = sDate !== undefined ? sDate : startDate;
    const targetE = eDate !== undefined ? eDate : endDate;

    if (!targetS && !targetE && !sDate && !eDate) {
      alert("Please select From Date and To Date to view invoices.");
      return;
    }

    setLoading(true);
    setHasQueried(true);
    const targetCid = cId || customerId;

    try {
      let url = `/api/customer/invoices?customerId=${targetCid}`;
      if (targetS) url += `&startDate=${targetS}`;
      if (targetE) url += `&endDate=${targetE}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.dates)) {
        setDatesList(json.dates);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Failed to load invoice dates:", err);
    } finally {
      setLoading(false);
    }
  };

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
    fetchDates(undefined, fromStr, toStr);
  };

  const loadBillDetail = async (dateStr: string, cId?: string) => {
    setBillLoading(true);
    setSelectedDate(dateStr);
    setViewMode("bill");

    const targetCid = cId || customerId;
    try {
      const res = await fetch(`/api/customer/invoices?customerId=${targetCid}&date=${dateStr}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setBillData(json);
      }
    } catch (err) {
      console.error("Failed to load bill detail:", err);
    } finally {
      setBillLoading(false);
    }
  };

  const handleBackToDates = () => {
    setViewMode("dates");
    setSelectedDate("");
    setBillData(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("date");
    url.searchParams.delete("bid");
    window.history.pushState({}, "", url.toString());
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

  // Filtered and sorted dates list
  const filteredDates = useMemo(() => {
    let list = datesList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.date.toLowerCase().includes(q) ||
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.totalAmount.includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "number") {
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true });
      } else if (sortField === "files") {
        cmp = a.totalFiles - b.totalFiles;
      } else if (sortField === "amount") {
        cmp = Number(a.totalAmount) - Number(b.totalAmount);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [datesList, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredDates.length / pageSize) || 1;
  const paginatedDates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDates.slice(start, start + pageSize);
  }, [filteredDates, currentPage, pageSize]);

  // Export handlers for dates table
  const handleCopyDates = () => {
    if (filteredDates.length === 0) return;
    const header = "Invoice Date\tInvoice Number\tTotal Files\tTotal Amount (₹)\n";
    const body = filteredDates
      .map((d) => `${d.date}\t${d.invoiceNumber}\t${d.totalFiles}\t${d.totalAmount}`)
      .join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Invoice dates copied to clipboard!");
  };

  const handleExportCSVDates = () => {
    if (filteredDates.length === 0) return;
    const header = "Invoice Date,Invoice Number,Total Files,Total Amount\r\n";
    const rows = filteredDates
      .map((d) => `"${d.date}","${d.invoiceNumber}",${d.totalFiles},${d.totalAmount}`)
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice_Dates_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="customer-invoice-page">
      {viewMode === "dates" ? (
        /* ================= VIEW 1: DATES LIST ================= */
        <div className="invoice-dates-view">
          {/* Filter Card */}
          <div className="filter-card">
            <h4 className="card-title">INVOICE</h4>
            <div className="filter-row">
              <div className="input-group">
                <label>From Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>

              <div className="input-group">
                <label>To Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchDates()}
                className="filter-btn"
                disabled={loading}
              >
                {loading ? "Loading..." : "Filter Invoices"}
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

          {/* Table Card */}
          <div className="table-card">
            <div className="table-header-strip">
              <div className="export-buttons-group">
                <button onClick={handleCopyDates} className="dt-btn" title="Copy to clipboard">
                  Copy
                </button>
                <button onClick={handleExportCSVDates} className="dt-btn" title="Export as CSV">
                  CSV
                </button>
                <button onClick={() => window.print()} className="dt-btn" title="Print table">
                  Print
                </button>
              </div>

              <div className="table-filter-controls">
                <div className="entries-wrap">
                  <label htmlFor="inv-entries">Show</label>
                  <select
                    id="inv-entries"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="entries-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="search-wrap">
                  <label htmlFor="inv-search">Search:</label>
                  <input
                    id="inv-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by date or number..."
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-scroll-area">
              <table className="dates-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("date")}>
                      Invoice Date <span className="sort-indicator">{getSortIcon("date")}</span>
                    </th>
                    <th style={{ width: "20%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("files")}>
                      Total Files <span className="sort-indicator">{getSortIcon("files")}</span>
                    </th>
                    <th style={{ width: "25%", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("amount")}>
                      Total Amount <span className="sort-indicator">{getSortIcon("amount")}</span>
                    </th>
                    <th style={{ width: "20%", textAlign: "center" }}>Action ⇅</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="loading-cell">
                        Loading invoice records...
                      </td>
                    </tr>
                  ) : !hasQueried ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        Please select From Date and To Date, then click <strong>Filter Invoices</strong> to view records.
                      </td>
                    </tr>
                  ) : paginatedDates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        No invoice records found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    paginatedDates.map((row) => (
                      <tr key={row.date}>
                        <td className="date-cell">
                          <strong>{row.date}</strong>
                        </td>
                        <td>
                          <span className="file-count-badge">{row.totalFiles} File(s)</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#0284c7" }}>
                          ₹{Number(row.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => loadBillDetail(row.date)}
                            className="action-btn"
                            title={`View Bill for ${row.date}`}
                          >
                            Action ➔
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-footer-strip">
              <div className="footer-info">
                Showing {filteredDates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredDates.length)} of {filteredDates.length} entries
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
        </div>
      ) : (
        /* ================= VIEW 2: SINGLE DATE INVOICE BILL ================= */
        <div className="single-bill-view">
          {/* Top Action Bar */}
          <div className="bill-action-bar">
            <button type="button" onClick={handleBackToDates} className="back-btn">
              ← Back to Invoices List
            </button>

            <div className="action-buttons-right">
              <button
                type="button"
                onClick={() => window.print()}
                className="print-main-btn"
                title="Print Invoice"
              >
                🖨️ Print
              </button>
            </div>
          </div>

          {billLoading ? (
            <div className="bill-loading-card">Loading invoice details for {selectedDate}...</div>
          ) : billData ? (
            /* Printable / Visual Invoice Container */
            <div className="invoice-sheet-container" id="printable-invoice">
              {/* Top 3-block Header Grid */}
              <div className="invoice-header-grid">
                {/* Block 1: Siva Flex Logo + Details in Text */}
                <div className="header-box box-company">
                  <div className="logo-and-text">
                    <div className="logo-wrap">
                      <Image
                        src="/siva_flux_logo.png"
                        alt="Siva Flex Logo"
                        width={90}
                        height={60}
                        style={{ objectFit: "contain" }}
                        priority
                      />
                    </div>
                    <div className="company-text-details">
                      <h2 className="company-brand-name">SIVA FLEX</h2>
                      <div className="company-gst">
                        GST No: <strong>33ANAPM3517F2ZG</strong>
                      </div>
                      <div className="company-addr">106 ABT COMPLEX, DINDUGAL ROAD,</div>
                      <div className="company-addr">PALANI – 624601.</div>
                      <div className="company-email">sivaflexpalani@gmail.com</div>
                      <div className="company-phone">+91 75981 54009, +91 72000 50800.</div>
                    </div>
                  </div>
                </div>

                {/* Block 2: Invoice To Customer */}
                <div className="header-box box-customer">
                  <div className="box-title">Invoice To</div>
                  <div className="cust-firm-name">{billData.customer?.name || "SIGARAM"}</div>
                  <div className="cust-detail-text">{billData.customer?.address || "palani"}</div>
                  <div className="cust-detail-text">{billData.customer?.phone || "+919025011789"}</div>
                  <div className="cust-email-text">{billData.customer?.email || "sigaramdesignspln@gmail.com"}</div>
                </div>

                {/* Block 3: Invoice Info */}
                <div className="header-box box-meta">
                  <div className="meta-line">
                    <span className="meta-k">Invoice Number :</span>
                    <span className="meta-v"><strong>{billData.invoiceNumber || "0"}</strong></span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-k">Invoice Date :</span>
                    <span className="meta-v">{billData.invoiceDate}</span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-k">Currency:</span>
                    <span className="meta-v">{billData.currency || "INR"}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="invoice-table-wrap">
                <table className="bill-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "4%" }}>S.No</th>
                      <th style={{ width: "12%" }}>File Type</th>
                      <th style={{ width: "24%" }}>File Name</th>
                      <th style={{ width: "16%" }}>Area (Sqft)</th>
                      <th style={{ width: "9%", textAlign: "right" }}>Flex Amt(Sqft)</th>
                      <th style={{ width: "5%", textAlign: "center" }}>Flex Qty</th>
                      <th style={{ width: "8%", textAlign: "right" }}>Flex Amt</th>
                      <th style={{ width: "4%", textAlign: "center" }}>GST</th>
                      <th style={{ width: "4%", textAlign: "center" }}>CGST</th>
                      <th style={{ width: "4%", textAlign: "center" }}>SGST</th>
                      <th style={{ width: "5%", textAlign: "right" }}>GST Amt</th>
                      <th style={{ width: "9%", textAlign: "right" }}>Total Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billData.items.map((it) => (
                      <tr key={it.id}>
                        <td style={{ textAlign: "center" }}>{it.sno}</td>
                        <td>{it.fileType}</td>
                        <td className="item-file-name">{it.fileName}</td>
                        <td>{it.areaFormula}</td>
                        <td style={{ textAlign: "right" }}>{it.rate}</td>
                        <td style={{ textAlign: "center" }}>{it.qty}</td>
                        <td style={{ textAlign: "right" }}>{it.flexAmt}</td>
                        <td style={{ textAlign: "center" }}>{it.gst}</td>
                        <td style={{ textAlign: "center" }}>{it.cgst}</td>
                        <td style={{ textAlign: "center" }}>{it.sgst}</td>
                        <td style={{ textAlign: "right" }}>{it.gstAmt}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{it.totalAmt}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}></td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                      <td></td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{billData.totalFlexAmt}</td>
                      <td colSpan={3}></td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{billData.totalGstAmt || "0"}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                        {billData.grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Box: Terms & Conditions + UPI QR */}
              <div className="invoice-footer-box">
                <div className="terms-col">
                  <strong>Terms & Conditions : </strong>
                  <span>Composition Taxable Person Not eligible to Collect TAX on Supplice</span>
                </div>

                <div className="qr-col">
                  <Image
                    src="/siva_upi_qr.png"
                    alt="Siva Flex UPI Payment QR"
                    width={110}
                    height={110}
                    style={{ objectFit: "contain" }}
                    priority
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bill-error-card">No bill details found for {selectedDate}.</div>
          )}
        </div>
      )}

      <style jsx>{`
        .customer-invoice-page {
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

        /* Filter Card */
        .filter-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          padding: 1.5rem 1.75rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
          margin-bottom: 1.25rem;
        }

        .card-title {
          margin: 0 0 1rem 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.02em;
        }

        .filter-row {
          display: flex;
          align-items: flex-end;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .date-input {
          height: 38px;
          padding: 0.35rem 0.65rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          background: #fff;
          outline: none;
        }

        .date-input:focus {
          border-color: #0284c7;
        }

        .filter-btn {
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

        .filter-btn:hover:not(:disabled) {
          background: #0369a1;
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

        .dates-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }

        .dates-table th {
          background-color: #eaf4fd;
          color: #1e3a8a;
          font-weight: 600;
          padding: 0.75rem 1rem;
          border-bottom: 2px solid #b6d4fe;
          white-space: nowrap;
        }

        .dates-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .dates-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .date-cell {
          font-size: 0.95rem;
          color: #0f172a;
        }

        .file-count-badge {
          background: #f1f5f9;
          color: #334155;
          padding: 0.25rem 0.65rem;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 600;
          border: 1px solid #cbd5e1;
        }

        .action-btn {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border: none;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.45rem 1.15rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
        }

        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);
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

        /* ================= SINGLE BILL VIEW STYLES ================= */
        .single-bill-view {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .bill-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          background: #ffffff;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 1px solid rgba(2, 132, 199, 0.16);
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        }

        .back-btn {
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          color: #334155;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .back-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .action-buttons-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .presets-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.85rem;
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

        .print-main-btn {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border: none;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 0.6rem 1.6rem;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .print-main-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.4);
        }

        /* Printable Invoice Sheet (exact replicate of download.pdf layout) */
        .invoice-sheet-container {
          background: #ffffff;
          border: 1px solid #71717a;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          max-width: 1050px;
          margin: 0 auto;
          width: 100%;
          color: #0f172a;
          font-family: Arial, Helvetica, sans-serif;
        }

        .invoice-header-grid {
          display: grid;
          grid-template-columns: 40% 35% 25%;
          border-bottom: 1px solid #71717a;
        }

        @media (max-width: 768px) {
          .invoice-header-grid {
            grid-template-columns: 1fr;
          }
        }

        .header-box {
          padding: 0.85rem 1rem;
        }

        .box-company {
          border-right: 1px solid #71717a;
        }

        .box-customer {
          border-right: 1px solid #71717a;
        }

        .logo-and-text {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }

        .company-text-details {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .company-brand-name {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 900;
          color: #0284c7;
          letter-spacing: 0.02em;
        }

        .company-gst {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0.15rem;
        }

        .company-addr,
        .company-email,
        .company-phone {
          font-size: 0.75rem;
          color: #334155;
          line-height: 1.25;
        }

        .box-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.35rem;
        }

        .cust-firm-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.2rem;
        }

        .cust-detail-text {
          font-size: 0.78rem;
          color: #334155;
          line-height: 1.3;
        }

        .cust-email-text {
          font-size: 0.78rem;
          color: #0284c7;
          font-weight: 500;
          line-height: 1.3;
        }

        .box-meta {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          justify-content: center;
        }

        .meta-line {
          font-size: 0.82rem;
          display: flex;
          gap: 0.4rem;
        }

        .meta-k {
          font-weight: 700;
          color: #0f172a;
        }

        .meta-v {
          color: #1e293b;
        }

        /* Items Table */
        .invoice-table-wrap {
          overflow-x: auto;
        }

        .bill-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          text-align: left;
        }

        .bill-items-table th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 700;
          padding: 0.5rem 0.5rem;
          border-bottom: 1px solid #71717a;
          border-right: 1px solid #cbd5e1;
        }

        .bill-items-table th:last-child {
          border-right: none;
        }

        .bill-items-table td {
          padding: 0.45rem 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #cbd5e1;
          vertical-align: middle;
        }

        .bill-items-table td:last-child {
          border-right: none;
        }

        .item-file-name {
          word-break: break-all;
        }

        .bill-items-table tfoot td {
          background: #f8fafc;
          border-top: 1px solid #71717a;
          border-bottom: 1px solid #71717a;
          padding: 0.55rem 0.5rem;
        }

        /* Bottom Box */
        .invoice-footer-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          gap: 1.5rem;
        }

        .terms-col {
          font-size: 0.82rem;
          color: #1e293b;
          line-height: 1.4;
        }

        .qr-col {
          flex-shrink: 0;
        }

        .bill-loading-card,
        .bill-error-card {
          background: #ffffff;
          padding: 3rem;
          text-align: center;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 1rem;
        }

        @media print {
          .company-header-card,
          .bill-action-bar,
          :global(.unified-nav-bar),
          :global(.cmyk-accent-bar) {
            display: none !important;
          }

          .invoice-sheet-container {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
