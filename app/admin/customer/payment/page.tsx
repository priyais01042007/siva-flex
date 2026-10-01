"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";

interface CustomerDetails {
  customer_id: number | string;
  customer_name: string;
  customer_address: string;
  customer_mobile_number: string;
  customer_mail_id: string;
  customer_gst_number: string;
  total_sales: string | number;
  total_credit: string | number;
  balance_amount: string | number;
}

interface InvoiceItem {
  customer_billing_id: number;
  date: string;
  flux_type: string;
  file_name: string;
  width: string | number;
  height: string | number;
  area: string | number;
  invoice_number: string;
  amount: string | number;
  notes: string;
}

interface CreditItem {
  customer_billing_id: number;
  received_date: string;
  entry_date: string;
  date?: string;
  reference_number: string;
  amount: string | number;
  notes: string;
}

type ActiveTab = "invoices" | "credits";

function getNowLocalDateTime() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function formatDisplayDateTime(dtStr: string | undefined): string {
  if (!dtStr || dtStr.startsWith("0000")) return "";
  let clean = dtStr.replace(/\.\d+$/, "").replace("T", " ").trim();
  if (clean.length === 10) {
    clean += " 00:00:00";
  } else if (clean.length === 16) {
    clean += ":00";
  }
  return clean;
}

function getPaginationPages(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = current - 2;
  let end = current + 2;
  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > total) {
    start -= end - total;
    end = total;
  }
  start = Math.max(1, start);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  return pages;
}

function CustomerPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = searchParams.get("cid");

  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab & Form State
  const [activeTab, setActiveTab] = useState<ActiveTab>("credits");
  const [paytype, setPaytype] = useState<number>(2); // Default to Credit Entry

  // Form Fields
  const [inumber, setInumber] = useState<string>("");
  const [sdate, setSdate] = useState<string>(getNowLocalDateTime);
  const [samount, setSamount] = useState<string>("");
  const [rnumber, setRnumber] = useState<string>("");
  const [cdate, setCdate] = useState<string>(getNowLocalDateTime);
  const [camount, setCamount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<string>("received_date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const loadData = async () => {
    if (!cid) {
      setErrorMsg("Missing Customer ID (cid). Please select a customer from the customer directory.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/admin/customer/payment?cid=${encodeURIComponent(cid)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load customer payment statement");
      }

      setCustomer(data.customer || null);
      setInvoices(data.invoices || []);
      setCredits(data.credits || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cid]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cid) return;

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        cid,
        paytype,
        note: note.trim(),
      };

      if (paytype === 1) {
        const amt = parseFloat(samount);
        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid Sales Amount greater than 0");
          setIsSubmitting(false);
          return;
        }
        payload.inumber = inumber.trim();
        payload.sdate = sdate;
        payload.samount = amt;
      } else {
        const amt = parseFloat(camount);
        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid Credit Amount greater than 0");
          setIsSubmitting(false);
          return;
        }
        payload.rnumber = rnumber.trim();
        payload.cdate = cdate;
        payload.camount = amt;
      }

      const res = await fetch("/api/admin/customer/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save transaction");
      }

      // Reset form fields
      setInumber("");
      setSamount("");
      setRnumber("");
      setCamount("");
      setNote("");
      setCdate(getNowLocalDateTime());
      setSdate(getNowLocalDateTime());

      // Switch to relevant tab and reload
      if (paytype === 1) {
        setActiveTab("invoices");
        setSortField("date");
      } else {
        setActiveTab("credits");
        setSortField("received_date");
      }

      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number, typeLabel: string) => {
    if (!confirm(`Are you sure you want to delete this ${typeLabel} entry (#${id})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/customer/payment?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete entry");
      }
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting entry");
    }
  };

  // Filtered & Sorted Invoices
  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (inv) =>
          (inv.date || "").toLowerCase().includes(q) ||
          (inv.file_name || "").toLowerCase().includes(q) ||
          (inv.flux_type || "").toLowerCase().includes(q) ||
          (inv.invoice_number || "").toLowerCase().includes(q) ||
          (inv.notes || "").toLowerCase().includes(q) ||
          String(inv.amount).includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let valA: string | number = a.date || "";
      let valB: string | number = b.date || "";
      if (sortField === "amount") {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (sortField === "invoice_number") {
        valA = a.invoice_number || "";
        valB = b.invoice_number || "";
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [invoices, searchQuery, sortField, sortAsc]);

  // Filtered & Sorted Credits (Dual Timestamps)
  const filteredCredits = useMemo(() => {
    let list = credits;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.received_date || "").toLowerCase().includes(q) ||
          (c.entry_date || "").toLowerCase().includes(q) ||
          (c.reference_number || "").toLowerCase().includes(q) ||
          (c.notes || "").toLowerCase().includes(q) ||
          String(c.amount).includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let valA: string | number = a.received_date || "";
      let valB: string | number = b.received_date || "";
      if (sortField === "entry_date") {
        valA = a.entry_date || a.received_date || "";
        valB = b.entry_date || b.received_date || "";
      } else if (sortField === "amount") {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (sortField === "reference_number") {
        valA = a.reference_number || "";
        valB = b.reference_number || "";
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [credits, searchQuery, sortField, sortAsc]);

  // Pagination for Active Tab
  const activeList = activeTab === "invoices" ? filteredInvoices : filteredCredits;
  const totalPages = Math.ceil(activeList.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedList = activeList.slice(startIndex, startIndex + entriesPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default to newest / highest first
    }
    setCurrentPage(1);
  };

  // Export handlers (Blob-based with UTF-8 BOM, rock solid on all browsers)
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "invoices") {
      headers = ["Invoice Date", "Flex Type", "File Name", "Width", "Height", "Area", "Invoice Number", "Amount", "Notes"];
      rows = filteredInvoices.map((i) => [
        `"${i.date}"`,
        `"${i.flux_type}"`,
        `"${i.file_name.replace(/"/g, '""')}"`,
        `"${i.width}"`,
        `"${i.height}"`,
        `"${i.area}"`,
        `"${i.invoice_number}"`,
        `"${i.amount}"`,
        `"${(i.notes || "").replace(/"/g, '""')}"`,
      ]);
    } else {
      headers = [
        "Credit Date & Time",
        "System Entry Time",
        "Credit Number",
        "Credit Amount",
        "Credit Notes",
      ];
      rows = filteredCredits.map((c) => [
        `"${formatDisplayDateTime(c.received_date)}"`,
        `"${formatDisplayDateTime(c.entry_date) || formatDisplayDateTime(c.received_date)}"`,
        `"${c.reference_number || ""}"`,
        `"${c.amount}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
      ]);
    }

    const csvRows = [headers.join(","), ...rows.map((r) => r.join(","))];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(customer?.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === "invoices") {
      headers = ["Invoice Date", "Flex Type", "File Name", "Width", "Height", "Area", "Invoice Number", "Amount", "Notes"];
      rows = filteredInvoices.map((i) => [
        i.date,
        i.flux_type,
        i.file_name,
        i.width,
        i.height,
        i.area,
        i.invoice_number,
        i.amount,
        i.notes || "",
      ]);
    } else {
      headers = [
        "Credit Date & Time",
        "System Entry Time",
        "Credit Number",
        "Credit Amount",
        "Credit Notes",
      ];
      rows = filteredCredits.map((c) => [
        formatDisplayDateTime(c.received_date),
        formatDisplayDateTime(c.entry_date) || formatDisplayDateTime(c.received_date),
        c.reference_number || "",
        c.amount,
        c.notes || "",
      ]);
    }

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <h2>${customer?.customer_name || "Customer"} - ${activeTab === "invoices" ? "Invoices Statement" : "Credit Statement"}</h2>
        <table border="1">
          <thead>
            <tr style="background:#e0f2fe;">
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(customer?.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, "_")}_${activeTab}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopy = () => {
    let text = "";
    if (activeTab === "invoices") {
      text = [
        "Date\tFile\tInvoice#\tAmount\tNotes",
        ...filteredInvoices.map((i) => `${i.date}\t${i.file_name}\t${i.invoice_number}\t${i.amount}\t${i.notes}`),
      ].join("\n");
    } else {
      text = [
        "Credit Date & Time\tSystem Entry Time\tCredit Number\tAmount\tNotes",
        ...filteredCredits.map(
          (c) =>
            `${formatDisplayDateTime(c.received_date)}\t${
              formatDisplayDateTime(c.entry_date) || formatDisplayDateTime(c.received_date)
            }\t${c.reference_number || "—"}\t${c.amount}\t${c.notes || "—"}`
        ),
      ].join("\n");
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Copied table rows to clipboard!");
      }).catch(() => {
        execFallbackCopy(text);
      });
    } else {
      execFallbackCopy(text);
    }
  };

  const execFallbackCopy = (text: string) => {
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
      alert("Copied table rows to clipboard!");
    } catch {
      alert("Please select and copy manually.");
    }
  };

  const formatAmount = (val: string | number | undefined) => {
    const num = parseFloat(String(val || 0));
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  return (
    <div className="admin-app-wrapper">
      <AdminNav />

      <main className="dashboard-content-area">
        {/* Navigation Breadcrumb / Header */}
        <div className="page-header-row">
          <button
            type="button"
            className="back-btn"
            onClick={() => router.push("/admin/customer")}
          >
            ← Back to Customer Directory
          </button>
          <div className="header-titles">
            <h1 className="main-title">Customer Ledger &amp; Accountancy Statement</h1>
            <p className="main-subtitle">
              Record sales invoice billings, customer credit payments, and inspect live account ledger.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-card glass-panel">
            <div className="spinner"></div>
            <p>Loading customer statement details...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          </div>
        ) : customer ? (
          <div className="payment-page-layout">
            {/* Top Customer Summary Card */}
            <div className="customer-summary-panel glass-panel">
              {/* Left Column: Customer Contacts */}
              <div className="cust-contacts-section">
                <div className="cust-title-badge">
                  <span className="cust-ico">👤</span>
                  <h2 className="cust-name-heading">{customer.customer_name}</h2>
                </div>
                <div className="cust-info-rows">
                  {customer.customer_address && (
                    <div className="info-row">
                      <span className="info-ico">📍</span>
                      <span>{customer.customer_address}</span>
                    </div>
                  )}
                  {customer.customer_mobile_number && (
                    <div className="info-row">
                      <span className="info-ico">📞</span>
                      <span>{customer.customer_mobile_number}</span>
                    </div>
                  )}
                  {customer.customer_mail_id && (
                    <div className="info-row">
                      <span className="info-ico">✉</span>
                      <span>{customer.customer_mail_id}</span>
                    </div>
                  )}
                  {customer.customer_gst_number && (
                    <div className="info-row">
                      <span className="info-ico">🪪</span>
                      <span>GST: {customer.customer_gst_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 3-Tier Accountancy Badges (Strictly Matching Customer View) */}
              <div className="accountancy-summary-section">
                {/* 1. Total Sales Amount */}
                <div className="acc-card sales-acc-card">
                  <div className="acc-pill-badge badge-sales">Total Sales Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(customer.total_sales)}</div>
                  <div className="acc-count-hint">{invoices.length} invoices recorded</div>
                </div>

                {/* 2. Total Credit Amount */}
                <div className="acc-card credit-acc-card">
                  <div className="acc-pill-badge badge-credit">Total Credit Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(customer.total_credit)}</div>
                  <div className="acc-count-hint">{credits.length} payments received</div>
                </div>

                {/* 3. Pending / Balance Amount */}
                <div className="acc-card balance-acc-card">
                  <div className="acc-pill-badge badge-balance">Balance Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(customer.balance_amount)}</div>
                  <div className="acc-count-hint">Net outstanding balance</div>
                </div>
              </div>
            </div>

            {/* Main Content Grid: Entry Form (Left) & Transaction Ledger (Right) */}
            <div className="two-column-grid">
              {/* Left Column: Transaction Entry Form */}
              <div className="entry-form-card glass-panel">
                <div className="form-card-header">
                  <h3 className="form-title">Customer Transaction Entry</h3>
                  <p className="form-subtitle">Record an invoice billing or credit payment for this customer.</p>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
                  {/* Entry Type Selector */}
                  <div className="form-group">
                    <label className="form-label">
                      Entry Type <span className="req-star">*</span>
                    </label>
                    <div className="entry-type-segmented">
                      <button
                        type="button"
                        className={`seg-btn ${paytype === 2 ? "active-credit" : ""}`}
                        onClick={() => {
                          setPaytype(2);
                          setActiveTab("credits");
                          setSortField("received_date");
                        }}
                      >
                        💳 Customer Credit Entry
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${paytype === 1 ? "active-sales" : ""}`}
                        onClick={() => {
                          setPaytype(1);
                          setActiveTab("invoices");
                          setSortField("date");
                        }}
                      >
                        📄 Customer Invoice Entry
                      </button>
                    </div>
                  </div>

                  {/* Customer Credit Entry Fields (paytype = 2) */}
                  {paytype === 2 && (
                    <div className="type-fields-group">
                      <div className="form-group">
                        <label className="form-label">Referecnce Number</label>
                        <input
                          type="text"
                          value={rnumber}
                          onChange={(e) => setRnumber(e.target.value)}
                          placeholder="Enter Referecnce Number"
                          className="form-input"
                        />
                      </div>

                      {/* Payment Received Date & Time */}
                      <div className="form-group">
                        <label className="form-label">
                          Credit Date <span className="req-star">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={cdate}
                          onChange={(e) => setCdate(e.target.value)}
                          required
                          className="form-input font-mono"
                        />
                      </div>

                      {/* Credit Amount */}
                      <div className="form-group">
                        <label className="form-label">
                          Credit Amount <span className="req-star">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={camount}
                          onChange={(e) => setCamount(e.target.value)}
                          placeholder="Enter Your Credit Amount"
                          required
                          className="form-input amount-input credit-accent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Customer Invoice Entry Fields (paytype = 1) */}
                  {paytype === 1 && (
                    <div className="type-fields-group">
                      <div className="form-group">
                        <label className="form-label">Invoice Number</label>
                        <input
                          type="text"
                          value={inumber}
                          onChange={(e) => setInumber(e.target.value)}
                          placeholder="e.g. INV-1002 or 0"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Sales Date &amp; Time <span className="req-star">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={sdate}
                          onChange={(e) => setSdate(e.target.value)}
                          required
                          className="form-input font-mono"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Sales Amount (₹) <span className="req-star">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={samount}
                          onChange={(e) => setSamount(e.target.value)}
                          placeholder="Enter sales amount in ₹"
                          required
                          className="form-input amount-input sales-accent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes Field */}
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Enter Your Notes"
                      className="form-textarea"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`submit-entry-btn ${paytype === 1 ? "btn-sales" : "btn-credit"}`}
                  >
                    {isSubmitting ? (
                      <span>Saving Transaction...</span>
                    ) : paytype === 1 ? (
                      <span>+ Record Invoice Entry</span>
                    ) : (
                      <span>+ Record Customer Credit</span>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Statement Ledger Table */}
              <div className="ledger-card glass-panel">
                {/* Ledger Header: Tabs & Tools */}
                <div className="ledger-header-row">
                  <div className="ledger-tabs">
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === "credits" ? "tab-active-credits" : ""}`}
                      onClick={() => {
                        setActiveTab("credits");
                        setSortField("received_date");
                        setCurrentPage(1);
                      }}
                    >
                      <span>💳 Credit Statement ({credits.length})</span>
                      <span className="tab-sum-badge credit-sum">
                        ₹{formatAmount(customer.total_credit)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === "invoices" ? "tab-active-invoices" : ""}`}
                      onClick={() => {
                        setActiveTab("invoices");
                        setSortField("date");
                        setCurrentPage(1);
                      }}
                    >
                      <span>📄 Invoices ({invoices.length})</span>
                      <span className="tab-sum-badge sales-sum">
                        ₹{formatAmount(customer.total_sales)}
                      </span>
                    </button>
                  </div>

                  {/* Export buttons */}
                  <div className="export-btn-group">
                    <button
                      type="button"
                      className="export-chip"
                      onClick={handleCopy}
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="export-chip"
                      onClick={handleExportCSV}
                      title="Download as CSV"
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      className="export-chip"
                      onClick={handleExportExcel}
                      title="Export as Excel"
                    >
                      Excel
                    </button>
                    <button
                      type="button"
                      className="export-chip"
                      onClick={() => window.print()}
                      title="Print Statement"
                    >
                      Print
                    </button>
                  </div>
                </div>

                {/* Search & Entries Controls */}
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
                      placeholder={`Search ${activeTab === "credits" ? "credit date, number, amount, notes" : "invoices"}...`}
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

                {/* Ledger Data Table */}
                <div className="table-responsive-container">
                  {activeTab === "credits" ? (
                    /* Credit Statement Table (With Dual Timestamps, clean display) */
                    <table className="statement-table">
                      <thead>
                        <tr>
                          {/* Column 1: Credit Date & Time */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("received_date")}
                            style={{ width: "22%" }}
                          >
                            <div className="th-content">
                              <span>Credit Date</span>
                              <span className="sort-indicator">
                                {sortField === "received_date" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 2: System Entry Time */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("entry_date")}
                            style={{ width: "22%" }}
                          >
                            <div className="th-content">
                              <span>System Entry Time</span>
                              <span className="sort-indicator">
                                {sortField === "entry_date" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 3: Credit Number */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("reference_number")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content">
                              <span>Credit Number</span>
                              <span className="sort-indicator">
                                {sortField === "reference_number" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 4: Credit Amount */}
                          <th
                            className="sortable-th text-right"
                            onClick={() => handleSort("amount")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content th-right">
                              <span>Credit Amount</span>
                              <span className="sort-indicator">
                                {sortField === "amount" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 5: Credit Notes */}
                          <th style={{ width: "18%" }}>Credit Notes</th>

                          {/* Column 6: Action */}
                          <th style={{ width: "6%", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedList.length > 0 ? (
                          (paginatedList as CreditItem[]).map((cr) => {
                            const creditDateDisplay = formatDisplayDateTime(cr.received_date) || "—";
                            // If system entry time is not found, replace with the credit date and time:
                            const systemEntryDisplay =
                              formatDisplayDateTime(cr.entry_date) || creditDateDisplay;

                            return (
                              <tr key={cr.customer_billing_id}>
                                {/* 1. Credit Date & Time */}
                                <td className="font-mono text-dark">
                                  {creditDateDisplay}
                                </td>

                                {/* 2. System Entry Date & Time */}
                                <td className="font-mono text-dark">
                                  {systemEntryDisplay}
                                </td>

                                {/* 3. Credit Number */}
                                <td className="font-mono">
                                  {cr.reference_number ? (
                                    <span className="ref-chip">{cr.reference_number}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                {/* 4. Credit Amount */}
                                <td className="text-right font-mono font-bold credit-text">
                                  ₹{formatAmount(cr.amount)}
                                </td>

                                {/* 5. Notes */}
                                <td className="text-muted notes-cell">{cr.notes || "—"}</td>

                                {/* 6. Action */}
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="del-entry-btn"
                                    onClick={() => handleDelete(cr.customer_billing_id, "credit")}
                                    title="Delete Credit Entry"
                                  >
                                    <img src="/icons/btn_delete.png" alt="Delete" style={{ width: 24, height: 24, objectFit: "contain" }} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="empty-table-cell">
                              No credit payment records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Invoice Entries Table */
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("date")}
                            style={{ width: "18%" }}
                          >
                            <div className="th-content">
                              <span>Invoice Date</span>
                              <span className="sort-indicator">
                                {sortField === "date" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>
                          <th style={{ width: "32%" }}>Invoice File / Particulars</th>
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("invoice_number")}
                            style={{ width: "14%" }}
                          >
                            <div className="th-content">
                              <span>Invoice Number</span>
                              <span className="sort-indicator">
                                {sortField === "invoice_number" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>
                          <th
                            className="sortable-th text-right"
                            onClick={() => handleSort("amount")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content th-right">
                              <span>Invoice Amount</span>
                              <span className="sort-indicator">
                                {sortField === "amount" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>
                          <th style={{ width: "14%" }}>Invoice Notes</th>
                          <th style={{ width: "6%", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedList.length > 0 ? (
                          (paginatedList as InvoiceItem[]).map((inv) => (
                            <tr key={inv.customer_billing_id}>
                              <td className="font-mono text-muted">{inv.date || "—"}</td>
                              <td>
                                <div className="file-desc-block">
                                  {inv.file_name ? (
                                    <span className="file-name-highlight">{inv.file_name}</span>
                                  ) : (
                                    <span className="manual-invoice-tag">Manual Invoice Entry</span>
                                  )}
                                  <div className="file-sub-details">
                                    <span className="media-pill-sm">{inv.flux_type}</span>
                                    {Number(inv.area) > 0 && (
                                      <span className="dims-label">
                                        {inv.width} × {inv.height} = {inv.area} sqft
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="font-mono">{inv.invoice_number || "—"}</td>
                              <td className="text-right font-mono font-bold sales-text">
                                ₹{formatAmount(inv.amount)}
                              </td>
                              <td className="text-muted notes-cell">{inv.notes || "—"}</td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="del-entry-btn"
                                  onClick={() => handleDelete(inv.customer_billing_id, "invoice")}
                                  title="Delete Invoice Entry"
                                >
                                  <img src="/icons/btn_delete.png" alt="Delete" style={{ width: 24, height: 24, objectFit: "contain" }} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="empty-table-cell">
                              No invoice records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Table Footer: Pagination */}
                <div className="table-footer-row">
                  <div className="footer-info">
                    Showing {activeList.length === 0 ? 0 : startIndex + 1} to{" "}
                    {Math.min(startIndex + entriesPerPage, activeList.length)} of {activeList.length} entries
                    {activeList.length !== (activeTab === "invoices" ? invoices.length : credits.length) && (
                      <span> (filtered)</span>
                    )}
                  </div>
                  <div className="pagination-wrapper">
                    <button
                      type="button"
                      className={`page-link prev-link ${currentPage <= 1 ? "disabled" : ""}`}
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    {getPaginationPages(currentPage, totalPages).map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        className={`page-link ${currentPage === pg ? "active-link" : ""}`}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`page-link next-link ${currentPage >= totalPages ? "disabled" : ""}`}
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <style jsx>{`
        .admin-app-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(135deg, #e0f7fa 0%, #ffffff 50%, #e0f2fe 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #0f172a;
        }

        .dashboard-content-area {
          flex: 1;
          max-width: 1440px;
          width: 100%;
          margin: 0 auto;
          padding: 1.25rem 1rem 3rem 1rem;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }

        /* Page Header */
        .page-header-row {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .back-btn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(2, 132, 199, 0.08);
          color: #0284c7;
          border: 1px solid rgba(2, 132, 199, 0.2);
          border-radius: 6px;
          padding: 0.35rem 0.75rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .back-btn:hover {
          background: #0284c7;
          color: #ffffff;
        }

        .main-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .main-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        /* Top Customer Summary Panel */
        .customer-summary-panel {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          padding: 1.25rem 1.5rem;
          margin-bottom: 1.5rem;
          border-left: 5px solid #0284c7;
        }

        .cust-contacts-section {
          flex: 1;
          min-width: 280px;
        }

        .cust-title-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }

        .cust-ico {
          font-size: 1.2rem;
        }

        .cust-name-heading {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .cust-info-rows {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem 1.25rem;
          font-size: 0.84rem;
          color: #475569;
        }

        .info-row {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .info-ico {
          opacity: 0.8;
          font-size: 0.82rem;
        }

        /* 3-Tier Accountancy Cards */
        .accountancy-summary-section {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .acc-card {
          min-width: 170px;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          text-align: center;
        }

        .sales-acc-card {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .credit-acc-card {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .balance-acc-card {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .acc-pill-badge {
          display: inline-block;
          padding: 0.2rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 0.35rem;
        }

        .badge-sales {
          background: #f59e0b;
          color: #ffffff;
        }

        .badge-credit {
          background: #16a34a;
          color: #ffffff;
        }

        .badge-balance {
          background: #dc2626;
          color: #ffffff;
        }

        .acc-amount-val {
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }

        .acc-count-hint {
          font-size: 0.68rem;
          color: #64748b;
          margin-top: 0.15rem;
        }

        /* Two-Column Layout */
        .two-column-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .two-column-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Left Column: Form Card */
        .entry-form-card {
          padding: 1.25rem;
        }

        .form-card-header {
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .form-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .form-subtitle {
          font-size: 0.76rem;
          color: #64748b;
          margin: 0.2rem 0 0 0;
        }

        .transaction-form {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .form-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
        }

        .req-star {
          color: #ef4444;
        }

        .entry-type-segmented {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .seg-btn {
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .seg-btn.active-sales {
          background: #fffbeb;
          border-color: #f59e0b;
          color: #b45309;
        }

        .seg-btn.active-credit {
          background: #f0fdf4;
          border-color: #16a34a;
          color: #15803d;
        }

        .type-fields-group {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.45rem 0.65rem;
          font-size: 0.84rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
        }

        .amount-input {
          font-size: 1rem;
          font-family: monospace;
          font-weight: 700;
        }

        .sales-accent:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }

        .credit-accent:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }

        .submit-entry-btn {
          margin-top: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          border: none;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-sales {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
        }

        .btn-sales:hover:not(:disabled) {
          background: linear-gradient(135deg, #d97706, #b45309);
        }

        .btn-credit {
          background: linear-gradient(135deg, #16a34a, #15803d);
          box-shadow: 0 4px 12px rgba(21, 128, 61, 0.25);
        }

        .btn-credit:hover:not(:disabled) {
          background: linear-gradient(135deg, #15803d, #166534);
        }

        .submit-entry-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* Right Column: Statement Ledger Card */
        .ledger-card {
          padding: 1.25rem 1.4rem;
        }

        .ledger-header-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .ledger-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.9rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tab-active-invoices {
          background: #fffbeb;
          border-color: #f59e0b;
          color: #b45309;
        }

        .tab-active-credits {
          background: #f0fdf4;
          border-color: #16a34a;
          color: #15803d;
        }

        .tab-sum-badge {
          display: inline-block;
          font-size: 0.72rem;
          font-family: monospace;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }

        .sales-sum {
          background: rgba(245, 158, 11, 0.15);
          color: #b45309;
        }

        .credit-sum {
          background: rgba(22, 163, 74, 0.15);
          color: #15803d;
        }

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

        .export-chip:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        /* Filter & Search Bar */
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
        }

        .search-box-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 260px;
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
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.85rem;
        }

        /* Statement Table */
        .table-responsive-container {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        }

        .statement-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .statement-table th {
          background: #f8fafc;
          padding: 0.6rem 0.75rem;
          border-bottom: 2px solid #e2e8f0;
          color: #334155;
          font-weight: 700;
          text-align: left;
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
          gap: 0.3rem;
        }

        .th-right {
          justify-content: flex-end;
        }

        .sort-indicator {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .statement-table td {
          padding: 0.6rem 0.75rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .statement-table tbody tr:hover {
          background: #f8fafc;
        }

        .text-dark {
          color: #1e293b;
        }

        .file-desc-block {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .file-name-highlight {
          color: #16a34a;
          font-weight: 700;
        }

        .manual-invoice-tag {
          color: #b45309;
          font-weight: 700;
        }

        .file-sub-details {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.74rem;
          color: #64748b;
        }

        .media-pill-sm {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.7rem;
        }

        .dims-label {
          font-family: monospace;
        }

        .sales-text {
          color: #b45309;
        }

        .credit-text {
          color: #15803d;
        }

        .ref-chip {
          display: inline-block;
          background: #f1f5f9;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.78rem;
          color: #334155;
        }

        .notes-cell {
          font-size: 0.78rem;
          max-width: 200px;
          word-break: break-word;
        }

        .del-entry-btn {
          background: rgba(220, 38, 38, 0.08);
          border: 1px solid rgba(220, 38, 38, 0.2);
          color: #dc2626;
          border-radius: 4px;
          padding: 0.25rem 0.45rem;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .del-entry-btn:hover {
          background: #dc2626;
          color: #ffffff;
        }

        .empty-table-cell {
          text-align: center;
          padding: 2.5rem 1rem;
          color: #94a3b8;
          font-style: italic;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .font-mono {
          font-family: monospace;
        }

        .font-bold {
          font-weight: 800;
        }

        .text-muted {
          color: #64748b;
        }

        /* Table Footer */
        .table-footer-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.85rem;
          font-size: 0.8rem;
          color: #64748b;
        }

        .pagination-wrapper {
          display: flex;
          gap: 0.25rem;
        }

        .page-link {
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }

        .page-link:hover:not(.disabled) {
          background: #f1f5f9;
        }

        .page-link.active-link {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        .page-link.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading & Error States */
        .loading-card,
        .error-card {
          text-align: center;
          padding: 3rem 1.5rem;
          margin-top: 2rem;
        }

        .spinner {
          width: 38px;
          height: 38px;
          border: 3px solid rgba(2, 132, 199, 0.2);
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .err-txt {
          color: #dc2626;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .retry-btn {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default function CustomerPaymentPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "3rem", textAlign: "center" }}>
          Loading customer payment view...
        </div>
      }
    >
      <CustomerPaymentContent />
    </Suspense>
  );
}
