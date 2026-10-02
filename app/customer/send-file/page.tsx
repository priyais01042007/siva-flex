"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";
import { supabaseClient, STORAGE_BUCKET } from "@/lib/supabase";

interface FluxType {
  flux_id: string;
  flux_type: string;
  flux_amount: string;
}

interface CustomerFile {
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
  customer_billing_flex_file_total_amount: string;
  customer_billing_file_register_time: string;
  customer_billing_file_status: number;
  customer_billing_file_note: string;
}

export default function CustomerSendFilePage() {
  const [fluxTypes, setFluxTypes] = useState<FluxType[]>([]);
  const [selectedFlux, setSelectedFlux] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [dimensionUnit, setDimensionUnit] = useState<"inch" | "feet">("feet");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Table state
  const [files, setFiles] = useState<CustomerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState<string>("register_time");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Customer ID from storage (default 99 for TEST test1@gmail.com customer)
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

  const handleOpenPreview = async (filePath: string) => {
    if (!filePath || !isCloudStoredFile(filePath)) {
      alert("This artwork file has been archived and purged from active storage.");
      return;
    }
    try {
      const res = await fetch(
        `/api/storage/signed-url?path=${encodeURIComponent(filePath)}&dealerId=${customerId}`
      );
      const data = await res.json();
      if (data.signedUrl) {
        setPreviewImage(data.signedUrl);
        return;
      }
    } catch {
      // fallback to proxy
    }
    setPreviewImage(`/api/storage/file?path=${encodeURIComponent(filePath)}&dealerId=${customerId}`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("siva_flex_customer");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (
          parsed.id === "98" ||
          parsed.id === 98 ||
          (parsed.email && parsed.email.toLowerCase().includes("test"))
        ) {
          parsed.id = "99";
          localStorage.setItem("siva_flex_customer", JSON.stringify(parsed));
        }
        if (parsed.id) setCustomerId(String(parsed.id));
      } catch (e) {
        console.error(e);
      }
    }
    fetchFluxTypes();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchCustomerFiles(customerId);
    }
  }, [customerId]);

  const fetchFluxTypes = async () => {
    try {
      const res = await fetch("/api/customer/flux-types");
      if (!res.ok) return;
      const text = await res.text();
      const json = JSON.parse(text);
      if (json.success) {
        setFluxTypes(json.data);
      }
    } catch (err) {
      console.error("Failed to load flux types:", err);
    }
  };

  const fetchCustomerFiles = async (cId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer/files?customerId=${cId}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(
          res.status === 504
            ? "Connection timed out. Please verify DATABASE_URL is using the Supabase pooler."
            : `Failed to load files (HTTP ${res.status})`
        );
      }
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Unexpected response from server. Please refresh.");
      }
      if (json.success && Array.isArray(json.data)) {
        setFiles(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch customer files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    } else {
      setSelectedFiles(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedFlux || selectedFlux === "Select Flux") {
      setMessage({ type: "error", text: "Please Select File Type." });
      return;
    }

    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage({ type: "error", text: "Please select at least one file to upload (e.g. 10*12 format)." });
      return;
    }

    setUploading(true);

    const totalFiles = selectedFiles.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const fileLabel = `${i + 1} of ${totalFiles} (${file.name})`;
        setMessage({
          type: "info",
          text: `Uploading file ${fileLabel}... Please wait.`,
        });

        let uploadedDirectly = false;

        // Step 1: Initialize order and validate in backend
        const prepRes = await fetch("/api/customer/upload/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            fluxtype: selectedFlux,
            dimensionUnit,
            note: "WEBUPLOAD",
          }),
        });

        if (!prepRes.ok) {
          const prepText = await prepRes.text();
          let prepErr = `Upload initialization failed (${prepRes.status})`;
          try {
            const prepJson = JSON.parse(prepText);
            if (prepJson.error) prepErr = prepJson.error;
          } catch {
            if (prepRes.status === 401) prepErr = "Session expired. Please sign in again.";
            else if (prepRes.status === 429) prepErr = "Upload rate limit reached. Please wait a moment.";
          }
          throw new Error(`${file.name}: ${prepErr}`);
        }

        const prepData = await prepRes.json();
        if (!prepData.success) {
          throw new Error(`${file.name}: ${prepData.error || "Failed to initialize order."}`);
        }

        // Step 2: Upload directly to Supabase Storage (bypasses Netlify 4.5MB limit, supports up to 50MB)
        try {
          const { error: storageError } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(prepData.storagePath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: true,
            });

          if (!storageError) {
            uploadedDirectly = true;
          } else {
            console.warn("Direct storage upload warning:", storageError.message);
          }
        } catch (directErr) {
          console.warn("Direct storage upload exception:", directErr);
        }

        // Fallback to server route if direct storage fails (for files under 4MB)
        if (!uploadedDirectly) {
          if (file.size > 4 * 1024 * 1024) {
            throw new Error(
              `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB): Direct upload encountered an issue. Please verify your internet connection.`
            );
          }

          const fallbackData = new FormData();
          fallbackData.append("fluxtype", selectedFlux);
          fallbackData.append("customerId", customerId);
          fallbackData.append("dimensionUnit", dimensionUnit);
          fallbackData.append("file", file);

          const fbRes = await fetch("/api/customer/upload", {
            method: "POST",
            body: fallbackData,
          });

          if (!fbRes.ok) {
            const fbText = await fbRes.text();
            let fbErr = `Server error (${fbRes.status})`;
            try {
              const fbJson = JSON.parse(fbText);
              if (fbJson.error) fbErr = fbJson.error;
            } catch {
              if (fbRes.status === 413) fbErr = "File exceeds serverless upload limit.";
              else if (fbRes.status === 504) fbErr = "Upload timed out. Please retry.";
            }
            throw new Error(`${file.name}: ${fbErr}`);
          }
        } else {
          // Step 3: Complete upload confirmation in backend
          await fetch("/api/customer/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: prepData.orderId,
              storagePath: prepData.storagePath,
            }),
          });
        }

        successCount++;
      }

      if (successCount === totalFiles) {
        setMessage({
          type: "success",
          text: `${totalFiles} file(s) uploaded successfully to the print queue!`,
        });
      } else if (successCount > 0) {
        setMessage({
          type: "success",
          text: `${successCount} of ${totalFiles} file(s) uploaded successfully.`,
        });
      }

      // Reset form
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh queue
      await fetchCustomerFiles(customerId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error uploading file";
      setMessage({ type: "error", text: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Are you sure you want to delete this file from the queue?")) {
      return;
    }

    try {
      const res = await fetch("/api/customer/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId, customerId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to delete file.");
        return;
      }

      // Remove from local state
      setFiles((prev) => prev.filter((f) => f.customer_billing_id !== fileId));
    } catch (err) {
      console.error(err);
      alert("Error deleting file.");
    }
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

  // Filtered and sorted files
  const filteredFiles = useMemo(() => {
    let list = files;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.customer_billing_file_name.toLowerCase().includes(q) ||
          (f.flux_type && f.flux_type.toLowerCase().includes(q)) ||
          f.customer_billing_file_register_time.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "flex") {
        cmp = (a.flux_type || "").localeCompare(b.flux_type || "");
      } else if (sortField === "fileName") {
        cmp = (a.customer_billing_file_name || "").localeCompare(b.customer_billing_file_name || "");
      } else if (sortField === "status") {
        cmp = (a.customer_billing_file_status || 0) - (b.customer_billing_file_status || 0);
      } else {
        // default: register_time
        const tA = new Date(a.customer_billing_file_register_time).getTime() || 0;
        const tB = new Date(b.customer_billing_file_register_time).getTime() || 0;
        cmp = tA - tB;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [files, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, currentPage, pageSize]);

  // Export Handlers
  const handleCopy = () => {
    if (filteredFiles.length === 0) return;
    const header = "Flex\tFile Name\tRegister Time\tStatus\n";
    const body = filteredFiles
      .map(
        (f) =>
          `${f.flux_type || "Flex"}\t${f.customer_billing_file_name}\t${f.customer_billing_file_register_time}\t${getStatusText(f.customer_billing_file_status)}`
      )
      .join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Table data copied to clipboard!");
  };

  const handleExportCSV = () => {
    if (filteredFiles.length === 0) return;
    const header = "Flex,File Name,Register Time,Status\r\n";
    const rows = filteredFiles
      .map(
        (f) =>
          `"${f.flux_type || "Flex"}","${f.customer_billing_file_name.replace(/"/g, '""')}","${f.customer_billing_file_register_time}","${getStatusText(f.customer_billing_file_status)}"`
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Live_Queue_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (filteredFiles.length === 0) return;
    const header = "Flex\tFile Name\tRegister Time\tStatus\r\n";
    const rows = filteredFiles
      .map(
        (f) =>
          `${f.flux_type || "Flex"}\t${f.customer_billing_file_name}\t${f.customer_billing_file_register_time}\t${getStatusText(f.customer_billing_file_status)}`
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Live_Queue_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <span className="status-badge pending">Pending in Queue</span>;
      case 2:
        return <span className="status-badge printing">Printing in Progress</span>;
      case 3:
        return <span className="status-badge finished">Finished / Ready</span>;
      case 4:
        return <span className="status-badge delivered">Delivered</span>;
      default:
        return <span className="status-badge default">In Queue</span>;
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "Pending in Queue";
      case 2:
        return "Printing in Progress";
      case 3:
        return "Finished / Ready";
      case 4:
        return "Delivered";
      default:
        return "In Queue";
    }
  };

  return (
    <div className="send-file-container">
      {/* Upload Box */}
      <div className="upload-card">
        <form onSubmit={handleUploadSubmit} className="upload-form">
          <div className="form-header-title">File Upload</div>

          <div className="form-controls-row">
            {/* Flex Type Select */}
            <div className="select-wrap">
              <select
                id="fluxtype"
                name="fluxtype"
                value={selectedFlux}
                onChange={(e) => setSelectedFlux(e.target.value)}
                className="flux-select"
                required
              >
                <option value="">Select Flux</option>
                {fluxTypes.map((ft) => (
                  <option key={ft.flux_id} value={ft.flux_id}>
                    {ft.flux_type}
                  </option>
                ))}
              </select>
            </div>

            {/* File Input */}
            <div className="file-input-wrap">
              <input
                ref={fileInputRef}
                type="file"
                id="file"
                name="file[]"
                multiple
                accept="image/*,.pdf,.cdr,.psd,.ai,.tiff,.eps"
                onChange={handleFileChange}
                className="native-file-input"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="submit-btn-wrap">
              <button
                type="submit"
                id="submit"
                className="send-button"
                disabled={uploading}
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <span className="send-icon">✈</span> Send
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="hint-text">
            💡 <strong>Naming recommendation:</strong> Include dimensions in filename (e.g.,{" "}
            <code>16x10_Banner.jpg</code> or <code>4x6_Board.tif</code>).
          </div>

          {message && (
            <div className={`alert-box ${message.type}`}>
              {message.type === "success" ? "✓ " : message.type === "info" ? "⏳ " : "⚠ "}
              {message.text}
            </div>
          )}
        </form>
      </div>

      {/* In-Queue / Live Files Table */}
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
            <button onClick={handlePrint} className="dt-btn" title="Print table">
              Print
            </button>
          </div>

          <div className="table-filter-controls">
            <div className="entries-wrap">
              <label htmlFor="entries-select">Show</label>
              <select
                id="entries-select"
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
              <label htmlFor="table-search">Search:</label>
              <input
                id="table-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search queue..."
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="table-scroll-area">
          <table className="queue-table">
            <thead>
              <tr>
                <th style={{ width: "20%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("flex")} title="Click to sort by Flex">
                  Flex <span className="sort-indicator">{getSortIcon("flex")}</span>
                </th>
                <th style={{ width: "35%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("fileName")} title="Click to sort by File Name">
                  File Name <span className="sort-indicator">{getSortIcon("fileName")}</span>
                </th>
                <th style={{ width: "15%" }}>Image ⇅</th>
                <th style={{ width: "18%", cursor: "pointer", userSelect: "none" }} onClick={() => handleSort("status")} title="Click to sort by Status">
                  Status <span className="sort-indicator">{getSortIcon("status")}</span>
                </th>
                <th style={{ width: "12%", textAlign: "center" }}>Action ⇅</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="loading-cell">
                    Loading files queue...
                  </td>
                </tr>
              ) : paginatedFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No data available in table
                  </td>
                </tr>
              ) : (
                paginatedFiles.map((file) => (
                  <tr key={file.customer_billing_id}>
                    <td>
                      <span className="flex-type-name">{file.flux_type || "Flex Media"}</span>
                    </td>
                    <td>
                      <span className="file-name-text">{file.customer_billing_file_name}</span>
                      {Number(file.customer_billing_file_width || 0) > 0 && (
                        <div className="dims-sub">
                          📐 {Number(file.customer_billing_file_width).toFixed(2)} × {Number(file.customer_billing_file_height).toFixed(2)} ft ({Number(file.customer_billing_file_area).toFixed(2)} sqft)
                        </div>
                      )}
                      <div className="time-sub">
                        🕒 {file.customer_billing_file_register_time}
                      </div>
                    </td>
                    <td>
                      {isCloudStoredFile(file.customer_billing_file_path) ? (
                        <div
                          className="thumb-container"
                          onClick={() => handleOpenPreview(file.customer_billing_file_path)}
                          title="Click to view full image"
                        >
                          <img
                            src={`/api/storage/thumbnail?path=${encodeURIComponent(file.customer_billing_file_path)}&orderId=${file.customer_billing_id}`}
                            alt="preview"
                            className="thumb-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `/api/storage/file?path=${encodeURIComponent(file.customer_billing_file_path)}&orderId=${file.customer_billing_id}`;
                            }}
                          />
                          <span className="view-badge">View</span>
                        </div>
                      ) : (
                        <span className="no-img" title="Artwork was delivered/purged">📦 Purged</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}><StatusBadge status={file.customer_billing_file_status} /></td>
                    <td style={{ textAlign: "center" }}>
                      {file.customer_billing_file_status === 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(file.customer_billing_id)}
                          className="custom-icon-btn"
                          title="Cancel/Delete pending file from queue"
                        >
                          <img
                            src="/icons/btn_delete.png"
                            alt="Delete"
                            style={{ width: 30, height: 30, objectFit: "contain", display: "inline-block" }}
                          />
                        </button>
                      ) : (
                        <span className="locked-action">—</span>
                      )}
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
              <h4>File Preview</h4>
              <button onClick={() => setPreviewImage(null)} className="close-btn">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <img src={previewImage} alt="Uploaded print file" className="modal-img" />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .send-file-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        /* Top Upload Card */
        .upload-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(2, 132, 199, 0.16);
          border-radius: 12px;
          padding: 1.5rem 1.75rem;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
        }

        .form-header-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-controls-row {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          flex-wrap: wrap;
        }

        .select-wrap {
          flex: 1;
          min-width: 220px;
        }

        .flux-select {
          width: 100%;
          height: 42px;
          padding: 0.45rem 0.85rem;
          font-size: 0.92rem;
          font-weight: 600;
          color: #334155;
          background-color: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .flux-select:focus {
          border-color: #0284c7;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .file-input-wrap {
          flex: 1.5;
          min-width: 260px;
        }

        .native-file-input {
          width: 100%;
          height: 42px;
          font-size: 0.88rem;
          color: #334155;
          border: 1.5px dashed #0284c7;
          border-radius: 8px;
          padding: 6px 10px;
          background: #f0f9ff;
          cursor: pointer;
        }

        .submit-btn-wrap {
          display: flex;
          align-items: center;
        }

        .send-button {
          height: 42px;
          padding: 0 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.25);
          transition: all 0.2s;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }

        .send-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .send-icon {
          font-size: 1.1rem;
        }

        .dimension-unit-box {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.85rem;
        }

        .unit-box-label {
          font-size: 0.86rem;
          font-weight: 700;
          color: #334155;
        }

        .unit-toggle-group {
          display: inline-flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .unit-pill-btn {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 20px;
          padding: 0.35rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }

        .unit-pill-btn:hover {
          border-color: #0284c7;
          color: #0284c7;
        }

        .unit-pill-btn.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
        }

        .unit-example {
          font-size: 0.74rem;
          font-weight: 500;
          opacity: 0.85;
        }

        .dims-sub {
          font-size: 0.76rem;
          font-weight: 700;
          color: #0284c7;
          margin-top: 0.2rem;
        }

        .hint-text {
          margin-top: 0.85rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .hint-text code {
          background: #e0f2fe;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          color: #0284c7;
          font-weight: 600;
        }

        .alert-box {
          margin-top: 0.85rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .alert-box.success {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .alert-box.info {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .alert-box.error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        /* Table Card */
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
          margin-bottom: 1rem;
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
          margin-left: 0.35rem;
          font-size: 0.8rem;
          color: #0284c7;
        }

        .page-num.active {
          background: #0284c7 !important;
          color: #ffffff !important;
          border-color: #0284c7 !important;
          font-weight: 700;
        }

        /* Table */
        .table-scroll-area {
          overflow-x: auto;
          border: 1px solid #dee2e6;
          border-radius: 3px;
        }

        .queue-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }

        .queue-table th {
          background-color: #eaf4fd;
          color: #1e3a8a;
          font-weight: 600;
          padding: 0.65rem 0.75rem;
          border-bottom: 2px solid #b6d4fe;
          white-space: nowrap;
        }

        .queue-table td {
          padding: 0.65rem 0.75rem;
          border-bottom: 1px solid #e9ecef;
          vertical-align: middle;
        }

        .queue-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .flex-type-name {
          font-weight: 600;
          color: #0f172a;
        }

        .rate-sub {
          font-size: 0.75rem;
          color: #059669;
          font-weight: 600;
        }

        .file-name-text {
          font-weight: 500;
          color: #1e293b;
          word-break: break-all;
        }

        .time-sub {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.15rem;
        }

        .thumb-container {
          position: relative;
          display: inline-block;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 2px;
          background: #fff;
        }

        .thumb-img {
          width: 44px;
          height: 44px;
          object-fit: cover;
          border-radius: 2px;
          display: block;
        }

        .view-badge {
          display: block;
          font-size: 0.65rem;
          text-align: center;
          color: #0284c7;
          font-weight: 600;
          margin-top: 2px;
        }

        .no-img {
          font-size: 0.75rem;
          color: #94a3b8;
          font-style: italic;
        }

        .status-badge {
          display: inline-block;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background-color: #f59e0b;
          color: #ffffff;
          border: 1px solid #d97706;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.25);
        }

        .status-badge.printing {
          background-color: #0284c7;
          color: #ffffff;
          border: 1px solid #0369a1;
          box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
        }

        .status-badge.finished {
          background-color: #10b981;
          color: #ffffff;
          border: 1px solid #059669;
        }

        .status-badge.delivered {
          background-color: #16a34a;
          color: #ffffff;
          border: 1px solid #15803d;
        }

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

        .pill-pending {
          background-color: #dc2626;
          color: #ffffff;
        }

        .pill-printing {
          background-color: #fbbf24;
          color: #78350f;
        }

        .pill-delivered {
          background-color: #0284c7;
          color: #ffffff;
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
          transform: scale(1.15);
          filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.2));
        }

        .custom-icon-btn:active {
          transform: scale(0.95);
        }

        .locked-action {
          color: #94a3b8;
        }

        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 2rem !important;
          color: #64748b;
          font-style: italic;
        }

        /* Footer Strip */
        .table-footer-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
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

        .current-page-indicator {
          font-weight: 700;
          padding: 0.3rem 0.5rem;
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 8px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
        }

        .close-btn {
          border: none;
          background: none;
          font-size: 1.2rem;
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
        }

        .modal-img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
