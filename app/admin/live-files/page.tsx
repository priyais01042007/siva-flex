"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminNav from "@/components/AdminNav";
import StatusBadge from "@/components/StatusBadge";

interface LiveFileItem {
  customer_billing_id: number;
  customer_billing_customer_id: number;
  customer_name: string;
  customer_address?: string;
  customer_mobile_number?: string;
  customer_mail_id?: string;
  customer_gst_number?: string;
  customer_billing_file_register_time: string;
  customer_billing_file_type: string | number;
  flux_type: string;
  customer_billing_file_name: string;
  customer_billing_file_path: string;
  customer_billing_file_download_path: string;
  customer_billing_file_width: string | number;
  customer_billing_file_height: string | number;
  customer_billing_file_area: string | number;
  customer_billing_flex_amount: string | number;
  customer_billing_file_quantity: string | number;
  customer_billing_flex_file_total_amount: string | number;
  customer_billing_file_status: number;
  status_label?: string;
}

type SortDirection = "asc" | "desc";
type LiveFileSortColumn =
  | "customer_name"
  | "customer_billing_file_register_time"
  | "flux_type"
  | "customer_billing_file_name"
  | "customer_billing_file_status"
  | null;

type LiveFileFilterColumn =
  | "all"
  | "customer_name"
  | "customer_billing_file_register_time"
  | "flux_type"
  | "customer_billing_file_name"
  | "customer_billing_file_status";

type FilterOperator =
  | "contains"
  | "starts_with"
  | "ends_with"
  | "equals";

export default function LiveFilesAdminPage() {
  const [liveFiles, setLiveFiles] = useState<LiveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search, Filter, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<LiveFileSortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterColumn, setFilterColumn] = useState<LiveFileFilterColumn>("all");
  const [filterOp, setFilterOp] = useState<FilterOperator>("contains");
  const [filterVal, setFilterVal] = useState<string>("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail Modal & Dimension Editing
  const [selectedFile, setSelectedFile] = useState<LiveFileItem | null>(null);
  const [editWidth, setEditWidth] = useState<string>("");
  const [editHeight, setEditHeight] = useState<string>("");
  const [editRate, setEditRate] = useState<string>("");
  const [savingDims, setSavingDims] = useState<boolean>(false);

  const loadLiveFiles = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/admin/live-files", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load live production files");
      setLiveFiles(json.data || []);
    } catch (err: unknown) {
      if (!silent) {
        setErrorMsg(err instanceof Error ? err.message : "Error loading live files");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveFiles();
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

  const handleSort = (col: NonNullable<LiveFileSortColumn>) => {
    if (sortColumn === col) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const hasActiveFilter = Boolean(
    searchQuery.trim() ||
    (filterColumn !== "all" && filterVal.trim()) ||
    sortColumn !== null
  );

  const resetAll = () => {
    setSearchQuery("");
    setFilterColumn("all");
    setFilterOp("contains");
    setFilterVal("");
    setSortColumn(null);
    setSortDirection("asc");
    setCurrentPage(1);
    setIsFilterDropdownOpen(false);
  };

  const downloadOriginalFile = async (filePath: string, fileName?: string) => {
    if (!filePath) return;
    try {
      const res = await fetch(
        `/api/storage/signed-url?path=${encodeURIComponent(filePath)}&adminId=1&download=true`
      );
      const data = await res.json();
      const targetUrl =
        data.signedUrl ||
        `/api/storage/file?path=${encodeURIComponent(filePath)}&adminId=1&download=true&name=${encodeURIComponent(fileName || "artwork")}`;
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = fileName || "artwork";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(
        `/api/storage/file?path=${encodeURIComponent(filePath)}&adminId=1&download=true`,
        "_blank"
      );
    }
  };

  const [dimSavedNotice, setDimSavedNotice] = useState(false);

  // Status updates
  const handleUpdateStatus = async (
    id: number,
    newStatus: number,
    statusLabel: string,
    filePath?: string,
    fileName?: string
  ) => {
    // Ask once before printing or delivering
    if (newStatus === 2) {
      if (!confirm(`Are you sure you want to start printing job #${id}?`)) {
        return;
      }
      if (filePath) {
        downloadOriginalFile(filePath, fileName);
      }
    } else if (newStatus === 4) {
      if (!confirm(`Are you sure you want to mark job #${id} as Delivered?`)) {
        return;
      }
    } else {
      if (!confirm(`Update job #${id} status to "${statusLabel}"?`)) {
        return;
      }
    }

    // If delivered (status 4), immediately vanish the row from view in 0ms!
    if (newStatus === 4) {
      setLiveFiles((prev) => prev.filter((f) => f.customer_billing_id !== id));
      if (selectedFile?.customer_billing_id === id) {
        setSelectedFile(null);
      }
    } else {
      // Optimistically update status in place
      setLiveFiles((prev) =>
        prev.map((f) =>
          f.customer_billing_id === id ? { ...f, customer_billing_file_status: newStatus } : f
        )
      );
      if (selectedFile?.customer_billing_id === id) {
        setSelectedFile((prev) => (prev ? { ...prev, customer_billing_file_status: newStatus } : null));
      }
    }

    try {
      const res = await fetch("/api/admin/live-files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");
      // Silently sync in background without page reload
      loadLiveFiles(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating status");
      loadLiveFiles(true);
    }
  };

  const handleDeleteJob = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to cancel/delete job "${name}"?`)) {
      return;
    }

    // Optimistically remove row from list immediately
    setLiveFiles((prev) => prev.filter((f) => f.customer_billing_id !== id));
    if (selectedFile?.customer_billing_id === id) {
      setSelectedFile(null);
    }

    try {
      const res = await fetch(`/api/admin/live-files?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete job");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting job");
      loadLiveFiles(true);
    }
  };

  const handleOpenDetailModal = (f: LiveFileItem) => {
    setSelectedFile(f);
    setEditWidth(String(f.customer_billing_file_width || "0"));
    setEditHeight(String(f.customer_billing_file_height || "0"));
    setEditRate(String(f.customer_billing_flex_amount || "0"));
    setDimSavedNotice(false);
  };

  const handleConvertToFeet = () => {
    const w = parseFloat(editWidth) || 0;
    const h = parseFloat(editHeight) || 0;
    if (w > 0) {
      setEditWidth((w / 12).toFixed(2));
    }
    if (h > 0) {
      setEditHeight((h / 12).toFixed(2));
    }
  };

  const handleSaveDimensions = async () => {
    if (!selectedFile) return;
    setSavingDims(true);
    try {
      const w = parseFloat(editWidth) || 0;
      const h = parseFloat(editHeight) || 0;
      const rate = parseFloat(editRate) || 0;
      const area = Number((w * h).toFixed(2));
      const total = Number((area * rate).toFixed(2));

      // Update state in-place without page reload
      setLiveFiles((prev) =>
        prev.map((f) =>
          f.customer_billing_id === selectedFile.customer_billing_id
            ? {
                ...f,
                customer_billing_file_width: w.toFixed(1),
                customer_billing_file_height: h.toFixed(1),
                customer_billing_file_area: area.toFixed(1),
                customer_billing_flex_amount: rate.toFixed(2),
                customer_billing_flex_file_total_amount: total.toFixed(2),
              }
            : f
        )
      );

      setSelectedFile((prev) =>
        prev
          ? {
              ...prev,
              customer_billing_file_width: w.toFixed(1),
              customer_billing_file_height: h.toFixed(1),
              customer_billing_file_area: area.toFixed(1),
              customer_billing_flex_amount: rate.toFixed(2),
              customer_billing_flex_file_total_amount: total.toFixed(2),
            }
          : null
      );

      const res = await fetch("/api/admin/live-files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedFile.customer_billing_id,
          width: editWidth,
          height: editHeight,
          flexAmount: editRate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update dimensions");

      setDimSavedNotice(true);
      setTimeout(() => setDimSavedNotice(false), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving dimensions");
    } finally {
      setSavingDims(false);
    }
  };

  // Filter files
  const filteredFiles = liveFiles.filter((f) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        (f.customer_name || "").toLowerCase().includes(q) ||
        (f.customer_billing_file_register_time || "").toLowerCase().includes(q) ||
        (f.flux_type || "").toLowerCase().includes(q) ||
        (f.customer_billing_file_name || "").toLowerCase().includes(q) ||
        String(f.customer_billing_id).includes(q);
      if (!match) return false;
    }

    if (filterColumn !== "all" && filterVal.trim()) {
      const text = String(f[filterColumn] || "").toLowerCase();
      const target = filterVal.toLowerCase().trim();
      if (filterOp === "contains" && !text.includes(target)) return false;
      if (filterOp === "starts_with" && !text.startsWith(target)) return false;
      if (filterOp === "ends_with" && !text.endsWith(target)) return false;
      if (filterOp === "equals" && text !== target) return false;
    }

    return true;
  });

  // Sort files
  const sortedFiles = sortColumn
    ? [...filteredFiles].sort((a, b) => {
        const textA = String(a[sortColumn] || "");
        const textB = String(b[sortColumn] || "");
        const cmp = textA.localeCompare(textB);
        return sortDirection === "asc" ? cmp : -cmp;
      })
    : filteredFiles;

  // Pagination slice
  const totalPages = Math.ceil(sortedFiles.length / entriesPerPage) || 1;
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedFiles = sortedFiles.slice(startIndex, startIndex + entriesPerPage);



  return (
    <div className="admin-app-wrapper">
      <AdminNav />

      <main className="dashboard-content-area">
        {loading ? (
          <div className="loading-card glass-panel">
            <div className="spinner"></div>
            <p>Loading live production queue...</p>
          </div>
        ) : errorMsg ? (
          <div className="error-card glass-panel">
            <p className="err-txt">⚠ {errorMsg}</p>
            <button type="button" className="retry-btn" onClick={() => loadLiveFiles()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="tab-content-container">
            <div className="flex-register-card glass-panel">
              {/* Header Row: Title */}
              <div className="flex-card-header">
                <div>
                  <h2 className="section-title">Live Print Queue &amp; Production Files</h2>
                  <p className="section-subtitle">Active print jobs in production (Delivered files excluded)</p>
                </div>
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
                      id="live-files-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={
                        hasActiveFilter
                          ? `Filtered (${filteredFiles.length} files)...`
                          : "Search live files..."
                      }
                      className="table-search-input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchQuery("")}
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
                      {searchQuery.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Search:</span> &ldquo;{searchQuery.trim()}&rdquo;
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => setSearchQuery("")}
                            title="Clear search query"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {filterColumn !== "all" && filterVal.trim() && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Filter:</span> &ldquo;{filterVal}&rdquo;
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setFilterColumn("all");
                              setFilterVal("");
                            }}
                            title="Clear column filter"
                          >
                            ✕
                          </button>
                        </span>
                      )}

                      {sortColumn !== null && (
                        <span className="active-filter-chip">
                          <span className="chip-key">Sort:</span>{" "}
                          {sortColumn === "customer_name"
                            ? `Customer (${sortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : sortColumn === "customer_billing_file_register_time"
                            ? `Date (${sortDirection === "asc" ? "Oldest" : "Newest"})`
                            : sortColumn === "flux_type"
                            ? `Flex Type (${sortDirection === "asc" ? "A → Z" : "Z → A"})`
                            : `Flex Name (${sortDirection === "asc" ? "A → Z" : "Z → A"})`}
                          <button
                            type="button"
                            className="chip-remove-btn"
                            onClick={() => {
                              setSortColumn(null);
                              setSortDirection("asc");
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
                        <span className="popover-title">⚙ Filter Live Files</span>
                        <button
                          type="button"
                          className="popover-close-btn"
                          onClick={() => setIsFilterDropdownOpen(false)}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="popover-field-group">
                        <label className="popover-field-label">Filter Column:</label>
                        <select
                          value={filterColumn}
                          onChange={(e) => setFilterColumn(e.target.value as LiveFileFilterColumn)}
                          className="popover-select"
                        >
                          <option value="all">All Columns</option>
                          <option value="customer_name">Customer</option>
                          <option value="customer_billing_file_register_time">Date</option>
                          <option value="flux_type">Flex Type</option>
                          <option value="customer_billing_file_name">Flex Name</option>
                        </select>
                      </div>

                      {filterColumn !== "all" && (
                        <div className="popover-field-group">
                          <label className="popover-field-label">Filter Value:</label>
                          <input
                            type="text"
                            placeholder="Enter keyword..."
                            value={filterVal}
                            onChange={(e) => setFilterVal(e.target.value)}
                            className="popover-input"
                          />
                        </div>
                      )}

                      <div className="popover-divider" />

                      <div className="popover-footer">
                        <button
                          type="button"
                          className="popover-reset-btn"
                          onClick={resetAll}
                        >
                          Reset All ↺
                        </button>
                        <button
                          type="button"
                          className="popover-done-btn"
                          onClick={() => setIsFilterDropdownOpen(false)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table matching user requirement: Customer | Date | Flex Type | Flex Name | File | Status | Action */}
              <div className="table-responsive-container">
                <table className="flex-data-table live-files-data-table">
                  <thead>
                    <tr>
                      {/* 1. Customer */}
                      <th
                        className={`sortable-th ${sortColumn === "customer_name" ? "active-sort" : ""}`}
                        onClick={() => handleSort("customer_name")}
                      >
                        <div className="th-flex-box">
                          <span className="th-label">Customer</span>
                          <div className="sort-arrows-group">
                            <span className={`sort-arrow-icon ${sortColumn === "customer_name" && sortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}>▲</span>
                            <span className={`sort-arrow-icon ${sortColumn === "customer_name" && sortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}>▼</span>
                          </div>
                        </div>
                      </th>

                      {/* 2. Date */}
                      <th
                        className={`sortable-th ${sortColumn === "customer_billing_file_register_time" ? "active-sort" : ""}`}
                        onClick={() => handleSort("customer_billing_file_register_time")}
                      >
                        <div className="th-flex-box">
                          <span className="th-label">Date</span>
                          <div className="sort-arrows-group">
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_register_time" && sortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}>▲</span>
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_register_time" && sortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}>▼</span>
                          </div>
                        </div>
                      </th>

                      {/* 3. Flex Type */}
                      <th
                        className={`sortable-th ${sortColumn === "flux_type" ? "active-sort" : ""}`}
                        onClick={() => handleSort("flux_type")}
                      >
                        <div className="th-flex-box">
                          <span className="th-label">Flex Type</span>
                          <div className="sort-arrows-group">
                            <span className={`sort-arrow-icon ${sortColumn === "flux_type" && sortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}>▲</span>
                            <span className={`sort-arrow-icon ${sortColumn === "flux_type" && sortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}>▼</span>
                          </div>
                        </div>
                      </th>

                      {/* 4. Flex Name */}
                      <th
                        className={`sortable-th ${sortColumn === "customer_billing_file_name" ? "active-sort" : ""}`}
                        onClick={() => handleSort("customer_billing_file_name")}
                      >
                        <div className="th-flex-box">
                          <span className="th-label">Flex Name</span>
                          <div className="sort-arrows-group">
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_name" && sortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}>▲</span>
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_name" && sortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}>▼</span>
                          </div>
                        </div>
                      </th>

                      {/* 5. File */}
                      <th>File</th>

                      {/* 6. Status */}
                      <th
                        className={`sortable-th ${sortColumn === "customer_billing_file_status" ? "active-sort" : ""}`}
                        onClick={() => handleSort("customer_billing_file_status")}
                      >
                        <div className="th-flex-box">
                          <span className="th-label">Status</span>
                          <div className="sort-arrows-group">
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_status" && sortDirection === "asc" ? "arrow-active" : "arrow-inactive"}`}>▲</span>
                            <span className={`sort-arrow-icon ${sortColumn === "customer_billing_file_status" && sortDirection === "desc" ? "arrow-active" : "arrow-inactive"}`}>▼</span>
                          </div>
                        </div>
                      </th>

                      {/* 7. Action: strictly NOT sortable */}
                      <th className="th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFiles.length > 0 ? (
                      paginatedFiles.map((f) => (
                        <tr key={f.customer_billing_id}>
                          {/* 1. Customer: Name and Email only (Location, phone, and GST removed as requested) */}
                          <td className="td-customer">
                            <div className="clean-cust-card">
                              <div className="clean-cust-name">
                                <span className="clean-cust-ico">👤</span>
                                <strong>{f.customer_name}</strong>
                              </div>
                              {f.customer_mail_id && (
                                <div className="clean-cust-email">
                                  <span className="clean-cust-ico">✉</span>
                                  <span>{f.customer_mail_id}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. Date */}
                          <td className="td-date font-mono">
                            {f.customer_billing_file_register_time || "—"}
                          </td>

                          {/* 3. Flex Type */}
                          <td className="td-flex-type">
                            <span className="media-pill">{f.flux_type}</span>
                          </td>

                          {/* 4. Flex Name */}
                          <td className="td-flex-name">
                            <span className="file-name-text" title={f.customer_billing_file_name}>
                              {f.customer_billing_file_name}
                            </span>
                            <span className="dims-caption">
                              {Number(f.customer_billing_file_width).toFixed(1)} × {Number(f.customer_billing_file_height).toFixed(1)} ft ({Number(f.customer_billing_file_area).toFixed(1)} sqft)
                            </span>
                          </td>

                          {/* 5. File: Bigger artwork display (84px), NOT clickable in table */}
                          <td className="td-file">
                            {f.customer_billing_file_path ? (
                              <div className="live-file-thumb-display" title={f.customer_billing_file_name}>
                                <img
                                  src={`/api/admin/live-files/thumbnail?path=${encodeURIComponent(f.customer_billing_file_path)}`}
                                  alt={f.customer_billing_file_name}
                                  className="live-file-thumb-img"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes(f.customer_billing_file_path)) {
                                      target.src = f.customer_billing_file_path;
                                    } else {
                                      target.style.display = "none";
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="no-file-text">No File</span>
                            )}
                          </td>

                          {/* 6. Status: Non-interactive visual badge matching reference image */}
                          <td className="td-status">
                            <StatusBadge status={f.customer_billing_file_status} />
                          </td>

                          {/* 7. Action: Custom icon buttons (Print, Deliver, Edit, Delete) */}
                          <td className="td-action">
                            <div className="action-btn-group">
                              {/* If status is 1 (Queue), show button to start printing & auto-download original file */}
                              {Number(f.customer_billing_file_status) === 1 && (
                                <button
                                  type="button"
                                  className="custom-icon-btn"
                                  onClick={() =>
                                    handleUpdateStatus(
                                      f.customer_billing_id,
                                      2,
                                      "Printing",
                                      f.customer_billing_file_path,
                                      f.customer_billing_file_name
                                    )
                                  }
                                  title="Start Printing & Auto-Download Original Artwork"
                                >
                                  <img src="/icons/btn_print.png" alt="Print" className="action-icon-img" />
                                </button>
                              )}

                              {/* If status is 2 (Printing), directly show Deliver button */}
                              {Number(f.customer_billing_file_status) === 2 && (
                                <button
                                  type="button"
                                  className="custom-icon-btn"
                                  onClick={() => handleUpdateStatus(f.customer_billing_id, 4, "Delivered")}
                                  title="Mark as Delivered"
                                >
                                  <img src="/icons/btn_deliver.png" alt="Deliver" className="action-icon-img" />
                                </button>
                              )}

                              {/* Edit Button: Replaces the eye symbol */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleOpenDetailModal(f)}
                                title="Edit Dimensions & View Artwork"
                              >
                                <img src="/icons/btn_edit.png" alt="Edit" className="action-icon-img" />
                              </button>

                              {/* Delete / Cancel Button */}
                              <button
                                type="button"
                                className="custom-icon-btn"
                                onClick={() => handleDeleteJob(f.customer_billing_id, f.customer_billing_file_name)}
                                title="Cancel Production Job"
                              >
                                <img src="/icons/btn_delete.png" alt="Delete" className="action-icon-img" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="empty-table-cell">
                          No data available in table
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Showing entries & Pagination */}
              <div className="table-footer-row">
                <div className="footer-info">
                  Showing {sortedFiles.length === 0 ? 0 : startIndex + 1} to{" "}
                  {Math.min(startIndex + entriesPerPage, sortedFiles.length)} of {sortedFiles.length} entries
                  {sortedFiles.length !== liveFiles.length && (
                    <span> (filtered from {liveFiles.length} total entries)</span>
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

      {/* Production Edit & Artwork Preview Modal */}
      {selectedFile && (
        <div className="modal-backdrop" onClick={() => setSelectedFile(null)}>
          <div className="modal-card modal-card-wide glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✏ Edit Job &amp; Artwork Preview</h3>
                <p className="modal-subtitle">Job #{selectedFile.customer_billing_id} — {selectedFile.customer_billing_file_name}</p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setSelectedFile(null)}
              >
                ✕
              </button>
            </div>

            {/* Split 2-Column Body: Left = Artwork Preview & Downloads, Right = Specs & Dimension Editor */}
            <div className="modal-split-body">
              {/* Left Column: Artwork Preview & Quick Downloads */}
              <div className="modal-left-col">
                <div className="modal-preview-box">
                  {selectedFile.customer_billing_file_path ? (
                    <img
                      src={`/api/storage/file?path=${encodeURIComponent(selectedFile.customer_billing_file_path)}&adminId=1`}
                      alt={selectedFile.customer_billing_file_name}
                      className="modal-preview-img"
                    />
                  ) : (
                    <span className="no-file-text">No Artwork File</span>
                  )}
                </div>

                {selectedFile.customer_billing_file_path && (
                  <div className="modal-artwork-actions">
                    <button
                      type="button"
                      className="btn-dl-original"
                      onClick={() =>
                        downloadOriginalFile(
                          selectedFile.customer_billing_file_path,
                          selectedFile.customer_billing_file_name
                        )
                      }
                      title="Download the full resolution original artwork file"
                    >
                      💾 Download (Full Res)
                    </button>
                    <a
                      href={`/api/storage/file?path=${encodeURIComponent(selectedFile.customer_billing_file_path)}&adminId=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-open-tab"
                    >
                      ↗ Full View
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Job Specs & Dimensions Editor */}
              <div className="modal-right-col">
                <div className="job-details-grid">
                  <div className="detail-item">
                    <span className="d-label">Customer</span>
                    <span className="d-value">
                      👤 <strong>{selectedFile.customer_name}</strong>
                      {selectedFile.customer_mail_id && (
                        <div style={{ fontSize: "0.78rem", color: "#0284c7" }}>
                          ✉ {selectedFile.customer_mail_id}
                        </div>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="d-label">Registration Date</span>
                    <span className="d-value font-mono">{selectedFile.customer_billing_file_register_time}</span>
                  </div>
                  <div className="detail-item">
                    <span className="d-label">Flex Media Type</span>
                    <span className="d-value font-bold">{selectedFile.flux_type}</span>
                  </div>
                  <div className="detail-item">
                    <span className="d-label">Current Status</span>
                    <span className="d-value">
                      <StatusBadge status={selectedFile.customer_billing_file_status} />
                    </span>
                  </div>
                </div>

                {/* Manual Dimensions & Pricing Editor */}
                <div className="modal-dimensions-editor">
                  <h4 className="dim-editor-title">📐 Edit Dimensions &amp; Billing Calculation</h4>
                  <div className="dim-editor-grid">
                    <div className="dim-input-group">
                      <label>Width (ft):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editWidth}
                        onChange={(e) => setEditWidth(e.target.value)}
                        className="dim-input"
                      />
                    </div>
                    <div className="dim-input-group">
                      <label>Height (ft):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editHeight}
                        onChange={(e) => setEditHeight(e.target.value)}
                        className="dim-input"
                      />
                    </div>
                    <div className="dim-input-group">
                      <label>Rate (₹/sqft):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="dim-input"
                      />
                    </div>
                    <div className="dim-calculated-box">
                      <div className="dim-calc-line">
                        Area: <strong>{((parseFloat(editWidth) || 0) * (parseFloat(editHeight) || 0)).toFixed(2)} sqft</strong>
                      </div>
                      <div className="dim-calc-line total-highlight">
                        Total: <strong>
                          ₹{(((parseFloat(editWidth) || 0) * (parseFloat(editHeight) || 0)) * (parseFloat(editRate) || 0)).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    {dimSavedNotice ? (
                      <span className="save-dims-success-badge">
                        ✓ Dimensions &amp; Rate Saved (No reload required)
                      </span>
                    ) : <div />}
                    <div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleConvertToFeet}
                        className="btn-convert-feet"
                        title="Divide current Width & Height by 12 to convert inches to feet"
                      >
                        📏 Change to Feet (÷12)
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDimensions}
                        disabled={savingDims}
                        className="save-dims-btn"
                      >
                        {savingDims ? "Saving..." : "💾 Save Dimensions & Rate"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-btn-row">
              {/* If status is 1 (Queue), show button to start printing & download */}
              {Number(selectedFile.customer_billing_file_status) === 1 && (
                <button
                  type="button"
                  className="modal-action-btn btn-print"
                  onClick={() => {
                    handleUpdateStatus(
                      selectedFile.customer_billing_id,
                      2,
                      "Printing",
                      selectedFile.customer_billing_file_path,
                      selectedFile.customer_billing_file_name
                    );
                    setSelectedFile(null);
                  }}
                >
                  <img
                    src="/icons/btn_print.png"
                    alt="Print"
                    style={{ width: 22, height: 22, marginRight: 8, verticalAlign: "middle" }}
                  />
                  Start Printing &amp; Download
                </button>
              )}

              {/* If status is 2 (Printing), directly show Deliver button */}
              {Number(selectedFile.customer_billing_file_status) === 2 && (
                <button
                  type="button"
                  className="modal-action-btn btn-deliver"
                  onClick={() => {
                    handleUpdateStatus(selectedFile.customer_billing_id, 4, "Delivered");
                    setSelectedFile(null);
                  }}
                >
                  <img
                    src="/icons/btn_deliver.png"
                    alt="Deliver"
                    style={{ width: 22, height: 22, marginRight: 8, verticalAlign: "middle" }}
                  />
                  Mark as Delivered
                </button>
              )}

              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setSelectedFile(null)}
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

        .reset-symbol {
          font-size: 0.8rem;
        }

        .filter-popover-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 290px;
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

        .popover-divider {
          height: 1px;
          background: #f1f5f9;
        }

        .popover-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        }

        .arrow-active {
          color: #0284c7;
          font-weight: 900;
        }

        .arrow-inactive {
          color: #94a3b8;
        }

        .th-action {
          width: 140px;
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

        .td-customer {
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
        }

        .customer-name-tag {
          display: inline-block;
        }

        .td-date {
          white-space: nowrap;
          color: #475569;
          font-size: 0.82rem;
        }

        .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .media-pill {
          display: inline-block;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .td-flex-name {
          max-width: 250px;
        }

        .file-name-text {
          display: block;
          font-weight: 700;
          color: #0f172a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dims-caption {
          display: block;
          font-size: 0.76rem;
          color: #64748b;
        }

        .file-download-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .file-download-chip:hover {
          background: #e2e8f0;
          color: #0284c7;
        }

        .file-chip-icon {
          font-size: 0.85rem;
        }

        /* Customer card inside table cell: Name and Email only */
        .clean-cust-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.85rem;
        }

        .clean-cust-name {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #0f172a;
          font-weight: 700;
        }

        .clean-cust-email {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #0284c7;
          font-size: 0.78rem;
          word-break: break-all;
        }

        .clean-cust-ico {
          font-size: 0.85rem;
          opacity: 0.85;
          flex-shrink: 0;
        }

        /* Actual file thumbnail preview (Larger 82px, NOT clickable) */
        .live-file-thumb-display {
          width: 82px;
          height: 82px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 3px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          user-select: none;
        }

        .live-file-thumb-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 5px;
          display: block;
        }

        .thumb-fallback-doc {
          width: 76px;
          height: 76px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 1.3rem;
          color: #64748b;
        }

        .thumb-fallback-doc small {
          font-size: 0.65rem;
          font-weight: 600;
        }

        .no-file-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }

        .td-status {
          text-align: center;
          vertical-align: middle;
          white-space: nowrap;
        }

        /* Status Badge: Non-interactive visual pill matching reference image */
        .status-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 5px;
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.25;
          text-align: center;
          white-space: nowrap;
          user-select: none;
          letter-spacing: 0.01em;
          cursor: default;
        }

        /* 1. PENDING: Red background with white text */
        .pill-pending {
          background-color: #dc2626;
          color: #ffffff;
        }

        /* 2. PRINTING: Yellow/amber background with dark text for readability */
        .pill-printing {
          background-color: #fbbf24;
          color: #78350f;
        }

        /* 3. DELIVERED: Blue background with white text */
        .pill-delivered {
          background-color: #0284c7;
          color: #ffffff;
        }

        /* Convert to feet button in modal */
        .btn-convert-feet {
          background: #f1f5f9;
          color: #0369a1;
          border: 1.5px solid #93c5fd;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        .btn-convert-feet:hover {
          background: #e0f2fe;
          border-color: #0284c7;
          color: #0284c7;
          transform: translateY(-1px);
        }

        /* Modal Artwork Preview & Actions */
        .modal-artwork-section {
          margin-bottom: 1.25rem;
        }

        .modal-preview-box {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090d16;
          border-radius: 10px;
          padding: 1rem;
          max-height: 420px;
          overflow: hidden;
          border: 1px solid #1e293b;
        }

        .modal-preview-img {
          max-width: 100%;
          max-height: 380px;
          object-fit: contain;
          border-radius: 6px;
        }

        .modal-artwork-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.65rem;
        }

        .btn-dl-original {
          flex: 1;
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-dl-original:hover {
          background: #0369a1;
        }

        .btn-open-tab {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: background 0.15s;
        }

        .btn-open-tab:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .modal-dimensions-editor {
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 1rem 1.25rem;
          margin-top: 1rem;
        }

        .dim-editor-title {
          margin: 0 0 0.75rem 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .dim-editor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.75rem;
          align-items: flex-end;
        }

        .dim-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .dim-input-group label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
        }

        .dim-input {
          height: 36px;
          padding: 0.35rem 0.6rem;
          border: 1.5px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
          outline: none;
        }

        .dim-input:focus {
          border-color: #0284c7;
        }

        .dim-calculated-box {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.4rem 0.75rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .dim-calc-line {
          font-size: 0.78rem;
          color: #475569;
        }

        .total-highlight {
          color: #059669;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .save-dims-btn {
          background: #0284c7;
          color: #ffffff;
          border: none;
          padding: 0.45rem 1rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }

        .save-dims-btn:hover:not(:disabled) {
          background: #0369a1;
        }

        .save-dims-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status-printing {
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .status-finished {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .status-unknown {
          background: #f1f5f9;
          color: #475569;
        }

        /* Action buttons with user-provided custom PNG icons */
        .td-action {
          text-align: center;
          white-space: nowrap;
        }

        .action-btn-group {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
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
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.22));
        }

        .custom-icon-btn:active {
          transform: scale(0.92);
        }

        .action-icon-img {
          width: 34px;
          height: 34px;
          object-fit: contain;
          display: block;
        }

        .save-dims-success-badge {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
          padding: 0.32rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
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

        .modal-card-wide {
          max-width: 860px;
          width: 95%;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          padding: 1.25rem 1.4rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .modal-split-body {
          display: grid;
          grid-template-columns: 290px 1fr;
          gap: 1.25rem;
          overflow-y: auto;
          padding-right: 0.25rem;
          max-height: calc(88vh - 140px);
        }

        @media (max-width: 768px) {
          .modal-split-body {
            grid-template-columns: 1fr;
          }
        }

        .modal-left-col {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .modal-preview-box {
          height: 270px;
          width: 100%;
          background: #090d16;
          border-radius: 8px;
          border: 1.5px solid #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 0.5rem;
        }

        .modal-preview-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }

        .modal-artwork-actions {
          display: flex;
          gap: 0.5rem;
          width: 100%;
        }

        .btn-dl-original {
          flex: 1;
          background: #1e3a8a;
          color: #ffffff;
          border: 1px solid #172554;
          padding: 0.5rem 0.6rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          text-align: center;
          box-shadow: 0 2px 4px rgba(30, 58, 138, 0.25);
        }

        .btn-dl-original:hover {
          background: #2563eb;
        }

        .btn-open-tab {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: background 0.15s;
        }

        .btn-open-tab:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .modal-right-col {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.85rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.12rem;
          font-weight: 800;
          color: #0f172a;
        }

        .modal-subtitle {
          margin: 0.15rem 0 0 0;
          font-size: 0.82rem;
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

        .job-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-bottom: 0;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0.45rem 0.65rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.82rem;
        }

        .d-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .d-value {
          font-weight: 700;
          color: #0f172a;
          margin-top: 0.15rem;
        }

        .modal-btn-row {
          display: flex;
          justify-content: flex-end;
          gap: 0.65rem;
          margin-top: 0.85rem;
          padding-top: 0.65rem;
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

        .modal-action-btn {
          color: #ffffff;
          border: none;
          padding: 0.45rem 1.15rem;
          border-radius: 8px;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-print {
          background: #1e3a8a;
          border: 1px solid #172554;
        }

        .btn-print:hover {
          background: #2563eb;
        }

        .btn-deliver {
          background: #14532d;
          border: 1px solid #052e16;
        }

        .btn-deliver:hover {
          background: #16a34a;
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
