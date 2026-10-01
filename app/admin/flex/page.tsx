"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminNav from "@/components/AdminNav";

interface FluxItem {
  flux_id: number | string;
  flux_type: string;
  flux_width: number | string;
  flux_height: number | string;
  flux_area: number | string;
  flux_amount: number | string;
  flux_status: number;
}

type FlexSortColumn = "flux_type" | "flux_width" | "flux_height" | "flux_area" | "flux_amount";
type SortDirection = "asc" | "desc";
type FlexFilterColumn = "all" | "flux_type" | "flux_width" | "flux_height" | "flux_area" | "flux_amount";
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

export default function FlexAdminPage() {
  const [fluxList, setFluxList] = useState<FluxItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [flexSearch, setFlexSearch] = useState<string>("");
  const [flexSortColumn, setFlexSortColumn] = useState<FlexSortColumn | null>(null);
  const [flexSortDirection, setFlexSortDirection] = useState<SortDirection>("asc");
  const [flexFilterColumn, setFlexFilterColumn] = useState<FlexFilterColumn>("all");
  const [flexFilterOp, setFlexFilterOp] = useState<FilterOperator>("contains");
  const [flexFilterVal, setFlexFilterVal] = useState<string>("");
  const [flexFilterValMax, setFlexFilterValMax] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State for Add / Edit Flex
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFlexId, setEditingFlexId] = useState<number | string | null>(null);
  const [flexFormType, setFlexFormType] = useState<string>("");
  const [flexFormWidth, setFlexFormWidth] = useState<string>("1.00");
  const [flexFormHeight, setFlexFormHeight] = useState<string>("1.00");
  const [flexFormArea, setFlexFormArea] = useState<string>("1.00");
  const [flexFormAmount, setFlexFormAmount] = useState<string>("0.00");
  const [flexFormSaving, setFlexFormSaving] = useState<boolean>(false);
  const [flexFormError, setFlexFormError] = useState<string | null>(null);

  // Fetch only flex data when page loads
  const loadFlexData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/flex", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load flex media records");
      setFluxList(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading flex data";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlexData();
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

  const handleFlexSort = (col: NonNullable<FlexSortColumn>) => {
    if (flexSortColumn === col) {
      if (flexSortDirection === "asc") {
        setFlexSortDirection("desc");
      } else {
        setFlexSortColumn(null);
        setFlexSortDirection("asc");
      }
    } else {
      setFlexSortColumn(col);
      setFlexSortDirection("asc");
    }
  };

  const hasActiveFilter = Boolean(
    flexSearch.trim() ||
    (flexFilterColumn !== "all" && flexFilterVal.trim()) ||
    flexSortColumn !== null
  );

  const resetAll = () => {
    setFlexSearch("");
    setFlexFilterColumn("all");
    setFlexFilterOp("contains");
    setFlexFilterVal("");
    setFlexFilterValMax("");
    setFlexSortColumn(null);
    setFlexSortDirection("asc");
    setCurrentPage(1);
    setIsFilterDropdownOpen(false);
  };

  const getFilterSummaryText = () => {
    const colName =
      flexFilterColumn === "flux_type"
        ? "Flex Type"
        : flexFilterColumn === "flux_width"
        ? "Width"
        : flexFilterColumn === "flux_height"
        ? "Height"
        : flexFilterColumn === "flux_area"
        ? "Area"
        : flexFilterColumn === "flux_amount"
        ? "Amount"
        : "Column";

    if (flexFilterOp === "between") {
      return `${colName} between ${flexFilterVal} and ${flexFilterValMax}`;
    }
    const opLabel =
      flexFilterOp === "contains"
        ? "contains"
        : flexFilterOp === "starts_with"
        ? "starts with"
        : flexFilterOp === "ends_with"
        ? "ends with"
        : flexFilterOp === "equals"
        ? "="
        : flexFilterOp === "gt"
        ? ">"
        : flexFilterOp === "lt"
        ? "<"
        : flexFilterOp === "gte"
        ? ">="
        : flexFilterOp === "lte"
        ? "<="
        : "";

    return `${colName} ${opLabel} "${flexFilterVal}"`;
  };

  // Form handlers
  const handleWidthChange = (val: string) => {
    setFlexFormWidth(val);
    const w = parseFloat(val) || 0;
    const h = parseFloat(flexFormHeight) || 0;
    setFlexFormArea((w * h).toFixed(2));
  };

  const handleHeightChange = (val: string) => {
    setFlexFormHeight(val);
    const w = parseFloat(flexFormWidth) || 0;
    const h = parseFloat(val) || 0;
    setFlexFormArea((w * h).toFixed(2));
  };

  const handleOpenAdd = () => {
    setEditingFlexId(null);
    setFlexFormType("");
    setFlexFormWidth("1.00");
    setFlexFormHeight("1.00");
    setFlexFormArea("1.00");
    setFlexFormAmount("20.00");
    setFlexFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FluxItem) => {
    setEditingFlexId(item.flux_id);
    setFlexFormType(item.flux_type);
    setFlexFormWidth(Number(item.flux_width).toFixed(2));
    setFlexFormHeight(Number(item.flux_height).toFixed(2));
    setFlexFormArea(Number(item.flux_area).toFixed(2));
    setFlexFormAmount(Number(item.flux_amount).toFixed(2));
    setFlexFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flexFormType.trim()) {
      setFlexFormError("Flex Type is required.");
      return;
    }

    setFlexFormSaving(true);
    setFlexFormError(null);

    try {
      if (editingFlexId) {
        const res = await fetch("/api/admin/flex", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingFlexId,
            flex_type: flexFormType,
            width: flexFormWidth,
            height: flexFormHeight,
            area: flexFormArea,
            amount: flexFormAmount,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to update flex item");
      } else {
        const res = await fetch("/api/admin/flex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flex_type: flexFormType,
            width: flexFormWidth,
            height: flexFormHeight,
            area: flexFormArea,
            amount: flexFormAmount,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error || "Failed to create flex item");
      }

      setIsModalOpen(false);
      await loadFlexData();
    } catch (err: unknown) {
      setFlexFormError(err instanceof Error ? err.message : "Error saving flex media");
    } finally {
      setFlexFormSaving(false);
    }
  };

  const handleDelete = async (id: number | string, typeName: string) => {
    if (!confirm(`Are you sure you want to delete "${typeName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/flex?id=${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to delete flex item");
      await loadFlexData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting flex item");
    }
  };

  // Filter items
  const filteredFlux = fluxList.filter((f) => {
    if (flexSearch.trim()) {
      const q = flexSearch.toLowerCase().trim();
      const match =
        f.flux_type.toLowerCase().includes(q) ||
        Number(f.flux_width).toFixed(2).includes(q) ||
        Number(f.flux_height).toFixed(2).includes(q) ||
        Number(f.flux_area).toFixed(2).includes(q) ||
        Number(f.flux_amount).toFixed(2).includes(q);
      if (!match) return false;
    }

    if (flexFilterColumn !== "all" && flexFilterVal.trim()) {
      if (flexFilterColumn === "flux_type") {
        const text = (f.flux_type || "").toLowerCase();
        const target = flexFilterVal.toLowerCase().trim();
        if (flexFilterOp === "contains" && !text.includes(target)) return false;
        if (flexFilterOp === "starts_with" && !text.startsWith(target)) return false;
        if (flexFilterOp === "ends_with" && !text.endsWith(target)) return false;
        if (flexFilterOp === "equals" && text !== target) return false;
      } else {
        const val = Number(f[flexFilterColumn]) || 0;
        const target = Number(flexFilterVal) || 0;
        if (flexFilterOp === "gt" && !(val > target)) return false;
        if (flexFilterOp === "lt" && !(val < target)) return false;
        if (flexFilterOp === "gte" && !(val >= target)) return false;
        if (flexFilterOp === "lte" && !(val <= target)) return false;
        if (flexFilterOp === "equals" && val !== target) return false;
        if (flexFilterOp === "between") {
          const max = Number(flexFilterValMax) || 0;
          if (val < target || val > max) return false;
        }
      }
    }

    return true;
  });

  // Sort items
  const sortedFlux = flexSortColumn
    ? [...filteredFlux].sort((a, b) => {
        if (flexSortColumn === "flux_type") {
          const cmp = a.flux_type.localeCompare(b.flux_type);
          return flexSortDirection === "asc" ? cmp : -cmp;
        }
        const valA = Number(a[flexSortColumn]) || 0;
        const valB = Number(b[flexSortColumn]) || 0;
        return flexSortDirection === "asc" ? valA - valB : valB - valA;
      })
    : filteredFlux;

  return (
    <div className="admin-app-wrapper">
      <AdminNav />

      <main className="dashboard-content-area">
        {loading ? (
          <div className="loading-card glass-panel">
            <div className="spinner"></div>
            <p>Loading flex media records...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={loadFlexData}>
              Retry
            </button>
          </div>
        ) : (
          <div className="tab-content-container">
            <div className="flex-register-card glass-panel">
              {/* Header Row: Title & + Add Flex Button */}
              <div className="flex-card-header">
                <div>
                  <h2 className="section-title">Flex Material &amp; Square Foot Pricing</h2>
                  <p className="section-subtitle">Manage wholesale square-foot rates for digital print media</p>
                </div>
                <button type="button" className="add-flex-btn" onClick={handleOpenAdd}>
                  <span className="add-plus">+</span>
                  <span>Add Flex</span>
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
                      id="flex-search"
                      type="text"
                      value={flexSearch}
                      onChange={(e) => setFlexSearch(e.target.value)}
                      placeholder={
                        hasActiveFilter
                          ? `Filtered (${filteredFlux.length} items)...`
                          : "Search table..."
                      }
                      className="table-search-input"
                    />
                    {flexSearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setFlexSearch("")}
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
                      {flexSearch.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Search:</span> &ldquo;{flexSearch.trim()}&rdquo;
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => setFlexSearch("")}
                            title="Clear search query"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {flexFilterColumn !== "all" && flexFilterVal.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Filter:</span> {getFilterSummaryText()}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setFlexFilterColumn("all");
                              setFlexFilterVal("");
                              setFlexFilterValMax("");
                            }}
                            title="Clear column filter"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {flexSortColumn !== null && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Sort:</span>{" "}
                          {flexSortColumn === "flux_type"
                            ? `Flex Type (${flexSortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : flexSortColumn === "flux_amount"
                            ? `Amount (${flexSortDirection === "asc" ? "Low → High" : "High → Low"})`
                            : flexSortColumn === "flux_area"
                            ? `Area (${flexSortDirection === "asc" ? "Small → Large" : "Large → Small"})`
                            : flexSortColumn === "flux_width"
                            ? `Width (${flexSortDirection === "asc" ? "Small → Large" : "Large → Small"})`
                            : `Height (${flexSortDirection === "asc" ? "Small → Large" : "Large → Small"})`}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setFlexSortColumn(null);
                              setFlexSortDirection("asc");
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
                        <span className="popover-title">⚙ Filter &amp; Sort Options</span>
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
                          value={flexFilterColumn}
                          onChange={(e) => {
                            const val = e.target.value as FlexFilterColumn;
                            setFlexFilterColumn(val);
                            if (val === "flux_type" || val === "all") {
                              setFlexFilterOp("contains");
                            } else {
                              setFlexFilterOp("gt");
                            }
                          }}
                          className="popover-select"
                        >
                          <option value="all">All Columns</option>
                          <option value="flux_type">Flex Type (Text)</option>
                          <option value="flux_width">Width (sqft) (Number)</option>
                          <option value="flux_height">Height (sqft) (Number)</option>
                          <option value="flux_area">Area (sqft) (Number)</option>
                          <option value="flux_amount">Amount (₹) (Number)</option>
                        </select>
                      </div>

                      {/* 2. Condition / Operator */}
                      {flexFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Condition / Match:</label>
                          <select
                            value={flexFilterOp}
                            onChange={(e) => setFlexFilterOp(e.target.value as FilterOperator)}
                            className="popover-select"
                          >
                            {flexFilterColumn === "flux_type" ? (
                              <>
                                <option value="contains">Contains</option>
                                <option value="starts_with">Starts with</option>
                                <option value="ends_with">Ends with</option>
                                <option value="equals">Exactly equals</option>
                              </>
                            ) : (
                              <>
                                <option value="gt">Greater than (&gt;)</option>
                                <option value="lt">Smaller than / Less than (&lt;)</option>
                                <option value="gte">Greater than or equal (&gt;=)</option>
                                <option value="lte">Smaller than or equal (&lt;=)</option>
                                <option value="equals">Equal to (=)</option>
                                <option value="between">Between (Min – Max)</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}

                      {/* 3. Filter Value Input */}
                      {flexFilterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Filter Value:</label>
                          {flexFilterOp === "between" ? (
                            <div className="between-inputs-box">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Min"
                                value={flexFilterVal}
                                onChange={(e) => setFlexFilterVal(e.target.value)}
                                className="popover-input"
                              />
                              <span className="between-dash">–</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Max"
                                value={flexFilterValMax}
                                onChange={(e) => setFlexFilterValMax(e.target.value)}
                                className="popover-input"
                              />
                            </div>
                          ) : (
                            <input
                              type={flexFilterColumn === "flux_type" ? "text" : "number"}
                              step={flexFilterColumn === "flux_type" ? undefined : "0.01"}
                              placeholder={
                                flexFilterColumn === "flux_type"
                                  ? "e.g. Star, Back Light, Vinyl..."
                                  : "e.g. 1.00, 20.00..."
                              }
                              value={flexFilterVal}
                              onChange={(e) => setFlexFilterVal(e.target.value)}
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
                          {(flexFilterColumn === "flux_type" || flexFilterColumn === "all") && (
                            <>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_type" && flexSortDirection === "asc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_type");
                                  setFlexSortDirection("asc");
                                }}
                              >
                                🔤 Flex Type: A → Z (Asc)
                              </button>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_type" && flexSortDirection === "desc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_type");
                                  setFlexSortDirection("desc");
                                }}
                              >
                                🔤 Flex Type: Z → A (Desc)
                              </button>
                            </>
                          )}

                          {(flexFilterColumn === "flux_amount" || flexFilterColumn === "all") && (
                            <>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_amount" && flexSortDirection === "asc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_amount");
                                  setFlexSortDirection("asc");
                                }}
                              >
                                ₹ Amount: Low → High
                              </button>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_amount" && flexSortDirection === "desc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_amount");
                                  setFlexSortDirection("desc");
                                }}
                              >
                                ₹ Amount: High → Low
                              </button>
                            </>
                          )}

                          {(flexFilterColumn === "flux_area" || flexFilterColumn === "all") && (
                            <>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_area" && flexSortDirection === "asc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_area");
                                  setFlexSortDirection("asc");
                                }}
                              >
                                📐 Area: Smallest → Largest
                              </button>
                              <button
                                type="button"
                                className={`popover-sort-btn ${flexSortColumn === "flux_area" && flexSortDirection === "desc" ? "active" : ""}`}
                                onClick={() => {
                                  setFlexSortColumn("flux_area");
                                  setFlexSortDirection("desc");
                                }}
                              >
                                📐 Area: Largest → Smallest
                              </button>
                            </>
                          )}
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

              {/* Table matching flexregister.php */}
              <div className="table-responsive-container">
                <table className="flex-data-table">
                  <thead>
                    <tr>
                      {/* 1. Sortable: Flex Type */}
                      <th
                        className={`sortable-th ${flexSortColumn === "flux_type" ? "active-sort" : ""}`}
                        title="Click to sort by Flex Type (click again to remove sort)"
                      >
                        <div className="th-flex-box" onClick={() => handleFlexSort("flux_type")}>
                          <span className="th-label">Flex Type</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_type" && flexSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_type" && flexSortDirection === "asc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_type");
                                  setFlexSortDirection("asc");
                                }
                              }}
                              title="Sort Flex Type: A to Z"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_type" && flexSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_type" && flexSortDirection === "desc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_type");
                                  setFlexSortDirection("desc");
                                }
                              }}
                              title="Sort Flex Type: Z to A"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 2. Sortable: Width */}
                      <th
                        className={`sortable-th ${flexSortColumn === "flux_width" ? "active-sort" : ""}`}
                        title="Click to sort by Width"
                      >
                        <div className="th-flex-box" onClick={() => handleFlexSort("flux_width")}>
                          <span className="th-label">Width (sqft)</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_width" && flexSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_width" && flexSortDirection === "asc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_width");
                                  setFlexSortDirection("asc");
                                }
                              }}
                              title="Sort Width: Smallest to Largest"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_width" && flexSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_width" && flexSortDirection === "desc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_width");
                                  setFlexSortDirection("desc");
                                }
                              }}
                              title="Sort Width: Largest to Smallest"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 3. Sortable: Height */}
                      <th
                        className={`sortable-th ${flexSortColumn === "flux_height" ? "active-sort" : ""}`}
                        title="Click to sort by Height"
                      >
                        <div className="th-flex-box" onClick={() => handleFlexSort("flux_height")}>
                          <span className="th-label">Height (sqft)</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_height" && flexSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_height" && flexSortDirection === "asc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_height");
                                  setFlexSortDirection("asc");
                                }
                              }}
                              title="Sort Height: Smallest to Largest"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_height" && flexSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_height" && flexSortDirection === "desc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_height");
                                  setFlexSortDirection("desc");
                                }
                              }}
                              title="Sort Height: Largest to Smallest"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 4. Sortable: Area */}
                      <th
                        className={`sortable-th ${flexSortColumn === "flux_area" ? "active-sort" : ""}`}
                        title="Click to sort by Area"
                      >
                        <div className="th-flex-box" onClick={() => handleFlexSort("flux_area")}>
                          <span className="th-label">Area (sqft)</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_area" && flexSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_area" && flexSortDirection === "asc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_area");
                                  setFlexSortDirection("asc");
                                }
                              }}
                              title="Sort Area: Smallest to Largest"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_area" && flexSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_area" && flexSortDirection === "desc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_area");
                                  setFlexSortDirection("desc");
                                }
                              }}
                              title="Sort Area: Largest to Smallest"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 5. Sortable: Amount */}
                      <th
                        className={`sortable-th ${flexSortColumn === "flux_amount" ? "active-sort" : ""}`}
                        title="Click to sort by Amount"
                      >
                        <div className="th-flex-box" onClick={() => handleFlexSort("flux_amount")}>
                          <span className="th-label">Amount</span>
                          <div className="sort-arrows-group">
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_amount" && flexSortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_amount" && flexSortDirection === "asc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_amount");
                                  setFlexSortDirection("asc");
                                }
                              }}
                              title="Sort Amount: Low to High"
                            >
                              ▲
                            </span>
                            <span
                              className={`sort-arrow-icon ${flexSortColumn === "flux_amount" && flexSortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (flexSortColumn === "flux_amount" && flexSortDirection === "desc") {
                                  setFlexSortColumn(null);
                                } else {
                                  setFlexSortColumn("flux_amount");
                                  setFlexSortDirection("desc");
                                }
                              }}
                              title="Sort Amount: High to Low"
                            >
                              ▼
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* 6. Action: strictly NOT sortable */}
                      <th className="th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFlux.length > 0 ? (
                      sortedFlux.map((item) => (
                        <tr key={item.flux_id}>
                          <td className="td-flex-type">{item.flux_type}</td>
                          <td>{Number(item.flux_width).toFixed(2)}</td>
                          <td>{Number(item.flux_height).toFixed(2)}</td>
                          <td>{Number(item.flux_area).toFixed(2)}</td>
                          <td className="td-amount">{Number(item.flux_amount).toFixed(2)}</td>
                          <td className="td-action">
                            {/* Action Box with Symbols Only (No words) */}
                            <div className="action-btn-group">
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit Flex Rate"
                              >
                                <img src="/icons/btn_edit.png" alt="Edit" className="action-icon-img" />
                              </button>
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleDelete(item.flux_id, item.flux_type)}
                                title="Delete Flex Media"
                              >
                                <img src="/icons/btn_delete.png" alt="Delete" className="action-icon-img" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="empty-table-cell">
                          No matching flex media records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Showing entries & Pagination */}
              <div className="table-footer-row">
                <div className="footer-info">
                  Showing 1 to {sortedFlux.length} of {fluxList.length} entries
                  {sortedFlux.length !== fluxList.length && (
                    <span> (filtered from {fluxList.length} total entries)</span>
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

      {/* Add / Edit Flex Media Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card glass-panel">
            <div className="modal-header">
              <h3>{editingFlexId ? "Edit Flex Rate" : "Add Flex Media"}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {flexFormError && <div className="modal-error-banner">{flexFormError}</div>}

            <form onSubmit={handleSave} className="modal-form">
              <div className="m-form-group">
                <label htmlFor="mf-type">Flex Type Name *</label>
                <input
                  id="mf-type"
                  type="text"
                  required
                  placeholder="e.g. Back Light, Star Flex, Vinyl..."
                  value={flexFormType}
                  onChange={(e) => setFlexFormType(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="mf-width">Width (sqft)</label>
                  <input
                    id="mf-width"
                    type="number"
                    step="0.01"
                    required
                    value={flexFormWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="mf-height">Height (sqft)</label>
                  <input
                    id="mf-height"
                    type="number"
                    step="0.01"
                    required
                    value={flexFormHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="m-form-group">
                  <label htmlFor="mf-area">Area (sqft)</label>
                  <input
                    id="mf-area"
                    type="number"
                    step="0.01"
                    readOnly
                    className="readonly-input"
                    value={flexFormArea}
                  />
                </div>
                <div className="m-form-group">
                  <label htmlFor="mf-amount">Amount (₹)</label>
                  <input
                    id="mf-amount"
                    type="number"
                    step="0.01"
                    required
                    value={flexFormAmount}
                    onChange={(e) => setFlexFormAmount(e.target.value)}
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
                <button type="submit" className="modal-submit-btn" disabled={flexFormSaving}>
                  {flexFormSaving ? "Saving..." : editingFlexId ? "Update Rate" : "Add Flex"}
                </button>
              </div>
            </form>
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
          width: 100px;
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
          padding: 0.75rem 0.85rem;
          color: #1e293b;
        }

        .td-flex-type {
          font-weight: 700;
          color: #0f172a;
        }

        .td-amount {
          font-weight: 800;
          color: #0369a1;
        }

        .td-action {
          text-align: center;
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

        /* Modal */
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
          max-width: 480px;
          padding: 1.5rem;
          border-radius: 14px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .readonly-input {
          background: #f1f5f9;
          cursor: not-allowed;
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
