"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";

interface SupplierItem {
  supplier_id: number;
  supplier_name: string;
  supplier_mail_id: string;
  supplier_mobile_number: string;
  supplier_address: string;
  supplier_gst_number: string;
  supplier_status: number;
  total_purchase?: number | string;
  total_debit?: number | string;
  balance_amount?: number | string;
}

type SortDirection = "asc" | "desc";
type SupplierSortColumn =
  | "supplier_name"
  | "supplier_address"
  | "supplier_mobile_number"
  | "total_purchase"
  | "total_debit"
  | "balance_amount"
  | null;

type SupplierFilterColumn =
  | "all"
  | "supplier_name"
  | "supplier_address"
  | "supplier_mobile_number"
  | "supplier_mail_id"
  | "supplier_gst_number"
  | "total_purchase"
  | "total_debit"
  | "balance_amount";

type FilterOperator =
  | "contains"
  | "starts_with"
  | "ends_with"
  | "equals"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "between";

export default function SupplierAdminPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [supplierSearch, setSupplierSearch] = useState<string>("");
  const [supplierSortColumn, setSupplierSortColumn] = useState<SupplierSortColumn>(null);
  const [supplierSortDirection, setSupplierSortDirection] = useState<SortDirection>("asc");
  const [supplierFilterColumn, setSupplierFilterColumn] = useState<SupplierFilterColumn>("all");
  const [supplierFilterOp, setSupplierFilterOp] = useState<FilterOperator>("contains");
  const [supplierFilterVal, setSupplierFilterVal] = useState<string>("");
  const [supplierFilterValMax, setSupplierFilterValMax] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formMobile, setFormMobile] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formGst, setFormGst] = useState<string>("");
  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rupee / Accountancy Details Modal
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [selectedSupplierForBilling, setSelectedSupplierForBilling] = useState<SupplierItem | null>(null);

  // Fetch only supplier data when page loads
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/supplier", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load supplier records");
      setSuppliers(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading supplier data";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Close filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (isFilterDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  const handleSupplierSort = (col: NonNullable<SupplierSortColumn>) => {
    if (supplierSortColumn === col) {
      if (supplierSortDirection === "asc") {
        setSupplierSortDirection("desc");
      } else {
        setSupplierSortColumn(null);
        setSupplierSortDirection("asc");
      }
    } else {
      setSupplierSortColumn(col);
      setSupplierSortDirection("asc");
    }
  };

  const hasActiveFilter = Boolean(
    supplierSearch.trim() ||
    (supplierFilterColumn !== "all" && supplierFilterVal.trim()) ||
    supplierSortColumn !== null
  );

  const resetAll = () => {
    setSupplierSearch("");
    setSupplierFilterColumn("all");
    setSupplierFilterOp("contains");
    setSupplierFilterVal("");
    setSupplierFilterValMax("");
    setSupplierSortColumn(null);
    setSupplierSortDirection("asc");
    setCurrentPage(1);
    setIsFilterDropdownOpen(false);
  };

  const getFilterSummaryText = () => {
    const colName =
      supplierFilterColumn === "supplier_name"
        ? "Supplier Name"
        : supplierFilterColumn === "supplier_address"
        ? "City"
        : supplierFilterColumn === "supplier_mobile_number"
        ? "Phone"
        : supplierFilterColumn === "supplier_mail_id"
        ? "Email"
        : supplierFilterColumn === "supplier_gst_number"
        ? "GST"
        : supplierFilterColumn === "total_purchase"
        ? "Purchase"
        : supplierFilterColumn === "total_debit"
        ? "Debit"
        : supplierFilterColumn === "balance_amount"
        ? "Balance"
        : "Column";

    if (supplierFilterOp === "between") {
      return `${colName} between ${supplierFilterVal} and ${supplierFilterValMax}`;
    }
    const opLabel =
      supplierFilterOp === "contains"
        ? "contains"
        : supplierFilterOp === "starts_with"
        ? "starts with"
        : supplierFilterOp === "ends_with"
        ? "ends with"
        : supplierFilterOp === "equals"
        ? "="
        : supplierFilterOp === "gt"
        ? ">"
        : supplierFilterOp === "lt"
        ? "<"
        : supplierFilterOp === "gte"
        ? ">="
        : supplierFilterOp === "lte"
        ? "<="
        : "";

    return `${colName} ${opLabel} "${supplierFilterVal}"`;
  };

  // Add & Edit Handlers
  const handleOpenAdd = () => {
    setEditingSupplierId(null);
    setFormName("");
    setFormMobile("");
    setFormEmail("");
    setFormAddress("");
    setFormGst("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: SupplierItem) => {
    setEditingSupplierId(item.supplier_id);
    setFormName(item.supplier_name);
    setFormMobile(item.supplier_mobile_number || "");
    setFormEmail(item.supplier_mail_id || "");
    setFormAddress(item.supplier_address || "");
    setFormGst(item.supplier_gst_number || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Supplier Name is required.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      if (editingSupplierId) {
        const res = await fetch("/api/admin/supplier", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSupplierId,
            name: formName,
            mobile: formMobile,
            email: formEmail,
            address: formAddress,
            gst: formGst,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to update supplier");
      } else {
        const res = await fetch("/api/admin/supplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            mobile: formMobile,
            email: formEmail,
            address: formAddress,
            gst: formGst,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to add supplier");
      }

      setIsModalOpen(false);
      await loadSuppliers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving supplier");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/supplier?id=${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to delete supplier");
      await loadSuppliers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting supplier");
    }
  };

  // Filter supplier list
  const filteredSuppliers = suppliers.filter((s) => {
    if (supplierSearch.trim()) {
      const q = supplierSearch.toLowerCase().trim();
      const match =
        s.supplier_name.toLowerCase().includes(q) ||
        (s.supplier_address || "").toLowerCase().includes(q) ||
        (s.supplier_mobile_number || "").toLowerCase().includes(q) ||
        (s.supplier_mail_id || "").toLowerCase().includes(q) ||
        (s.supplier_gst_number || "").toLowerCase().includes(q) ||
        String(s.total_purchase || "").includes(q) ||
        String(s.total_debit || "").includes(q) ||
        String(s.balance_amount || "").includes(q);
      if (!match) return false;
    }

    if (supplierFilterColumn !== "all" && supplierFilterVal.trim()) {
      if (
        supplierFilterColumn === "total_purchase" ||
        supplierFilterColumn === "total_debit" ||
        supplierFilterColumn === "balance_amount"
      ) {
        const val = Number(s[supplierFilterColumn]) || 0;
        const target = Number(supplierFilterVal) || 0;
        if (supplierFilterOp === "gt" && !(val > target)) return false;
        if (supplierFilterOp === "lt" && !(val < target)) return false;
        if (supplierFilterOp === "gte" && !(val >= target)) return false;
        if (supplierFilterOp === "lte" && !(val <= target)) return false;
        if (supplierFilterOp === "equals" && val !== target) return false;
        if (supplierFilterOp === "between") {
          const max = Number(supplierFilterValMax) || 0;
          if (val < target || val > max) return false;
        }
      } else {
        const text = String(s[supplierFilterColumn] || "").toLowerCase();
        const target = supplierFilterVal.toLowerCase().trim();
        if (supplierFilterOp === "contains" && !text.includes(target)) return false;
        if (supplierFilterOp === "starts_with" && !text.startsWith(target)) return false;
        if (supplierFilterOp === "ends_with" && !text.endsWith(target)) return false;
        if (supplierFilterOp === "equals" && text !== target) return false;
      }
    }

    return true;
  });

  // Sort supplier list
  const sortedSuppliers = supplierSortColumn
    ? [...filteredSuppliers].sort((a, b) => {
        if (
          supplierSortColumn === "supplier_name" ||
          supplierSortColumn === "supplier_address" ||
          supplierSortColumn === "supplier_mobile_number"
        ) {
          const textA = String(a[supplierSortColumn] || "");
          const textB = String(b[supplierSortColumn] || "");
          const cmp = textA.localeCompare(textB);
          return supplierSortDirection === "asc" ? cmp : -cmp;
        }
        const numA = Number(a[supplierSortColumn]) || 0;
        const numB = Number(b[supplierSortColumn]) || 0;
        return supplierSortDirection === "asc" ? numA - numB : numB - numA;
      })
    : filteredSuppliers;

  // Format amount: whole or 0 without decimals, else 2 decimals
  const formatAmount = (val: number | string | undefined, forceDecimals = true) => {
    const num = Number(val) || 0;
    if (forceDecimals) {
      return num.toFixed(2);
    }
    return num % 1 === 0 ? String(Math.round(num)) : num.toFixed(2);
  };

  return (
    <div className="admin-app-wrapper">
      <AdminNav />

      <main className="dashboard-content-area">
        {loading ? (
          <div className="loading-card glass-panel">
            <div className="spinner"></div>
            <p>Loading supplier records...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={loadSuppliers}>
              Retry
            </button>
          </div>
        ) : (
          <div className="tab-content-container">
            <div className="flex-register-card glass-panel">
              {/* Header Row: Title & + Add Supplier Button */}
              <div className="flex-card-header">
                <div>
                  <h2 className="section-title">Raw Material Suppliers</h2>
                  <p className="section-subtitle">Verified roll flex and solvent ink distributors</p>
                </div>
                <button type="button" className="add-flex-btn" onClick={handleOpenAdd}>
                  <span className="add-plus">+</span>
                  <span>Add Supplier</span>
                </button>
              </div>

              {/* Controls Row: Show entries (Left) & Search with Filter in right corner (Right) */}
              <div className="table-controls-row">
                <div className="entries-select-wrapper">
                  <span>Show</span>
                  <select
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="entries-select"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>entries</span>
                </div>

                {/* Search Box with Filter Option on the Right Corner */}
                <div className="table-search-container" ref={filterMenuRef}>
                  <div className="search-input-combo-box">
                    <span className="search-icon-prefix">🔍</span>
                    <input
                      id="supplier-search"
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      placeholder={
                        hasActiveFilter
                          ? `Filtered (${filteredSuppliers.length} suppliers)...`
                          : "Search suppliers..."
                      }
                      className="table-search-input"
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSupplierSearch("")}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}

                    {/* Filter button in the right corner of search div */}
                    <button
                      type="button"
                      className={`filter-corner-btn ${isFilterDropdownOpen || hasActiveFilter ? "active" : ""}`}
                      onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                      title="Filter &amp; Sort menu"
                    >
                      <span className="filter-funnel-icon">⚙</span>
                      <span className="filter-btn-text">Filter</span>
                      {hasActiveFilter && <span className="filter-active-indicator" />}
                      <span className="filter-caret">{isFilterDropdownOpen ? "▲" : "▼"}</span>
                    </button>
                  </div>

                  {/* Active filter badges & Reset All button */}
                  {hasActiveFilter && (
                    <div className="active-filters-bar">
                      {supplierSearch.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Search:</span> &ldquo;{supplierSearch.trim()}&rdquo;
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => setSupplierSearch("")}
                            title="Clear search query"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {supplierFilterColumn !== "all" && supplierFilterVal.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Filter:</span> {getFilterSummaryText()}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setSupplierFilterColumn("all");
                              setSupplierFilterVal("");
                              setSupplierFilterValMax("");
                            }}
                            title="Clear column filter"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {supplierSortColumn !== null && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Sort:</span>{" "}
                          {supplierSortColumn === "supplier_name"
                            ? `Supplier Name (${supplierSortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : supplierSortColumn === "supplier_address"
                            ? `City (${supplierSortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : supplierSortColumn === "total_purchase"
                            ? `Purchase (${supplierSortDirection === "asc" ? "Low → High" : "High → Low"})`
                            : supplierSortColumn === "total_debit"
                            ? `Debit (${supplierSortDirection === "asc" ? "Low → High" : "High → Low"})`
                            : `Balance (${supplierSortDirection === "asc" ? "Low → High" : "High → Low"})`}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setSupplierSortColumn(null);
                              setSupplierSortDirection("asc");
                            }}
                            title="Remove sorting"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      <button
                        type="button"
                        className="reset-all-pill-btn"
                        onClick={resetAll}
                        title="Remove all filters, search query, and sorting"
                      >
                        <span>Reset All</span>
                        <span className="reset-symbol">↺</span>
                      </button>
                    </div>
                  )}

                  {/* Filter & Sort Popover Dropdown positioned directly beneath the search div */}
                  {isFilterDropdownOpen && (
                    <div className="filter-popover-dropdown">
                      <div className="filter-popover-header">
                        <span className="popover-title">⚙ Filter &amp; Sort Suppliers</span>
                        <button
                          type="button"
                          className="popover-close-btn"
                          onClick={() => setIsFilterDropdownOpen(false)}
                        >
                          ✕
                        </button>
                      </div>

                      {/* 1. Select Column */}
                      <div className="popover-field-group">
                        <label className="popover-field-label">Filter Column:</label>
                        <select
                          value={supplierFilterColumn}
                          onChange={(e) => {
                            const val = e.target.value as SupplierFilterColumn;
                            setSupplierFilterColumn(val);
                            if (
                              val === "total_purchase" ||
                              val === "total_debit" ||
                              val === "balance_amount"
                            ) {
                              setSupplierFilterOp("gt");
                            } else {
                              setSupplierFilterOp("contains");
                            }
                          }}
                          className="popover-select"
                        >
                          <option value="all">All Columns</option>
                          <option value="supplier_name">Supplier Name (Text)</option>
                          <option value="supplier_address">City / Address (Text)</option>
                          <option value="supplier_mobile_number">Mobile Number (Text)</option>
                          <option value="supplier_mail_id">Mail ID (Text)</option>
                          <option value="supplier_gst_number">GST Number (Text)</option>
                          <option value="total_purchase">Total Purchase Amount (₹)</option>
                          <option value="total_debit">Total Debit Amount (₹)</option>
                          <option value="balance_amount">Balance Amount (₹)</option>
                        </select>
                      </div>

                      {/* 2. Condition / Operator */}
                      {supplierFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Condition / Match:</label>
                          <select
                            value={supplierFilterOp}
                            onChange={(e) => setSupplierFilterOp(e.target.value as FilterOperator)}
                            className="popover-select"
                          >
                            {supplierFilterColumn === "total_purchase" ||
                            supplierFilterColumn === "total_debit" ||
                            supplierFilterColumn === "balance_amount" ? (
                              <>
                                <option value="gt">Greater than (&gt;)</option>
                                <option value="lt">Smaller than / Less than (&lt;)</option>
                                <option value="gte">Greater than or equal (&gt;=)</option>
                                <option value="lte">Smaller than or equal (&lt;=)</option>
                                <option value="equals">Equal to (=)</option>
                                <option value="between">Between (Min – Max)</option>
                              </>
                            ) : (
                              <>
                                <option value="contains">Contains</option>
                                <option value="starts_with">Starts with</option>
                                <option value="ends_with">Ends with</option>
                                <option value="equals">Exactly equals</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}

                      {/* 3. Filter Value Input */}
                      {supplierFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Filter Value:</label>
                          {supplierFilterOp === "between" ? (
                            <div className="between-inputs-box">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Min"
                                value={supplierFilterVal}
                                onChange={(e) => setSupplierFilterVal(e.target.value)}
                                className="popover-input"
                              />
                              <span className="between-dash">–</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Max"
                                value={supplierFilterValMax}
                                onChange={(e) => setSupplierFilterValMax(e.target.value)}
                                className="popover-input"
                              />
                            </div>
                          ) : (
                            <input
                              type={
                                supplierFilterColumn === "total_purchase" ||
                                supplierFilterColumn === "total_debit" ||
                                supplierFilterColumn === "balance_amount"
                                  ? "number"
                                  : "text"
                              }
                              step={
                                supplierFilterColumn === "total_purchase" ||
                                supplierFilterColumn === "total_debit" ||
                                supplierFilterColumn === "balance_amount"
                                  ? "0.01"
                                  : undefined
                              }
                              placeholder="Enter value..."
                              value={supplierFilterVal}
                              onChange={(e) => setSupplierFilterVal(e.target.value)}
                              className="popover-input"
                            />
                          )}
                        </div>
                      )}

                      <div className="popover-divider" />

                      {/* 4. Quick Sort Options inside the menu */}
                      <div className="popover-field-group">
                        <label className="popover-field-label">Quick Sort By:</label>
                        <div className="popover-sort-buttons">
                          <button
                            type="button"
                            className={`popover-sort-btn ${supplierSortColumn === "supplier_name" && supplierSortDirection === "asc" ? "active" : ""}`}
                            onClick={() => {
                              setSupplierSortColumn("supplier_name");
                              setSupplierSortDirection("asc");
                            }}
                          >
                            🔤 Name: A → Z (Asc)
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${supplierSortColumn === "supplier_name" && supplierSortDirection === "desc" ? "active" : ""}`}
                            onClick={() => {
                              setSupplierSortColumn("supplier_name");
                              setSupplierSortDirection("desc");
                            }}
                          >
                            🔤 Name: Z → A (Desc)
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${supplierSortColumn === "balance_amount" && supplierSortDirection === "desc" ? "active" : ""}`}
                            onClick={() => {
                              setSupplierSortColumn("balance_amount");
                              setSupplierSortDirection("desc");
                            }}
                          >
                            ₹ Balance: High → Low
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${supplierSortColumn === "balance_amount" && supplierSortDirection === "asc" ? "active" : ""}`}
                            onClick={() => {
                              setSupplierSortColumn("balance_amount");
                              setSupplierSortDirection("asc");
                            }}
                          >
                            ₹ Balance: Low → High
                          </button>
                        </div>
                      </div>

                      {/* 5. Footer Buttons */}
                      <div className="popover-footer">
                        <button
                          type="button"
                          className="popover-reset-btn"
                          onClick={resetAll}
                          title="Remove all filters and sorting"
                        >
                          Reset All ↺
                        </button>
                        <button
                          type="button"
                          className="popover-done-btn"
                          onClick={() => setIsFilterDropdownOpen(false)}
                        >
                          Apply / Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table matching User's Image (Supplier Name | Contacts | Action | Accountancy) */}
              <div className="table-responsive-container">
                <table className="flex-data-table supplier-data-table">
                  <thead>
                    <tr>
                      {/* 1. Sortable: Supplier Name */}
                      <th
                        className={`sortable-th ${supplierSortColumn === "supplier_name" ? "active-sort" : ""}`}
                        title="Click to sort by Supplier Name (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleSupplierSort("supplier_name")}>
                          <span className="th-label">Supplier Name</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "supplier_name" && supplierSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "supplier_name" && supplierSortDirection === "asc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("supplier_name");
                                  setSupplierSortDirection("asc");
                                }
                              }}
                              title="Sort Supplier Name: A to Z"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "supplier_name" && supplierSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "supplier_name" && supplierSortDirection === "desc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("supplier_name");
                                  setSupplierSortDirection("desc");
                                }
                              }}
                              title="Sort Supplier Name: Z to A"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 2. Sortable: Contacts (by City) */}
                      <th
                        className={`sortable-th ${supplierSortColumn === "supplier_address" ? "active-sort" : ""}`}
                        title="Click to sort by City (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleSupplierSort("supplier_address")}>
                          <span className="th-label">Contacts</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "supplier_address" && supplierSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "supplier_address" && supplierSortDirection === "asc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("supplier_address");
                                  setSupplierSortDirection("asc");
                                }
                              }}
                              title="Sort Contacts by City: A to Z"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "supplier_address" && supplierSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "supplier_address" && supplierSortDirection === "desc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("supplier_address");
                                  setSupplierSortDirection("desc");
                                }
                              }}
                              title="Sort Contacts by City: Z to A"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 3. Action: strictly NOT sortable */}
                      <th className="th-action">Action</th>

                      {/* 4. Sortable: Accountancy (by Balance) */}
                      <th
                        className={`sortable-th ${supplierSortColumn === "balance_amount" ? "active-sort" : ""}`}
                        title="Click to sort by Balance Amount (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleSupplierSort("balance_amount")}>
                          <span className="th-label">Accountancy</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "balance_amount" && supplierSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "balance_amount" && supplierSortDirection === "asc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("balance_amount");
                                  setSupplierSortDirection("asc");
                                }
                              }}
                              title="Sort Balance: Low to High"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${supplierSortColumn === "balance_amount" && supplierSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (supplierSortColumn === "balance_amount" && supplierSortDirection === "desc") {
                                  setSupplierSortColumn(null);
                                } else {
                                  setSupplierSortColumn("balance_amount");
                                  setSupplierSortDirection("desc");
                                }
                              }}
                              title="Sort Balance: High to Low"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSuppliers.length > 0 ? (
                      sortedSuppliers.map((s) => (
                        <tr key={s.supplier_id}>
                          {/* Column 1: Supplier Name */}
                          <td className="td-supplier-name">
                            <span className="supplier-title-text">{s.supplier_name}</span>
                          </td>

                          {/* Column 2: Contacts (4 icon rows matching image) */}
                          <td className="td-contacts">
                            <div className="contact-list">
                              <div className="contact-item">
                                <span className="contact-symbol">👤</span>
                                <span className="contact-data-text">{s.supplier_address || "—"}</span>
                              </div>
                              <div className="contact-item">
                                <span className="contact-symbol">📞</span>
                                <span className="contact-data-text">{s.supplier_mobile_number || "—"}</span>
                              </div>
                              <div className="contact-item">
                                <span className="contact-symbol">✉</span>
                                <span className="contact-data-text">{s.supplier_mail_id || "—"}</span>
                              </div>
                              <div className="contact-item">
                                <span className="contact-symbol">🪪</span>
                                <span className="contact-data-text font-mono">{s.supplier_gst_number || "—"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Action (3 symbol buttons matching user requirement) */}
                          <td className="td-action">
                            <div className="action-btn-group">
                              {/* Edit Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleOpenEdit(s)}
                                title="Edit Supplier Details"
                              >
                                <img src="/icons/btn_edit.png" alt="Edit" className="action-icon-img" />
                              </button>
                              {/* Rupee Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => router.push(`/admin/supplier/payment?sid=${s.supplier_id}`)}
                                title="View Accountancy Statement & Billing"
                              >
                                <img src="/icons/btn_rupee.png" alt="Ledger" className="action-icon-img" />
                              </button>
                              {/* Delete Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleDelete(s.supplier_id, s.supplier_name)}
                                title="Delete Supplier"
                              >
                                <img src="/icons/btn_delete.png" alt="Delete" className="action-icon-img" />
                              </button>
                            </div>
                          </td>

                          {/* Column 4: Accountancy (Yellow/Green/Red 3-tier matching screenshot) */}
                          <td className="td-accountancy">
                            <div className="accountancy-stack">
                              {/* Row 1: Total Purchase Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-purchase">Total Purchase Amount</span>
                                <span className="acc-amount-val">{formatAmount(s.total_purchase, true)}</span>
                              </div>
                              {/* Row 2: Total Debit Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-debit">Total Debit Amount</span>
                                <span className="acc-amount-val">{formatAmount(s.total_debit, true)}</span>
                              </div>
                              {/* Row 3: Balance Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-balance">Balance Amount</span>
                                <span className="acc-amount-val">{formatAmount(s.balance_amount, false)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          No matching supplier records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Showing entries & Pagination */}
              <div className="table-footer-row">
                <div className="footer-info">
                  Showing 1 to {sortedSuppliers.length} of {suppliers.length} entries
                  {sortedSuppliers.length !== suppliers.length && (
                    <span> (filtered from {suppliers.length} total entries)</span>
                  )}
                </div>
                <div className="pagination-wrapper">
                  <button type="button" className="page-link prev-link disabled" disabled>
                    Previous
                  </button>
                  <button type="button" className="page-link active-link">
                    1
                  </button>
                  <button type="button" className="page-link next-link disabled" disabled>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel">
            <div className="modal-header">
              <h3>{editingSupplierId ? "Edit Supplier Details" : "Add New Raw Material Supplier"}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {formError && <div className="modal-error-banner">{formError}</div>}

            <form onSubmit={handleSave} className="modal-form">
              <div className="m-form-group">
                <label htmlFor="sup-name">Supplier Name *</label>
                <input
                  id="sup-name"
                  type="text"
                  required
                  placeholder="e.g. PREMIER PLASTIC"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="sup-mobile">Mobile Number</label>
                  <input
                    id="sup-mobile"
                    type="tel"
                    placeholder="e.g. 9843010943"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="sup-email">Email Address</label>
                  <input
                    id="sup-email"
                    type="email"
                    placeholder="e.g. premier@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="sup-address">City / Address</label>
                  <input
                    id="sup-address"
                    type="text"
                    placeholder="e.g. MADURAI"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="sup-gst">GST Number</label>
                  <input
                    id="sup-gst"
                    type="text"
                    placeholder="e.g. 33BMBPS6914B1ZC"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-btn-row">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-submit-btn" disabled={formSaving}>
                  {formSaving ? "Saving..." : editingSupplierId ? "Update Supplier" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accountancy Statement Modal (₹ button) */}
      {isBillingModalOpen && selectedSupplierForBilling && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel accountancy-modal-card">
            <div className="modal-header">
              <div>
                <h3>Accountancy Statement</h3>
                <p className="modal-subtitle">{selectedSupplierForBilling.supplier_name}</p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsBillingModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="billing-summary-grid">
              <div className="billing-stat-box box-purchase">
                <span className="stat-label">Total Purchase Amount</span>
                <span className="stat-value">₹{formatAmount(selectedSupplierForBilling.total_purchase, true)}</span>
              </div>
              <div className="billing-stat-box box-debit">
                <span className="stat-label">Total Debit Amount</span>
                <span className="stat-value">₹{formatAmount(selectedSupplierForBilling.total_debit, true)}</span>
              </div>
              <div className="billing-stat-box box-balance">
                <span className="stat-label">Net Balance Amount</span>
                <span className="stat-value">₹{formatAmount(selectedSupplierForBilling.balance_amount, false)}</span>
              </div>
            </div>

            <div className="supplier-contact-summary-box">
              <p><strong>City:</strong> {selectedSupplierForBilling.supplier_address || "—"}</p>
              <p><strong>Mobile:</strong> {selectedSupplierForBilling.supplier_mobile_number || "—"}</p>
              <p><strong>Email:</strong> {selectedSupplierForBilling.supplier_mail_id || "—"}</p>
              <p><strong>GST Number:</strong> {selectedSupplierForBilling.supplier_gst_number || "—"}</p>
            </div>

            <div className="modal-btn-row">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setIsBillingModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
          max-width: 1360px;
          width: 100%;
          margin: 0 auto;
          padding: 1.25rem 0.75rem 3rem 0.75rem;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }

        .flex-register-card {
          padding: 1.25rem 1.4rem;
        }

        .flex-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-title {
          font-size: 1.28rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.2rem 0;
        }

        .section-subtitle {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
        }

        .add-flex-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.95rem;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
          transition: all 0.2s ease;
        }

        .add-flex-btn:hover {
          background: #0369a1;
          transform: translateY(-1px);
        }

        .add-plus {
          font-size: 1.1rem;
          line-height: 1;
        }

        /* Controls row */
        .table-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .entries-select-wrapper {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.86rem;
          color: #475569;
        }

        .entries-select {
          padding: 0.35rem 0.55rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 0.84rem;
          font-weight: 600;
          background: #ffffff;
        }

        /* Search + Filter Container */
        .table-search-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.4rem;
        }

        .search-input-combo-box {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-input-combo-box:focus-within {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .search-icon-prefix {
          padding-left: 0.65rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .table-search-input {
          padding: 0.45rem 0.65rem;
          border: none;
          outline: none;
          font-size: 0.86rem;
          width: 210px;
          background: transparent;
        }

        .clear-search-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
        }

        .clear-search-btn:hover {
          color: #ef4444;
        }

        /* Filter button in the right corner of search div */
        .filter-corner-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #f8fafc;
          border: none;
          border-left: 1px solid #cbd5e1;
          padding: 0.45rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: background-color 0.15s ease, color 0.15s ease;
          position: relative;
        }

        .filter-corner-btn:hover {
          background: #f1f5f9;
          color: #0284c7;
        }

        .filter-corner-btn.active {
          background: #e0f2fe;
          color: #0284c7;
          border-left-color: #7dd3fc;
        }

        .filter-funnel-icon {
          font-size: 0.85rem;
        }

        .filter-active-indicator {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #0284c7;
        }

        .filter-caret {
          font-size: 0.65rem;
          color: #64748b;
        }

        /* Active filter chips */
        .active-filters-bar {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 500px;
        }

        .active-filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          padding: 0.18rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 600;
        }

        .chip-key {
          color: #0284c7;
          font-weight: 800;
        }

        .chip-remove-btn {
          background: transparent;
          border: none;
          color: #0284c7;
          font-size: 0.72rem;
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
        }

        .chip-remove-btn:hover {
          color: #ef4444;
        }

        .reset-all-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 0.18rem 0.55rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .reset-all-pill-btn:hover {
          background: #fca5a5;
        }

        .reset-symbol {
          font-size: 0.8rem;
        }

        /* Popover dropdown */
        .filter-popover-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 320px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
          padding: 0.9rem;
          z-index: 80;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          text-align: left;
        }

        .filter-popover-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .popover-title {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0f172a;
        }

        .popover-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .popover-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .popover-field-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
        }

        .popover-select,
        .popover-input {
          padding: 0.4rem 0.55rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          font-size: 0.82rem;
          outline: none;
        }

        .popover-select:focus,
        .popover-input:focus {
          border-color: #0284c7;
        }

        .between-inputs-box {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .between-dash {
          color: #64748b;
          font-weight: 700;
        }

        .popover-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 0.1rem 0;
        }

        .popover-sort-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .popover-sort-btn {
          text-align: left;
          padding: 0.35rem 0.55rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.76rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .popover-sort-btn:hover {
          background: #e0f2fe;
          border-color: #7dd3fc;
          color: #0284c7;
        }

        .popover-sort-btn.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        .popover-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.4rem;
          padding-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .popover-reset-btn {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
        }

        .popover-done-btn {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Table Styling */
        .table-responsive-container {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
        }

        .flex-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
          text-align: left;
        }

        .flex-data-table thead {
          background: #e0f2fe;
          border-bottom: 2px solid #bae6fd;
        }

        .flex-data-table th {
          padding: 0.75rem 0.85rem;
          font-weight: 800;
          color: #0369a1;
          font-size: 0.86rem;
          white-space: nowrap;
          user-select: none;
        }

        .flex-data-table th.sortable-th {
          cursor: pointer;
        }

        .flex-data-table th.sortable-th:hover {
          background: #bae6fd;
        }

        .flex-data-table th.active-sort {
          background: #bae6fd;
          color: #0c4a6e;
        }

        .th-flex-box {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .sort-arrows-group {
          display: inline-flex;
          flex-direction: column;
          gap: 1px;
          line-height: 1;
        }

        .sort-arrow-icon {
          font-size: 0.62rem;
          line-height: 0.62rem;
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .arrow-active {
          color: #0284c7;
          font-weight: 900;
          transform: scale(1.2);
        }

        .arrow-inactive {
          color: #94a3b8;
        }

        .th-action {
          width: 120px;
          text-align: center;
        }

        .flex-data-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.15s ease;
        }

        .flex-data-table tbody tr:hover {
          background: #f0fdf4;
        }

        .flex-data-table td {
          padding: 0.85rem 0.85rem;
          color: #1e293b;
          vertical-align: middle;
        }

        /* Supplier Specific Columns */
        .td-supplier-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
          width: 220px;
        }

        .supplier-title-text {
          display: block;
        }

        /* Contacts Column (4 icons) */
        .td-contacts {
          width: 320px;
        }

        .contact-list {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          font-size: 0.84rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .contact-symbol {
          font-size: 0.9rem;
          width: 18px;
          display: inline-block;
          text-align: center;
          opacity: 0.85;
        }

        .contact-data-text {
          color: #334155;
          font-weight: 600;
        }

        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.8rem;
          letter-spacing: 0.03em;
        }

        /* Action Column with 3 Square Symbol Buttons */
        .td-action {
          text-align: center;
          width: 140px;
        }

        .action-btn-group {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
        }

        .custom-icon-btn {
          background: transparent;
          border: none;
          padding: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, filter 0.15s ease;
          border-radius: 6px;
          outline: none;
        }

        .custom-icon-btn:hover {
          transform: scale(1.18);
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2));
        }

        .custom-icon-btn:active {
          transform: scale(0.92);
        }

        .action-icon-img {
          width: 32px;
          height: 32px;
          object-fit: contain;
          display: block;
        }

        /* Accountancy Column matching screenshot */
        .td-accountancy {
          width: 320px;
        }

        .accountancy-stack {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .accountancy-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }

        .acc-badge {
          display: inline-block;
          color: #ffffff;
          padding: 0.22rem 0.6rem;
          border-radius: 4px;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
          min-width: 155px;
        }

        .badge-purchase {
          background: #f59e0b; /* Amber / Yellow matching image */
        }

        .badge-debit {
          background: #16a34a; /* Green matching image */
        }

        .badge-balance {
          background: #dc2626; /* Red matching image */
        }

        .acc-amount-val {
          font-weight: 800;
          font-size: 0.92rem;
          color: #0f172a;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .empty-table-cell {
          text-align: center;
          padding: 2.5rem !important;
          color: #64748b;
          font-style: italic;
        }

        /* Footer & Pagination */
        .table-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.85rem;
          color: #475569;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .footer-info {
          font-weight: 500;
        }

        .pagination-wrapper {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .page-link {
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .page-link.active-link {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        .page-link.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 520px;
          padding: 1.5rem;
          border-radius: 14px;
        }

        .accountancy-modal-card {
          max-width: 480px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.2rem;
          padding-bottom: 0.6rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }

        .modal-subtitle {
          margin: 0.2rem 0 0 0;
          font-size: 0.85rem;
          color: #0284c7;
          font-weight: 700;
        }

        .close-modal-btn {
          background: transparent;
          border: none;
          font-size: 1.1rem;
          color: #94a3b8;
          cursor: pointer;
        }

        .modal-error-banner {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .m-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .m-form-group label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
        }

        .m-form-group input {
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.88rem;
          outline: none;
        }

        .m-form-group input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .modal-btn-row {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          margin-top: 1.2rem;
          padding-top: 0.85rem;
          border-top: 1px solid #f1f5f9;
        }

        .modal-cancel-btn {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 0.45rem 1rem;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-submit-btn {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.45rem 1.15rem;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Billing summary modal grid */
        .billing-summary-grid {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1.2rem;
        }

        .billing-stat-box {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .box-purchase {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
        }

        .box-debit {
          background: #dcfce7;
          border-left: 4px solid #16a34a;
        }

        .box-balance {
          background: #fee2e2;
          border-left: 4px solid #dc2626;
        }

        .stat-label {
          font-size: 0.84rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-value {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .supplier-contact-summary-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.84rem;
          line-height: 1.6;
        }

        .supplier-contact-summary-box p {
          margin: 0.2rem 0;
        }

        .loading-card,
        .error-card {
          padding: 3rem;
          text-align: center;
          margin-top: 2rem;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3.5px solid #e2e8f0;
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
      `}</style>
    </div>
  );
}
