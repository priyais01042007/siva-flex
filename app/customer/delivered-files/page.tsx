"use client";

import React, { useState, useEffect, useMemo } from "react";

interface DeliveredFile {
  customer_billing_id: string;
  customer_billing_customer_id: string;
  customer_billing_file_type: string;
  flux_type: string | null;
  customer_billing_file_name: string;
  customer_billing_file_path: string;
  customer_billing_file_width: string;
  customer_billing_file_height: string;
  customer_billing_file_area: string;
  customer_billing_flex_amount: string;
  customer_billing_file_quantity: string;
  customer_billing_file_gst: string;
  customer_billing_flex_file_total_amount: string;
  customer_billing_file_register_time: string;
  customer_billing_file_printing_time: string;
  customer_billing_file_delivered_time: string;
}

export default function DeliveredFilesPage() {
  const [files, setFiles] = useState<DeliveredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState<string>("delivered_date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>("99");

  const isCloudStoredFile = (filePath: string | null | undefined): boolean => {
    if (!filePath) return false;
    const p = filePath.trim();
    if (
      p === "" ||
      p === "pending_upload" ||
      p.startsWith("images/upload/") ||
      p.startsWith("images/") ||
      p.startsWith("public/images/")
    ) {
      return false;
    }
    return p.startsWith("dealer_") || p.includes("customer-files") || p.startsWith("http");
  };

  const handleOpenPreview = (filePath: string) => {
    if (!filePath) return;
    if (!isCloudStoredFile(filePath)) {
      alert("This artwork was delivered and has been purged from active storage.");
      return;
    }
    setPreviewImage(`/api/storage/thumbnail?path=${encodeURIComponent(filePath)}&t=${Date.now()}`);
  };

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

    const fetchDelivered = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customer/delivered-files?customerId=${cid}`);
        const json = await res.json();
        if (json.success) {
          setFiles(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivered();
  }, []);

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

  const filteredFiles = useMemo(() => {
    let list = files;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => {
        return (
          f.customer_billing_file_name.toLowerCase().includes(q) ||
          (f.flux_type && f.flux_type.toLowerCase().includes(q)) ||
          f.customer_billing_file_register_time.toLowerCase().includes(q) ||
          (f.customer_billing_file_printing_time && f.customer_billing_file_printing_time.toLowerCase().includes(q)) ||
          f.customer_billing_file_delivered_time.toLowerCase().includes(q) ||
          String(f.customer_billing_flex_amount).includes(q) ||
          String(f.customer_billing_file_width).includes(q) ||
          String(f.customer_billing_file_height).includes(q) ||
          String(f.customer_billing_file_area).includes(q) ||
          String(f.customer_billing_flex_file_total_amount).includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "register_date": {
          const tA = new Date(a.customer_billing_file_register_time).getTime() || 0;
          const tB = new Date(b.customer_billing_file_register_time).getTime() || 0;
          cmp = tA - tB;
          break;
        }
        case "printing_date": {
          const tA = new Date(a.customer_billing_file_printing_time).getTime() || 0;
          const tB = new Date(b.customer_billing_file_printing_time).getTime() || 0;
          cmp = tA - tB;
          break;
        }
        case "delivered_date": {
          const tA = new Date(a.customer_billing_file_delivered_time).getTime() || 0;
          const tB = new Date(b.customer_billing_file_delivered_time).getTime() || 0;
          cmp = tA - tB;
          break;
        }
        case "flex_type":
          cmp = (a.flux_type || "").localeCompare(b.flux_type || "");
          break;
        case "flex_amount":
          cmp = Number(a.customer_billing_flex_amount || 0) - Number(b.customer_billing_flex_amount || 0);
          break;
        case "width":
          cmp = Number(a.customer_billing_file_width || 0) - Number(b.customer_billing_file_width || 0);
          break;
        case "height":
          cmp = Number(a.customer_billing_file_height || 0) - Number(b.customer_billing_file_height || 0);
          break;
        case "area":
          cmp = Number(a.customer_billing_file_area || 0) - Number(b.customer_billing_file_area || 0);
          break;
        case "quantity":
          cmp = Number(a.customer_billing_file_quantity || 0) - Number(b.customer_billing_file_quantity || 0);
          break;
        case "gst":
          cmp = Number(a.customer_billing_file_gst || 0) - Number(b.customer_billing_file_gst || 0);
          break;
        case "total_amount":
          cmp = Number(a.customer_billing_flex_file_total_amount || 0) - Number(b.customer_billing_flex_file_total_amount || 0);
          break;
        default:
          cmp = Number(b.customer_billing_id) - Number(a.customer_billing_id);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [files, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, currentPage, pageSize]);

  // Export handlers
  const handleCopy = () => {
    if (filteredFiles.length === 0) return;
    const header = "Register Date\tPrinting Date\tDelivered Date\tFlex Type\tFlex Amount (sqft)\tWidth\tHeight\tArea (sqft)\tQuantity\tGST %\tNet Amount\n";
    const body = filteredFiles
      .map(
        (f) =>
          `${f.customer_billing_file_register_time}\t${f.customer_billing_file_printing_time || "—"}\t${f.customer_billing_file_delivered_time}\t${f.flux_type || "Flex"}\t${Number(f.customer_billing_flex_amount || 0).toFixed(2)}\t${Number(f.customer_billing_file_width || 0).toFixed(2)}\t${Number(f.customer_billing_file_height || 0).toFixed(2)}\t${Number(f.customer_billing_file_area || 0).toFixed(2)}\t${Number(f.customer_billing_file_quantity || 1).toFixed(2)}\t${Number(f.customer_billing_file_gst || 0).toFixed(2)}\t${Number(f.customer_billing_flex_file_total_amount || 0).toFixed(2)}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Delivered files report copied to clipboard!");
  };

  const handleExportCSV = () => {
    if (filteredFiles.length === 0) return;
    const header = "Register Date,Printing Date,Delivered Date,Flex Type,Flex Amount,Width,Height,Area,Quantity,GST,Net Amount\r\n";
    const rows = filteredFiles
      .map(
        (f) =>
          `"${f.customer_billing_file_register_time}","${f.customer_billing_file_printing_time || "—"}","${f.customer_billing_file_delivered_time}","${f.flux_type || "Flex"}",${Number(f.customer_billing_flex_amount || 0).toFixed(2)},${Number(f.customer_billing_file_width || 0).toFixed(2)},${Number(f.customer_billing_file_height || 0).toFixed(2)},${Number(f.customer_billing_file_area || 0).toFixed(2)},${Number(f.customer_billing_file_quantity || 1).toFixed(2)},${Number(f.customer_billing_file_gst || 0).toFixed(2)},${Number(f.customer_billing_flex_file_total_amount || 0).toFixed(2)}`
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Delivered_Files_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (filteredFiles.length === 0) return;
    const header = "Register Date\tPrinting Date\tDelivered Date\tFlex Type\tFlex Amount\tWidth\tHeight\tArea\tQuantity\tGST\tNet Amount\r\n";
    const rows = filteredFiles
      .map(
        (f) =>
          `${f.customer_billing_file_register_time}\t${f.customer_billing_file_printing_time || "—"}\t${f.customer_billing_file_delivered_time}\t${f.flux_type || "Flex"}\t${Number(f.customer_billing_flex_amount || 0).toFixed(2)}\t${Number(f.customer_billing_file_width || 0).toFixed(2)}\t${Number(f.customer_billing_file_height || 0).toFixed(2)}\t${Number(f.customer_billing_file_area || 0).toFixed(2)}\t${Number(f.customer_billing_file_quantity || 1).toFixed(2)}\t${Number(f.customer_billing_file_gst || 0).toFixed(2)}\t${Number(f.customer_billing_flex_file_total_amount || 0).toFixed(2)}`
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Delivered_Files_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="delivered-container">
      <div className="table-card">
        {/* Actions & Search Strip */}
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
            <button onClick={() => window.print()} className="dt-btn" title="Print table">
              Print
            </button>
          </div>

          <div className="table-filter-controls">
            <div className="entries-wrap">
              <label htmlFor="del-entries">Show</label>
              <select
                id="del-entries"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="entries-select"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>

            <div className="search-wrap">
              <label htmlFor="del-search">Search:</label>
              <input
                id="del-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search delivered files..."
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Table Body - Single Row Structure with top row headings */}
        <div className="table-scroll-area">
          <table className="delivered-grid-table">
            <thead>
              <tr>
                <th style={{ minWidth: "75px" }}>Image ⇅</th>
                <th style={{ minWidth: "150px", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("register_date")}>
                  Register Date <span className="sort-indicator">{getSortIcon("register_date")}</span>
                </th>
                <th style={{ minWidth: "150px", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("printing_date")}>
                  Printing Date <span className="sort-indicator">{getSortIcon("printing_date")}</span>
                </th>
                <th style={{ minWidth: "150px", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("delivered_date")}>
                  Delieverd Date <span className="sort-indicator">{getSortIcon("delivered_date")}</span>
                </th>
                <th style={{ minWidth: "110px", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("flex_type")}>
                  Flex Type <span className="sort-indicator">{getSortIcon("flex_type")}</span>
                </th>
                <th style={{ minWidth: "120px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("flex_amount")}>
                  Flex Amount (sqft) <span className="sort-indicator">{getSortIcon("flex_amount")}</span>
                </th>
                <th style={{ minWidth: "90px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("width")}>
                  Flex Width <span className="sort-indicator">{getSortIcon("width")}</span>
                </th>
                <th style={{ minWidth: "90px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("height")}>
                  Flex Height <span className="sort-indicator">{getSortIcon("height")}</span>
                </th>
                <th style={{ minWidth: "110px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("area")}>
                  Flex Area (sqft) <span className="sort-indicator">{getSortIcon("area")}</span>
                </th>
                <th style={{ minWidth: "80px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("quantity")}>
                  Quantity <span className="sort-indicator">{getSortIcon("quantity")}</span>
                </th>
                <th style={{ minWidth: "75px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("gst")}>
                  GST % <span className="sort-indicator">{getSortIcon("gst")}</span>
                </th>
                <th style={{ minWidth: "105px", textAlign: "right", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("total_amount")}>
                  Net.Amount <span className="sort-indicator">{getSortIcon("total_amount")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="loading-cell">
                    Loading delivered files history...
                  </td>
                </tr>
              ) : paginatedFiles.length === 0 ? (
                <tr>
                  <td colSpan={12} className="empty-cell">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedFiles.map((file) => (
                  <tr key={file.customer_billing_id}>
                    <td>
                      {isCloudStoredFile(file.customer_billing_file_path) ? (
                        <div
                          className="thumb-box"
                          onClick={() => handleOpenPreview(file.customer_billing_file_path)}
                          title="Click to view artwork"
                        >
                          <img
                            src={`/api/storage/thumbnail?path=${encodeURIComponent(file.customer_billing_file_path)}&orderId=${file.customer_billing_id}`}
                            alt="delivered artwork"
                            className="thumb-img"
                            onError={(e) => {
                              const target = e.target as HTMLElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                const placeholder = parent.querySelector(".delivered-placeholder");
                                if (placeholder) (placeholder as HTMLElement).style.display = "flex";
                              }
                            }}
                          />
                          <div className="delivered-placeholder" style={{ display: "none" }}>
                            <span className="delivered-placeholder-icon">📦</span>
                            <span className="delivered-placeholder-text">Delivered</span>
                            <span className="delivered-placeholder-sub">Purged</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="delivered-placeholder"
                          style={{ display: "flex" }}
                          title="Artwork was delivered and purged from active storage"
                        >
                          <span className="delivered-placeholder-icon">📦</span>
                          <span className="delivered-placeholder-text">Delivered</span>
                          <span className="delivered-placeholder-sub">Purged</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="date-cell">{file.customer_billing_file_register_time}</div>
                      {file.customer_billing_file_name && (
                        <div className="filename-sub" title={file.customer_billing_file_name}>
                          {file.customer_billing_file_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="date-cell">{file.customer_billing_file_printing_time || "—"}</div>
                    </td>
                    <td>
                      <div className="date-cell delivered-pill">
                        {file.customer_billing_file_delivered_time || "—"}
                      </div>
                    </td>
                    <td>
                      <span className="badge-tag">{file.flux_type || "Flex"}</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {Number(file.customer_billing_flex_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(file.customer_billing_file_width || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(file.customer_billing_file_height || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {Number(file.customer_billing_file_area || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(file.customer_billing_file_quantity || 1).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {Number(file.customer_billing_file_gst || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0284c7" }}>
                      {Number(file.customer_billing_flex_file_total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="table-footer-strip">
          <div className="footer-info">
            Showing {filteredFiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredFiles.length)} of {filteredFiles.length} entries
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Artwork Preview</h4>
              <button onClick={() => setPreviewImage(null)} className="close-btn">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <img src={previewImage} alt="Delivered file preview" className="modal-img" />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .delivered-container {
          margin-top: 1rem;
        }

        .table-card {
          background: rgba(255, 255, 255, 0.95);
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

        .delivered-grid-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
          white-space: nowrap;
        }

        .delivered-grid-table th {
          background-color: #eaf4fd;
          color: #1e3a8a;
          font-weight: 600;
          padding: 0.65rem 0.75rem;
          border-bottom: 2px solid #b6d4fe;
        }

        .delivered-grid-table td {
          padding: 0.65rem 0.75rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .delivered-grid-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .thumb-box {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid #cbd5e1;
          background: #f1f5f9;
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .delivered-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          color: #64748b;
          text-align: center;
          padding: 2px;
        }

        .delivered-placeholder-icon {
          font-size: 0.9rem;
          line-height: 1;
        }

        .delivered-placeholder-text {
          font-weight: 700;
          color: #0284c7;
          line-height: 1.1;
        }

        .delivered-placeholder-sub {
          font-size: 0.55rem;
          color: #94a3b8;
          line-height: 1;
        }

        .date-cell {
          font-size: 0.85rem;
          color: #1e293b;
        }

        .delivered-pill {
          color: #047857;
          font-weight: 600;
        }

        .filename-sub {
          font-size: 0.75rem;
          color: #64748b;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 2px;
        }

        .badge-tag {
          display: inline-block;
          background-color: #e0f2fe;
          color: #0369a1;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #bae6fd;
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

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h4 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          color: #64748b;
        }

        .close-btn:hover {
          color: #0f172a;
        }

        .modal-body {
          padding: 1rem;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .modal-img {
          max-width: 100%;
          max-height: 75vh;
          object-fit: contain;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
