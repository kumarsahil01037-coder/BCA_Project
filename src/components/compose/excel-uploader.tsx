'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uploadSpreadsheet } from '@/server/actions/uploads';

export interface UploadResult {
  uploadId: string;
  columns: string[];
  rowCount: number;
  emailColumns: string[];
  invalidEmailRows: number[];
  previewRows: Record<string, unknown>[];
  fileName: string;
}

interface ExcelUploaderProps {
  value: UploadResult | null;
  onChange: (r: UploadResult | null) => void;
}

export function ExcelUploader({ value, onChange }: ExcelUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await uploadSpreadsheet(fd);
        onChange({ ...result, fileName: file.name });
        toast.success(`Parsed ${result.rowCount} rows · ${result.columns.length} columns`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        toast.error(message);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: uploading,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  if (value) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="rounded-lg border bg-card"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{value.fileName}</div>
              <div className="text-xs text-muted-foreground">
                {value.rowCount} rows · {value.columns.length} columns
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="border-t px-4 py-3 space-y-2">
          {value.emailColumns.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-muted-foreground">Detected email columns:</span>
              <div className="flex flex-wrap gap-1">
                {value.emailColumns.map((c) => (
                  <Badge key={c} variant="success">{c}</Badge>
                ))}
              </div>
            </div>
          )}
          {value.invalidEmailRows.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {value.invalidEmailRows.length} row{value.invalidEmailRows.length === 1 ? '' : 's'} have invalid email addresses
            </div>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View columns</summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {value.columns.map((c) => (
                <Badge key={c} variant="outline">{c}</Badge>
              ))}
            </div>
          </details>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'}
        ${uploading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input {...getInputProps()} />
      <motion.div
        animate={{ scale: isDragActive ? 1.02 : 1 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col items-center"
      >
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: isDragActive ? -4 : 0 }}
              exit={{ opacity: 0 }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-3 font-medium">
          {uploading ? 'Parsing spreadsheet…' : isDragActive ? 'Drop file here' : 'Drop your spreadsheet here'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">XLSX, XLS, or CSV · max 25MB</p>
      </motion.div>
    </div>
  );
}
