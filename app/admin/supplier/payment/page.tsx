"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";

interface SupplierDetails {
  supplier_id: number | string;
  supplier_name: string;
  supplier_address: string;
  supplier_mobile_number: string;
  supplier_mail_id: string;
  supplier_gst_number: string;
  total_purchase: string | number;
  total_debit: string | number;
  balance_amount: string | number;
}

interface PurchaseItem {
  supplier_billing_id: number;
  invoice_date: string;
  entry_date: string;
  invoice_number: string;
  amount: string | number;
  notes: string;
}

interface DebitItem {
  supplier_billing_id: number;
  debit_date: string;
  entry_date: string;
  reference_number: string;
  amount: string | number;
  notes: string;
}

type ActiveTab = "purchases" | "debits";

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

function SupplierPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sid = searchParams.get("sid");

  const [supplier, setSupplier] = useState<SupplierDetails | null>(null);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [debits, setDebits] = useState<DebitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab & Form State
  const [activeTab, setActiveTab] = useState<ActiveTab>("purchases");
  const [paytype, setPaytype] = useState<number>(1); // 1 = Purchase, 2 = Debit

  // Form Fields
  const [inumber, setInumber] = useState<string>("");
  const [pdate, setPdate] = useState<string>(getNowLocalDateTime);
  const [pamount, setPamount] = useState<string>("");
  const [rnumber, setRnumber] = useState<string>("");
  const [ddate, setDdate] = useState<string>(getNowLocalDateTime);
  const [damount, setDamount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<string>("invoice_date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const loadData = async () => {
    if (!sid) {
      setErrorMsg("Missing Supplier ID (sid). Please select a supplier from the supplier directory.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/admin/supplier/payment?sid=${encodeURIComponent(sid)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load supplier payment statement");
      }

      setSupplier(data.supplier || null);
      setPurchases(data.purchases || []);
      setDebits(data.debits || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error loading statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sid]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sid) return;

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = {
        sid,
        paytype,
        note: note.trim(),
      };

      if (paytype === 1) {
        const amt = parseFloat(pamount);
        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid Purchase Amount greater than 0");
          setIsSubmitting(false);
          return;
        }
        payload.inumber = inumber.trim();
        payload.pdate = pdate;
        payload.pamount = amt;
      } else {
        const amt = parseFloat(damount);
        if (isNaN(amt) || amt <= 0) {
          alert("Please enter a valid Debit Amount greater than 0");
          setIsSubmitting(false);
          return;
        }
        payload.rnumber = rnumber.trim();
        payload.ddate = ddate;
        payload.damount = amt;
      }

      const res = await fetch("/api/admin/supplier/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save supplier transaction");
      }

      // Reset form fields
      setInumber("");
      setPamount("");
      setRnumber("");
      setDamount("");
      setNote("");
      setPdate(getNowLocalDateTime());
      setDdate(getNowLocalDateTime());

      // Switch to relevant tab and reload
      if (paytype === 1) {
        setActiveTab("purchases");
        setSortField("invoice_date");
      } else {
        setActiveTab("debits");
        setSortField("debit_date");
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
      const res = await fetch(`/api/admin/supplier/payment?id=${id}`, {
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

  // Filtered & Sorted Purchases
  const filteredPurchases = useMemo(() => {
    let list = purchases;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.invoice_date || "").toLowerCase().includes(q) ||
          (p.entry_date || "").toLowerCase().includes(q) ||
          (p.invoice_number || "").toLowerCase().includes(q) ||
          (p.notes || "").toLowerCase().includes(q) ||
          String(p.amount).includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let valA: string | number = a.invoice_date || "";
      let valB: string | number = b.invoice_date || "";
      if (sortField === "entry_date") {
        valA = a.entry_date || a.invoice_date || "";
        valB = b.entry_date || b.invoice_date || "";
      } else if (sortField === "amount") {
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
  }, [purchases, searchQuery, sortField, sortAsc]);

  // Filtered & Sorted Debits
  const filteredDebits = useMemo(() => {
    let list = debits;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          (d.debit_date || "").toLowerCase().includes(q) ||
          (d.entry_date || "").toLowerCase().includes(q) ||
          (d.reference_number || "").toLowerCase().includes(q) ||
          (d.notes || "").toLowerCase().includes(q) ||
          String(d.amount).includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let valA: string | number = a.debit_date || "";
      let valB: string | number = b.debit_date || "";
      if (sortField === "entry_date") {
        valA = a.entry_date || a.debit_date || "";
        valB = b.entry_date || b.debit_date || "";
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
  }, [debits, searchQuery, sortField, sortAsc]);

  // Pagination for Active Tab
  const activeList = activeTab === "purchases" ? filteredPurchases : filteredDebits;
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

    if (activeTab === "purchases") {
      headers = [
        "Purchase Date & Time",
        "System Entry Time",
        "Invoice Number",
        "Purchase Amount",
        "Invoice Notes",
      ];
      rows = filteredPurchases.map((p) => [
        `"${formatDisplayDateTime(p.invoice_date)}"`,
        `"${formatDisplayDateTime(p.entry_date) || formatDisplayDateTime(p.invoice_date)}"`,
        `"${p.invoice_number || ""}"`,
        `"${p.amount}"`,
        `"${(p.notes || "").replace(/"/g, '""')}"`,
      ]);
    } else {
      headers = [
        "Payment Date & Time",
        "System Entry Time",
        "Reference Number",
        "Payment Amount",
        "Payment Notes",
      ];
      rows = filteredDebits.map((d) => [
        `"${formatDisplayDateTime(d.debit_date)}"`,
        `"${formatDisplayDateTime(d.entry_date) || formatDisplayDateTime(d.debit_date)}"`,
        `"${d.reference_number || ""}"`,
        `"${d.amount}"`,
        `"${(d.notes || "").replace(/"/g, '""')}"`,
      ]);
    }

    const csvRows = [headers.join(","), ...rows.map((r) => r.join(","))];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(supplier?.supplier_name || "Supplier").replace(/[^a-zA-Z0-9]/g, "_")}_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportExcel = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeTab === "purchases") {
      headers = [
        "Purchase Date & Time",
        "System Entry Time",
        "Invoice Number",
        "Purchase Amount",
        "Invoice Notes",
      ];
      rows = filteredPurchases.map((p) => [
        formatDisplayDateTime(p.invoice_date),
        formatDisplayDateTime(p.entry_date) || formatDisplayDateTime(p.invoice_date),
        p.invoice_number || "",
        p.amount,
        p.notes || "",
      ]);
    } else {
      headers = [
        "Payment Date & Time",
        "System Entry Time",
        "Reference Number",
        "Payment Amount",
        "Payment Notes",
      ];
      rows = filteredDebits.map((d) => [
        formatDisplayDateTime(d.debit_date),
        formatDisplayDateTime(d.entry_date) || formatDisplayDateTime(d.debit_date),
        d.reference_number || "",
        d.amount,
        d.notes || "",
      ]);
    }

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <h2>${supplier?.supplier_name || "Supplier"} - ${activeTab === "purchases" ? "Purchases Statement" : "Debit Payments Statement"}</h2>
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
    link.download = `${(supplier?.supplier_name || "Supplier").replace(/[^a-zA-Z0-9]/g, "_")}_${activeTab}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopy = () => {
    let text = "";
    if (activeTab === "purchases") {
      text = [
        "Purchase Date & Time\tSystem Entry Time\tInvoice#\tAmount\tNotes",
        ...filteredPurchases.map(
          (p) =>
            `${formatDisplayDateTime(p.invoice_date)}\t${
              formatDisplayDateTime(p.entry_date) || formatDisplayDateTime(p.invoice_date)
            }\t${p.invoice_number || "—"}\t${p.amount}\t${p.notes || "—"}`
        ),
      ].join("\n");
    } else {
      text = [
        "Payment Date & Time\tSystem Entry Time\tRef#\tAmount\tNotes",
        ...filteredDebits.map(
          (d) =>
            `${formatDisplayDateTime(d.debit_date)}\t${
              formatDisplayDateTime(d.entry_date) || formatDisplayDateTime(d.debit_date)
            }\t${d.reference_number || "—"}\t${d.amount}\t${d.notes || "—"}`
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
            onClick={() => router.push("/admin/supplier")}
          >
            ← Back to Supplier Directory
          </button>
          <div className="header-titles">
            <h1 className="main-title">Supplier Ledger &amp; Accountancy Statement</h1>
            <p className="main-subtitle">
              Record raw material purchase billings, debit settlements, and inspect live account ledger.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading-card glass-panel">
            <div className="spinner"></div>
            <p>Loading supplier statement details...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          </div>
        ) : supplier ? (
          <div className="payment-page-layout">
            {/* Top Supplier Summary Card */}
            <div className="customer-summary-panel glass-panel">
              {/* Left Column: Supplier Contacts */}
              <div className="cust-contacts-section">
                <div className="cust-title-badge">
                  <span className="cust-ico">🏭</span>
                  <h2 className="cust-name-heading">{supplier.supplier_name}</h2>
                </div>
                <div className="cust-info-rows">
                  {supplier.supplier_address && (
                    <div className="info-row">
                      <span className="info-ico">📍</span>
                      <span>{supplier.supplier_address}</span>
                    </div>
                  )}
                  {supplier.supplier_mobile_number && (
                    <div className="info-row">
                      <span className="info-ico">📞</span>
                      <span>{supplier.supplier_mobile_number}</span>
                    </div>
                  )}
                  {supplier.supplier_mail_id && (
                    <div className="info-row">
                      <span className="info-ico">✉</span>
                      <span>{supplier.supplier_mail_id}</span>
                    </div>
                  )}
                  {supplier.supplier_gst_number && (
                    <div className="info-row">
                      <span className="info-ico">🪪</span>
                      <span>GST: {supplier.supplier_gst_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 3-Tier Accountancy Badges */}
              <div className="accountancy-summary-section">
                {/* 1. Total Purchase Amount */}
                <div className="acc-card sales-acc-card">
                  <div className="acc-pill-badge badge-purchase">Total Purchase Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(supplier.total_purchase)}</div>
                  <div className="acc-count-hint">{purchases.length} purchases recorded</div>
                </div>

                {/* 2. Total Debit Amount */}
                <div className="acc-card credit-acc-card">
                  <div className="acc-pill-badge badge-debit">Total Debit Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(supplier.total_debit)}</div>
                  <div className="acc-count-hint">{debits.length} payments recorded</div>
                </div>

                {/* 3. Pending / Balance Amount */}
                <div className="acc-card balance-acc-card">
                  <div className="acc-pill-badge badge-balance">Balance Amount</div>
                  <div className="acc-amount-val">₹{formatAmount(supplier.balance_amount)}</div>
                  <div className="acc-count-hint">Net outstanding balance</div>
                </div>
              </div>
            </div>

            {/* Main Content Grid: Entry Form (Left) & Transaction Ledger (Right) */}
            <div className="two-column-grid">
              {/* Left Column: Transaction Entry Form */}
              <div className="entry-form-card glass-panel">
                <div className="form-card-header">
                  <h3 className="form-title">Supplier Transaction Entry</h3>
                  <p className="form-subtitle">Record a raw material purchase or debit payment for this supplier.</p>
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
                        className={`seg-btn ${paytype === 1 ? "active-sales" : ""}`}
                        onClick={() => {
                          setPaytype(1);
                          setActiveTab("purchases");
                          setSortField("invoice_date");
                        }}
                      >
                        📦 Supplier Purchase Entry
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${paytype === 2 ? "active-credit" : ""}`}
                        onClick={() => {
                          setPaytype(2);
                          setActiveTab("debits");
                          setSortField("debit_date");
                        }}
                      >
                        💳 Supplier Debit Entry
                      </button>
                    </div>
                  </div>

                  {/* Supplier Purchase Entry Fields (paytype = 1) */}
                  {paytype === 1 && (
                    <div className="type-fields-group">
                      <div className="form-group">
                        <label className="form-label">Invoice Number</label>
                        <input
                          type="text"
                          value={inumber}
                          onChange={(e) => setInumber(e.target.value)}
                          placeholder="Enter Invoice Number"
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Purchase Date &amp; Time <span className="req-star">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={pdate}
                          onChange={(e) => setPdate(e.target.value)}
                          required
                          className="form-input font-mono"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Purchase Amount <span className="req-star">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={pamount}
                          onChange={(e) => setPamount(e.target.value)}
                          placeholder="Enter Purchase Amount in ₹"
                          required
                          className="form-input amount-input sales-accent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Supplier Debit Entry Fields (paytype = 2) */}
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

                      <div className="form-group">
                        <label className="form-label">
                          Debit Date &amp; Time <span className="req-star">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={ddate}
                          onChange={(e) => setDdate(e.target.value)}
                          required
                          className="form-input font-mono"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Debit Amount <span className="req-star">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={damount}
                          onChange={(e) => setDamount(e.target.value)}
                          placeholder="Enter Debit Amount in ₹"
                          required
                          className="form-input amount-input credit-accent"
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
                      <span>+ Record Purchase Entry</span>
                    ) : (
                      <span>+ Record Supplier Debit</span>
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
                      className={`tab-btn ${activeTab === "purchases" ? "tab-active-invoices" : ""}`}
                      onClick={() => {
                        setActiveTab("purchases");
                        setSortField("invoice_date");
                        setCurrentPage(1);
                      }}
                    >
                      <span>📦 Purchase Statement ({purchases.length})</span>
                      <span className="tab-sum-badge sales-sum">
                        ₹{formatAmount(supplier.total_purchase)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${activeTab === "debits" ? "tab-active-credits" : ""}`}
                      onClick={() => {
                        setActiveTab("debits");
                        setSortField("debit_date");
                        setCurrentPage(1);
                      }}
                    >
                      <span>💳 Debit Statement ({debits.length})</span>
                      <span className="tab-sum-badge credit-sum">
                        ₹{formatAmount(supplier.total_debit)}
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
                      placeholder={`Search ${activeTab === "purchases" ? "purchase date, invoice#, amount, notes" : "debit date, ref#, amount, notes"}...`}
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
                  {activeTab === "purchases" ? (
                    /* Purchase Statement Table */
                    <table className="statement-table">
                      <thead>
                        <tr>
                          {/* Column 1: Purchase Date & Time */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("invoice_date")}
                            style={{ width: "22%" }}
                          >
                            <div className="th-content">
                              <span>Invoice Date</span>
                              <span className="sort-indicator">
                                {sortField === "invoice_date" ? (sortAsc ? "▲" : "▼") : "⇅"}
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

                          {/* Column 3: Invoice Number */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("invoice_number")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content">
                              <span>Invoice Number</span>
                              <span className="sort-indicator">
                                {sortField === "invoice_number" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 4: Invoice Amount */}
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

                          {/* Column 5: Invoice Notes */}
                          <th style={{ width: "18%" }}>Invoice Notes</th>

                          {/* Column 6: Action */}
                          <th style={{ width: "6%", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedList.length > 0 ? (
                          (paginatedList as PurchaseItem[]).map((p) => {
                            const invoiceDateDisplay = formatDisplayDateTime(p.invoice_date) || "—";
                            const systemEntryDisplay =
                              formatDisplayDateTime(p.entry_date) || invoiceDateDisplay;

                            return (
                              <tr key={p.supplier_billing_id}>
                                <td className="font-mono text-dark">{invoiceDateDisplay}</td>
                                <td className="font-mono text-dark">{systemEntryDisplay}</td>
                                <td className="font-mono">
                                  {p.invoice_number ? (
                                    <span className="ref-chip">{p.invoice_number}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td className="text-right font-mono font-bold sales-text">
                                  ₹{formatAmount(p.amount)}
                                </td>
                                <td className="text-muted notes-cell">{p.notes || "—"}</td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="del-entry-btn"
                                    onClick={() => handleDelete(p.supplier_billing_id, "purchase")}
                                    title="Delete Purchase Entry"
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
                              No purchase records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Debit Statement Table */
                    <table className="statement-table">
                      <thead>
                        <tr>
                          {/* Column 1: Payment Date & Time */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("debit_date")}
                            style={{ width: "22%" }}
                          >
                            <div className="th-content">
                              <span>Payment Date</span>
                              <span className="sort-indicator">
                                {sortField === "debit_date" ? (sortAsc ? "▲" : "▼") : "⇅"}
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

                          {/* Column 3: Reference Number */}
                          <th
                            className="sortable-th"
                            onClick={() => handleSort("reference_number")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content">
                              <span>Reference Number</span>
                              <span className="sort-indicator">
                                {sortField === "reference_number" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 4: Payment Amount */}
                          <th
                            className="sortable-th text-right"
                            onClick={() => handleSort("amount")}
                            style={{ width: "16%" }}
                          >
                            <div className="th-content th-right">
                              <span>Payment Amount</span>
                              <span className="sort-indicator">
                                {sortField === "amount" ? (sortAsc ? "▲" : "▼") : "⇅"}
                              </span>
                            </div>
                          </th>

                          {/* Column 5: Payment Notes */}
                          <th style={{ width: "18%" }}>Payment Notes</th>

                          {/* Column 6: Action */}
                          <th style={{ width: "6%", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedList.length > 0 ? (
                          (paginatedList as DebitItem[]).map((d) => {
                            const debitDateDisplay = formatDisplayDateTime(d.debit_date) || "—";
                            const systemEntryDisplay =
                              formatDisplayDateTime(d.entry_date) || debitDateDisplay;

                            return (
                              <tr key={d.supplier_billing_id}>
                                <td className="font-mono text-dark">{debitDateDisplay}</td>
                                <td className="font-mono text-dark">{systemEntryDisplay}</td>
                                <td className="font-mono">
                                  {d.reference_number ? (
                                    <span className="ref-chip">{d.reference_number}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td className="text-right font-mono font-bold credit-text">
                                  ₹{formatAmount(d.amount)}
                                </td>
                                <td className="text-muted notes-cell">{d.notes || "—"}</td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="del-entry-btn"
                                    onClick={() => handleDelete(d.supplier_billing_id, "debit")}
                                    title="Delete Debit Entry"
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
                              No debit payment records found
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
                    {activeList.length !== (activeTab === "purchases" ? purchases.length : debits.length) && (
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

        /* Top Summary Panel */
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

        .badge-purchase {
          background: #f59e0b;
          color: #ffffff;
        }

        .badge-debit {
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

export default function SupplierPaymentPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "3rem", textAlign: "center" }}>
          Loading supplier payment view...
        </div>
      }
    >
      <SupplierPaymentContent />
    </Suspense>
  );
}
