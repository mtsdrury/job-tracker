"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Upload, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  [csvColumn: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ row: number; reason: string }>;
}

const JOB_FIELDS = [
  { value: "company", label: "Company (Required)" },
  { value: "title", label: "Role/Title (Required)" },
  { value: "location", label: "Location" },
  { value: "remoteType", label: "Remote Type" },
  { value: "description", label: "Description" },
  { value: "url", label: "Job URL" },
  { value: "appliedAt", label: "Date Applied" },
  { value: "notes", label: "Notes" },
  { value: "resumeVersion", label: "Resume Version" },
  { value: "coverLetterWritten", label: "Cover Letter Written" },
];

export default function ImportPage() {
  const router = useRouter();
  const { success, error, info } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "results">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  function downloadTemplate() {
    const template = [
      ["Company", "Role", "Location", "Remote Type", "Description", "Job URL", "Date Applied", "Notes"],
      ["Acme Corp", "Senior Engineer", "San Francisco, CA", "Hybrid", "Building products", "https://acme.com/jobs", "2026-03-20", "Hot lead"],
      ["TechStart Inc", "Product Manager", "Remote", "Remote", "PM for AI products", "https://techstart.com", "", "Follow up"],
    ];

    const csv = template.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileSelect(file: File) {
    if (!file) return;

    setSelectedFile(file);
    const isXlsx = file.name.endsWith(".xlsx");
    const isCsv = file.name.endsWith(".csv");

    if (!isXlsx && !isCsv) {
      error("Please upload a CSV or XLSX file");
      return;
    }

    try {
      let rows: ParsedRow[] = [];
      let columns: string[] = [];

      if (isXlsx) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
          error("Could not read spreadsheet");
          return;
        }
        rows = XLSX.utils.sheet_to_json(sheet) as ParsedRow[];
        columns = Object.keys(rows[0] || {});
      } else {
        await new Promise<void>((resolve) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              rows = results.data as ParsedRow[];
              columns = results.meta.fields || [];
              resolve();
            },
            error: () => {
              error("Failed to parse CSV file");
              resolve();
            },
          });
        });
      }

      if (rows.length === 0) {
        error("No data found in file");
        return;
      }

      setParsedRows(rows);
      setCsvColumns(columns);

      const autoMapping: ColumnMapping = {};
      columns.forEach((col) => {
        const lower = col.toLowerCase();
        if (lower.includes("company")) autoMapping[col] = "company";
        else if (lower.includes("role") || lower.includes("title") || lower.includes("position"))
          autoMapping[col] = "title";
        else if (lower.includes("location") || lower.includes("city")) autoMapping[col] = "location";
        else if (lower.includes("remote")) autoMapping[col] = "remoteType";
        else if (lower.includes("description") || lower.includes("summary"))
          autoMapping[col] = "description";
        else if (lower.includes("url") || lower.includes("link") || lower.includes("job_url"))
          autoMapping[col] = "url";
        else if (lower.includes("date") || lower.includes("applied")) autoMapping[col] = "appliedAt";
        else if (lower.includes("note")) autoMapping[col] = "notes";
        else if (lower.includes("resume")) autoMapping[col] = "resumeVersion";
      });

      setColumnMapping(autoMapping);
      setStep("mapping");
      info(`Parsed ${rows.length} rows from file`);
    } catch (err) {
      error("Failed to parse file");
      console.error(err);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const jobsToImport = parsedRows.map((row) => {
        const job: Record<string, unknown> = {};
        Object.entries(columnMapping).forEach(([csvCol, jobField]) => {
          const value = row[csvCol]?.trim();
          if (value && jobField) {
            if (jobField === "appliedAt") {
              job.appliedAt = value;
              job.applied = true;
            } else if (jobField === "coverLetterWritten") {
              job.coverLetterWritten = value.toLowerCase() === "yes" || value === "true";
            } else {
              job[jobField] = value;
            }
          }
        });
        return job;
      });

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobsToImport),
      });

      const result = (await res.json()) as ImportResult;

      if (!res.ok) {
        error(`Import failed: ${result.errorDetails?.[0]?.reason || "Unknown error"}`);
        return;
      }

      setImportResult(result);
      setStep("results");
      success(`Successfully imported ${result.imported} jobs`);
    } catch (err) {
      error("Import failed");
      console.error(err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Import Jobs</h1>
          <p className="mt-2 text-muted">
            Bulk import job opportunities from a CSV or Excel file
          </p>
        </div>

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="rounded-lg border-2 border-dashed border-border bg-surface p-8 text-center cursor-pointer transition-colors hover:bg-surface hover:border-border-hover"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-accent");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-accent");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-accent");
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-muted mb-3" />
                <p className="text-lg font-medium text-foreground mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-muted">Supports CSV and XLSX files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>

              {selectedFile && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-sm text-muted mb-1">Selected file:</p>
                  <p className="font-medium text-foreground">{selectedFile.name}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted mb-4">
                  Don't have a file ready? Download a template to get started:
                </p>
                <Button variant="secondary" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "mapping" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Map Columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-foreground mb-4">
                    Match your CSV columns to job fields. Fields marked with are required.
                  </p>
                  <div className="space-y-4">
                    {csvColumns.map((col) => (
                      <div key={col} className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <label className="block text-sm font-medium text-foreground truncate">
                            {col}
                          </label>
                          <p className="text-xs text-muted mt-1">
                            From your file
                          </p>
                        </div>
                        <Select
                          value={columnMapping[col] || ""}
                          onChange={(e) => {
                            setColumnMapping({
                              ...columnMapping,
                              [col]: e.currentTarget.value,
                            });
                          }}
                          className="flex-1 min-w-0"
                        >
                          <option value="">- Skip this column -</option>
                          {JOB_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">Required fields</p>
                      <p className="text-muted">
                        Company and Role are required. Other fields are optional.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs text-muted font-medium mb-3">Preview (first 3 rows):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {csvColumns.map((col) => (
                            <th
                              key={col}
                              className="px-2 py-2 text-left font-medium text-muted truncate"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-b border-border">
                            {csvColumns.map((col) => (
                              <td
                                key={`${idx}-${col}`}
                                className="px-2 py-2 text-foreground truncate"
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep("upload")}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {parsedRows.length} Jobs
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "results" && importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-sm text-muted">Imported</p>
                  </div>
                  <p className="text-2xl font-bold text-success">{importResult.imported}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <p className="text-sm text-muted">Skipped</p>
                  </div>
                  <p className="text-2xl font-bold text-warning">{importResult.skipped}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="h-5 w-5 text-danger" />
                    <p className="text-sm text-muted">Errors</p>
                  </div>
                  <p className="text-2xl font-bold text-danger">{importResult.errors}</p>
                </div>
              </div>

              {importResult.errorDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Error Details:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-border p-3 bg-surface">
                    {importResult.errorDetails.map((detail, idx) => (
                      <div key={idx} className="text-xs text-muted">
                        <span className="font-medium">Row {detail.row}:</span> {detail.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStep("upload");
                    setSelectedFile(null);
                    setParsedRows([]);
                    setCsvColumns([]);
                    setColumnMapping({});
                    setImportResult(null);
                  }}
                >
                  Import Another File
                </Button>
                <Button
                  variant="primary"
                  onClick={() => router.push("/jobs")}
                >
                  View My Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
