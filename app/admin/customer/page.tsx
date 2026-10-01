"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";

interface CustomerItem {
  customer_id: number;
  customer_name: string;
  customer_mail_id: string;
  customer_mobile_number: string;
  customer_address: string;
  customer_gst_number: string;
  customer_password?: string;
  customer_status: number;
  customer_datetime: string;
  total_sales?: number | string;
  total_credit?: number | string;
  balance_amount?: number | string;
}

type SortDirection = "asc" | "desc";
type CustomerSortColumn =
  | "customer_name"
  | "customer_address"
  | "customer_mobile_number"
  | "total_sales"
  | "total_credit"
  | "balance_amount"
  | null;

type CustomerFilterColumn =
  | "all"
  | "customer_name"
  | "customer_address"
  | "customer_mobile_number"
  | "customer_mail_id"
  | "customer_gst_number"
  | "total_sales"
  | "total_credit"
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

export default function CustomerAdminPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [customerSortColumn, setCustomerSortColumn] = useState<CustomerSortColumn>(null);
  const [customerSortDirection, setCustomerSortDirection] = useState<SortDirection>("asc");
  const [customerFilterColumn, setCustomerFilterColumn] = useState<CustomerFilterColumn>("all");
  const [customerFilterOp, setCustomerFilterOp] = useState<FilterOperator>("contains");
  const [customerFilterVal, setCustomerFilterVal] = useState<string>("");
  const [customerFilterValMax, setCustomerFilterValMax] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>("");
  const [formMobile, setFormMobile] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formGst, setFormGst] = useState<string>("");
  const [formPassword, setFormPassword] = useState<string>("");
  const [formSaving, setFormSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Rupee / Accountancy Details Modal
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [selectedCustomerForBilling, setSelectedCustomerForBilling] = useState<CustomerItem | null>(null);

  // Fetch only customer data when page loads
  const loadCustomers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/customer", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load customer records");
      setCustomers(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading customer data";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
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

  const handleCustomerSort = (col: NonNullable<CustomerSortColumn>) => {
    if (customerSortColumn === col) {
      if (customerSortDirection === "asc") {
        setCustomerSortDirection("desc");
      } else {
        setCustomerSortColumn(null);
        setCustomerSortDirection("asc");
      }
    } else {
      setCustomerSortColumn(col);
      setCustomerSortDirection("asc");
    }
  };

  const hasActiveFilter = Boolean(
    customerSearch.trim() ||
    (customerFilterColumn !== "all" && customerFilterVal.trim()) ||
    customerSortColumn !== null
  );

  const resetAll = () => {
    setCustomerSearch("");
    setCustomerFilterColumn("all");
    setCustomerFilterOp("contains");
    setCustomerFilterVal("");
    setCustomerFilterValMax("");
    setCustomerSortColumn(null);
    setCustomerSortDirection("asc");
    setCurrentPage(1);
    setIsFilterDropdownOpen(false);
  };

  const getFilterSummaryText = () => {
    const colName =
      customerFilterColumn === "customer_name"
        ? "Customer Name"
        : customerFilterColumn === "customer_address"
        ? "City"
        : customerFilterColumn === "customer_mobile_number"
        ? "Phone"
        : customerFilterColumn === "customer_mail_id"
        ? "Email"
        : customerFilterColumn === "customer_gst_number"
        ? "GST"
        : customerFilterColumn === "total_sales"
        ? "Sales"
        : customerFilterColumn === "total_credit"
        ? "Credit"
        : customerFilterColumn === "balance_amount"
        ? "Balance"
        : "Column";

    if (customerFilterOp === "between") {
      return `${colName} between ${customerFilterVal} and ${customerFilterValMax}`;
    }
    const opLabel =
      customerFilterOp === "contains"
        ? "contains"
        : customerFilterOp === "starts_with"
        ? "starts with"
        : customerFilterOp === "ends_with"
        ? "ends with"
        : customerFilterOp === "equals"
        ? "="
        : customerFilterOp === "gt"
        ? ">"
        : customerFilterOp === "lt"
        ? "<"
        : customerFilterOp === "gte"
        ? ">="
        : customerFilterOp === "lte"
        ? "<="
        : "";

    return `${colName} ${opLabel} "${customerFilterVal}"`;
  };

  // Add & Edit Handlers
  const handleOpenAdd = () => {
    setEditingCustomerId(null);
    setFormName("");
    setFormMobile("");
    setFormEmail("");
    setFormAddress("");
    setFormGst("");
    setFormPassword("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CustomerItem) => {
    setEditingCustomerId(item.customer_id);
    setFormName(item.customer_name);
    setFormMobile(String(item.customer_mobile_number || ""));
    setFormEmail(item.customer_mail_id || "");
    setFormAddress(item.customer_address || "");
    setFormGst(item.customer_gst_number || "");
    setFormPassword(item.customer_password || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Customer Name is required.");
      return;
    }

    setFormSaving(true);
    setFormError(null);

    try {
      if (editingCustomerId) {
        const res = await fetch("/api/admin/customer", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCustomerId,
            name: formName,
            mobile: formMobile,
            email: formEmail,
            address: formAddress,
            gst: formGst,
            password: formPassword,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to update customer");
      } else {
        const res = await fetch("/api/admin/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            mobile: formMobile,
            email: formEmail,
            address: formAddress,
            gst: formGst,
            password: formPassword,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to add customer");
      }

      setIsModalOpen(false);
      await loadCustomers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving customer");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to deactivate customer "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/customer?id=${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to delete customer");
      await loadCustomers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting customer");
    }
  };

  // Filter list
  const filteredCustomers = customers.filter((c) => {
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase().trim();
      const match =
        c.customer_name.toLowerCase().includes(q) ||
        (c.customer_address || "").toLowerCase().includes(q) ||
        String(c.customer_mobile_number || "").toLowerCase().includes(q) ||
        (c.customer_mail_id || "").toLowerCase().includes(q) ||
        (c.customer_gst_number || "").toLowerCase().includes(q) ||
        String(c.total_sales || "").includes(q) ||
        String(c.total_credit || "").includes(q) ||
        String(c.balance_amount || "").includes(q);
      if (!match) return false;
    }

    if (customerFilterColumn !== "all" && customerFilterVal.trim()) {
      if (
        customerFilterColumn === "total_sales" ||
        customerFilterColumn === "total_credit" ||
        customerFilterColumn === "balance_amount"
      ) {
        const val = Number(c[customerFilterColumn]) || 0;
        const target = Number(customerFilterVal) || 0;
        if (customerFilterOp === "gt" && !(val > target)) return false;
        if (customerFilterOp === "lt" && !(val < target)) return false;
        if (customerFilterOp === "gte" && !(val >= target)) return false;
        if (customerFilterOp === "lte" && !(val <= target)) return false;
        if (customerFilterOp === "equals" && val !== target) return false;
        if (customerFilterOp === "between") {
          const max = Number(customerFilterValMax) || 0;
          if (val < target || val > max) return false;
        }
      } else {
        const text = String(c[customerFilterColumn] || "").toLowerCase();
        const target = customerFilterVal.toLowerCase().trim();
        if (customerFilterOp === "contains" && !text.includes(target)) return false;
        if (customerFilterOp === "starts_with" && !text.startsWith(target)) return false;
        if (customerFilterOp === "ends_with" && !text.endsWith(target)) return false;
        if (customerFilterOp === "equals" && text !== target) return false;
      }
    }

    return true;
  });

  // Sort list
  const sortedCustomers = customerSortColumn
    ? [...filteredCustomers].sort((a, b) => {
        if (
          customerSortColumn === "customer_name" ||
          customerSortColumn === "customer_address" ||
          customerSortColumn === "customer_mobile_number"
        ) {
          const textA = String(a[customerSortColumn] || "");
          const textB = String(b[customerSortColumn] || "");
          const cmp = textA.localeCompare(textB);
          return customerSortDirection === "asc" ? cmp : -cmp;
        }
        const numA = Number(a[customerSortColumn]) || 0;
        const numB = Number(b[customerSortColumn]) || 0;
        return customerSortDirection === "asc" ? numA - numB : numB - numA;
      })
    : filteredCustomers;

  // Pagination slice
  const totalPages = Math.ceil(sortedCustomers.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedCustomers = sortedCustomers.slice(startIndex, startIndex + entriesPerPage);

  // Format amount: whole or 0 without decimals, else up to 2 decimals
  const formatAmount = (val: number | string | undefined, forceDecimals = true) => {
    const num = Number(val) || 0;
    if (num === 0) return "0";
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
            <p>Loading customer accounts &amp; ledger records...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={loadCustomers}>
              Retry
            </button>
          </div>
        ) : (
          <div className="tab-content-container">
            <div className="flex-register-card glass-panel">
              {/* Header Row: Title & + Add Customer Button */}
              <div className="flex-card-header">
                <div>
                  <h2 className="section-title">Customer &amp; Dealer Accounts</h2>
                  <p className="section-subtitle">Registered clients, advertising agencies, and local print shops</p>
                </div>
                <button type="button" className="add-flex-btn" onClick={handleOpenAdd}>
                  <span className="add-plus">+</span>
                  <span>Add Customer</span>
                </button>
              </div>

              {/* Controls Row: Show entries (Left) & Search with Filter in right corner (Right) */}
              <div className="table-controls-row">
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
                    <option value={5}>5</option>
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
                      id="customer-search"
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={
                        hasActiveFilter
                          ? `Filtered (${filteredCustomers.length} clients)...`
                          : "Search customers..."
                      }
                      className="table-search-input"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setCustomerSearch("")}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}

                    {/* Filter button in the right corner */}
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
                      {customerSearch.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Search:</span> &ldquo;{customerSearch.trim()}&rdquo;
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => setCustomerSearch("")}
                            title="Clear search query"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {customerFilterColumn !== "all" && customerFilterVal.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Filter:</span> {getFilterSummaryText()}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setCustomerFilterColumn("all");
                              setCustomerFilterVal("");
                              setCustomerFilterValMax("");
                            }}
                            title="Clear column filter"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {customerSortColumn !== null && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Sort:</span>{" "}
                          {customerSortColumn === "customer_name"
                            ? `Customer Name (${customerSortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : customerSortColumn === "customer_address"
                            ? `City (${customerSortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : customerSortColumn === "total_sales"
                            ? `Sales (${customerSortDirection === "asc" ? "Low → High" : "High → Low"})`
                            : customerSortColumn === "total_credit"
                            ? `Credit (${customerSortDirection === "asc" ? "Low → High" : "High → Low"})`
                            : `Balance (${customerSortDirection === "asc" ? "Low → High" : "High → Low"})`}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setCustomerSortColumn(null);
                              setCustomerSortDirection("asc");
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

                  {/* Filter & Sort Popover Dropdown */}
                  {isFilterDropdownOpen && (
                    <div className="filter-popover-dropdown">
                      <div className="filter-popover-header">
                        <span className="popover-title">⚙ Filter &amp; Sort Customers</span>
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
                          value={customerFilterColumn}
                          onChange={(e) => {
                            const val = e.target.value as CustomerFilterColumn;
                            setCustomerFilterColumn(val);
                            if (
                              val === "total_sales" ||
                              val === "total_credit" ||
                              val === "balance_amount"
                            ) {
                              setCustomerFilterOp("gt");
                            } else {
                              setCustomerFilterOp("contains");
                            }
                          }}
                          className="popover-select"
                        >
                          <option value="all">All Columns</option>
                          <option value="customer_name">Customer Name (Text)</option>
                          <option value="customer_address">City / Address (Text)</option>
                          <option value="customer_mobile_number">Mobile Number (Text)</option>
                          <option value="customer_mail_id">Mail ID (Text)</option>
                          <option value="customer_gst_number">GST Number (Text)</option>
                          <option value="total_sales">Total Sales Amount (₹)</option>
                          <option value="total_credit">Total Credit Amount (₹)</option>
                          <option value="balance_amount">Balance Amount (₹)</option>
                        </select>
                      </div>

                      {/* 2. Condition / Operator */}
                      {customerFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Condition / Match:</label>
                          <select
                            value={customerFilterOp}
                            onChange={(e) => setCustomerFilterOp(e.target.value as FilterOperator)}
                            className="popover-select"
                          >
                            {customerFilterColumn === "total_sales" ||
                            customerFilterColumn === "total_credit" ||
                            customerFilterColumn === "balance_amount" ? (
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
                      {customerFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Filter Value:</label>
                          {customerFilterOp === "between" ? (
                            <div className="between-inputs-box">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Min"
                                value={customerFilterVal}
                                onChange={(e) => setCustomerFilterVal(e.target.value)}
                                className="popover-input"
                              />
                              <span className="between-dash">–</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Max"
                                value={customerFilterValMax}
                                onChange={(e) => setCustomerFilterValMax(e.target.value)}
                                className="popover-input"
                              />
                            </div>
                          ) : (
                            <input
                              type={
                                customerFilterColumn === "total_sales" ||
                                customerFilterColumn === "total_credit" ||
                                customerFilterColumn === "balance_amount"
                                  ? "number"
                                  : "text"
                              }
                              step={
                                customerFilterColumn === "total_sales" ||
                                customerFilterColumn === "total_credit" ||
                                customerFilterColumn === "balance_amount"
                                  ? "0.01"
                                  : undefined
                              }
                              placeholder="Enter value..."
                              value={customerFilterVal}
                              onChange={(e) => setCustomerFilterVal(e.target.value)}
                              className="popover-input"
                            />
                          )}
                        </div>
                      )}

                      <div className="popover-divider" />

                      {/* 4. Quick Sort Options */}
                      <div className="popover-field-group">
                        <label className="popover-field-label">Quick Sort By:</label>
                        <div className="popover-sort-buttons">
                          <button
                            type="button"
                            className={`popover-sort-btn ${customerSortColumn === "customer_name" && customerSortDirection === "asc" ? "active" : ""}`}
                            onClick={() => {
                              setCustomerSortColumn("customer_name");
                              setCustomerSortDirection("asc");
                            }}
                          >
                            🔤 Name: A → Z (Asc)
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${customerSortColumn === "customer_name" && customerSortDirection === "desc" ? "active" : ""}`}
                            onClick={() => {
                              setCustomerSortColumn("customer_name");
                              setCustomerSortDirection("desc");
                            }}
                          >
                            🔤 Name: Z → A (Desc)
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${customerSortColumn === "balance_amount" && customerSortDirection === "desc" ? "active" : ""}`}
                            onClick={() => {
                              setCustomerSortColumn("balance_amount");
                              setCustomerSortDirection("desc");
                            }}
                          >
                            ₹ Balance: High → Low
                          </button>
                          <button
                            type="button"
                            className={`popover-sort-btn ${customerSortColumn === "total_sales" && customerSortDirection === "desc" ? "active" : ""}`}
                            onClick={() => {
                              setCustomerSortColumn("total_sales");
                              setCustomerSortDirection("desc");
                            }}
                          >
                            ₹ Sales: High → Low
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

              {/* Table matching Customer format (Customer Name | Contacts | Action | Accountancy) */}
              <div className="table-responsive-container">
                <table className="flex-data-table customer-data-table">
                  <thead>
                    <tr>
                      {/* 1. Sortable: Customer Name */}
                      <th
                        className={`sortable-th ${customerSortColumn === "customer_name" ? "active-sort" : ""}`}
                        title="Click to sort by Customer Name (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleCustomerSort("customer_name")}>
                          <span className="th-label">Customer Name</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "customer_name" && customerSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "customer_name" && customerSortDirection === "asc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("customer_name");
                                  setCustomerSortDirection("asc");
                                }
                              }}
                              title="Sort Customer Name: A to Z"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "customer_name" && customerSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "customer_name" && customerSortDirection === "desc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("customer_name");
                                  setCustomerSortDirection("desc");
                                }
                              }}
                              title="Sort Customer Name: Z to A"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 2. Sortable: Contacts (by City) */}
                      <th
                        className={`sortable-th ${customerSortColumn === "customer_address" ? "active-sort" : ""}`}
                        title="Click to sort by City (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleCustomerSort("customer_address")}>
                          <span className="th-label">Contacts</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "customer_address" && customerSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "customer_address" && customerSortDirection === "asc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("customer_address");
                                  setCustomerSortDirection("asc");
                                }
                              }}
                              title="Sort Contacts by City: A to Z"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "customer_address" && customerSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "customer_address" && customerSortDirection === "desc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("customer_address");
                                  setCustomerSortDirection("desc");
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
                        className={`sortable-th ${customerSortColumn === "balance_amount" ? "active-sort" : ""}`}
                        title="Click to sort by Balance Amount (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleCustomerSort("balance_amount")}>
                          <span className="th-label">Accountancy</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "balance_amount" && customerSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "balance_amount" && customerSortDirection === "asc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("balance_amount");
                                  setCustomerSortDirection("asc");
                                }
                              }}
                              title="Sort Balance: Low to High"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${customerSortColumn === "balance_amount" && customerSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customerSortColumn === "balance_amount" && customerSortDirection === "desc") {
                                  setCustomerSortColumn(null);
                                } else {
                                  setCustomerSortColumn("balance_amount");
                                  setCustomerSortDirection("desc");
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
                    {paginatedCustomers.length > 0 ? (
                      paginatedCustomers.map((c) => (
                        <tr key={c.customer_id}>
                          {/* Column 1: Customer Name */}
                          <td className="td-customer-name">
                            <span className="customer-title-text">{c.customer_name}</span>
                          </td>

                          {/* Column 2: Contacts */}
                          <td className="td-contacts">
                            <div className="contact-list">
                              <div className="contact-item">
                                <span className="contact-symbol">👤</span>
                                <span className="contact-data-text">{c.customer_address || "—"}</span>
                              </div>
                              <div className="contact-item">
                                <span className="contact-symbol">📞</span>
                                <span className="contact-data-text">{c.customer_mobile_number || "—"}</span>
                              </div>
                              <div className="contact-item">
                                <span className="contact-symbol">✉</span>
                                <span className="contact-data-text">{c.customer_mail_id || "—"}</span>
                              </div>
                              {c.customer_gst_number ? (
                                <div className="contact-item">
                                  <span className="contact-symbol">🪪</span>
                                  <span className="contact-data-text font-mono">{c.customer_gst_number}</span>
                                </div>
                              ) : c.customer_password ? (
                                <div className="contact-item">
                                  <span className="contact-symbol">🔑</span>
                                  <span className="contact-data-text font-mono text-muted">{c.customer_password}</span>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Column 3: Action (3 symbol buttons) */}
                          <td className="td-action">
                            <div className="action-btn-group">
                              {/* Edit Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Customer Details"
                              >
                                <img src="/icons/btn_edit.png" alt="Edit" className="action-icon-img" />
                              </button>
                              {/* Rupee Button: Navigates to /admin/customer/payment?cid=... */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => router.push(`/admin/customer/payment?cid=${c.customer_id}`)}
                                title="Customer Accountancy & Payment Ledger"
                              >
                                <img src="/icons/btn_rupee.png" alt="Ledger" className="action-icon-img" />
                              </button>
                              {/* Delete Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleDelete(c.customer_id, c.customer_name)}
                                title="Deactivate Customer"
                              >
                                <img src="/icons/btn_delete.png" alt="Delete" className="action-icon-img" />
                              </button>
                            </div>
                          </td>

                          {/* Column 4: Accountancy (Yellow/Green/Red 3-tier matching customer_view.php) */}
                          <td className="td-accountancy">
                            <div className="accountancy-stack">
                              {/* Row 1: Total Sales Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-sales">Total Sales Amount</span>
                                <span className="acc-amount-val">{formatAmount(c.total_sales, true)}</span>
                              </div>
                              {/* Row 2: Total Credit Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-credit">Total Credit Amount</span>
                                <span className="acc-amount-val">{formatAmount(c.total_credit, true)}</span>
                              </div>
                              {/* Row 3: Balance Amount */}
                              <div className="accountancy-line">
                                <span className="acc-badge badge-balance">Balance Amount</span>
                                <span className="acc-amount-val">{formatAmount(c.balance_amount, false)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          No matching customer records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Showing entries & Pagination */}
              <div className="table-footer-row">
                <div className="footer-info">
                  Showing {sortedCustomers.length === 0 ? 0 : startIndex + 1} to{" "}
                  {Math.min(startIndex + entriesPerPage, sortedCustomers.length)} of {sortedCustomers.length} entries
                  {sortedCustomers.length !== customers.length && (
                    <span> (filtered from {customers.length} total entries)</span>
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
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
        )}
      </main>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel">
            <div className="modal-header">
              <h3>{editingCustomerId ? "Edit Customer Details" : "Register New Customer"}</h3>
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
                <label htmlFor="cust-name">Customer / Business Name *</label>
                <input
                  id="cust-name"
                  type="text"
                  required
                  placeholder="e.g. AMIRTHA PRINTERS"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="cust-mobile">Mobile Number</label>
                  <input
                    id="cust-mobile"
                    type="tel"
                    placeholder="e.g. 9159329221"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="cust-email">Email Address</label>
                  <input
                    id="cust-email"
                    type="email"
                    placeholder="e.g. amirthaprinters22@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="cust-address">City / Address</label>
                  <input
                    id="cust-address"
                    type="text"
                    placeholder="e.g. Gandhi Road, Palani"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="cust-gst">GST Number</label>
                  <input
                    id="cust-gst"
                    type="text"
                    placeholder="e.g. 33AABCU9603R1ZM"
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                  />
                </div>
              </div>

              <div className="m-form-group">
                <label htmlFor="cust-password">Account Portal Password</label>
                <input
                  id="cust-password"
                  type="text"
                  placeholder="Default: 123456"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
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
                  {formSaving ? "Saving..." : editingCustomerId ? "Update Customer" : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accountancy Statement Modal (₹ button) */}
      {isBillingModalOpen && selectedCustomerForBilling && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel accountancy-modal-card">
            <div className="modal-header">
              <div>
                <h3>Customer Accountancy Statement</h3>
                <p className="modal-subtitle">{selectedCustomerForBilling.customer_name}</p>
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
              <div className="billing-stat-box box-sales">
                <span className="stat-label">Total Sales Amount</span>
                <span className="stat-value">₹{formatAmount(selectedCustomerForBilling.total_sales, true)}</span>
              </div>
              <div className="billing-stat-box box-credit">
                <span className="stat-label">Total Credit Amount</span>
                <span className="stat-value">₹{formatAmount(selectedCustomerForBilling.total_credit, true)}</span>
              </div>
              <div className="billing-stat-box box-balance">
                <span className="stat-label">Net Balance Amount</span>
                <span className="stat-value">₹{formatAmount(selectedCustomerForBilling.balance_amount, false)}</span>
              </div>
            </div>

            <div className="customer-contact-summary-box">
              <p><strong>City / Address:</strong> {selectedCustomerForBilling.customer_address || "—"}</p>
              <p><strong>Mobile:</strong> {selectedCustomerForBilling.customer_mobile_number || "—"}</p>
              <p><strong>Email:</strong> {selectedCustomerForBilling.customer_mail_id || "—"}</p>
              <p><strong>GST Number:</strong> {selectedCustomerForBilling.customer_gst_number || "—"}</p>
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
          max-width: 1400px;
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
          width: 130px;
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

        /* Customer specific columns */
        .td-customer-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.95rem;
          letter-spacing: 0.01em;
          width: 220px;
        }

        .customer-title-text {
          display: block;
        }

        .td-contacts {
          width: 330px;
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

        .text-muted {
          color: #64748b;
        }

        /* Action Column with 3 Square Symbol Buttons */
        .td-action {
          text-align: center;
          width: 130px;
        }

        .action-btn-group {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
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

        /* Accountancy Column matching user requirements */
        .td-accountancy {
          width: 330px;
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

        .badge-sales {
          background: #f59e0b; /* Yellow/Amber */
        }

        .badge-credit {
          background: #16a34a; /* Green */
        }

        .badge-balance {
          background: #dc2626; /* Red */
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

        .box-sales {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
        }

        .box-credit {
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

        .customer-contact-summary-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-size: 0.84rem;
          line-height: 1.6;
        }

        .customer-contact-summary-box p {
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
