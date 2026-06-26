"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, Upload, FileText, Trash2, Download, ImageIcon, FolderOpen,
} from "lucide-react"
import { formatDateShort } from "@/lib/utils"

const DOC_CATEGORIES = [
  "Inspection Report", "CFC Report", "Warranty", "Appliance Manual",
  "Contractor Invoice", "Service Record", "Property Survey", "Insurance",
  "Contract", "Other",
]

const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf"

interface FileRow {
  id: string
  kind: "document" | "photo"
  category: string | null
  name: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PropertyFiles({ propertyId, userId }: { propertyId: string; userId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docCategory, setDocCategory] = useState("Other")

  const docInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("property_files")
        .select("id, kind, category, name, file_type, file_size, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
      setFiles(data ?? [])
      setLoading(false)
    }
    load()
  }, [propertyId])

  async function uploadFiles(fileList: FileList, kind: "document" | "photo") {
    setUploading(true)
    setError(null)
    const newRows: FileRow[] = []

    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("bucket", "property-files")
      fd.append("path", `${propertyId}/${kind === "photo" ? "photos" : "documents"}`)

      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const result = await res.json()
      if (!res.ok || result.error) {
        setError(`${file.name}: ${result.error ?? "upload failed"}`)
        continue
      }

      const row = {
        property_id: propertyId,
        uploaded_by: userId,
        kind,
        category: kind === "document" ? docCategory : null,
        name: file.name,
        storage_bucket: result.bucket as string,
        storage_path: result.path as string,
        file_type: file.type || null,
        file_size: file.size || null,
      }
      const { data, error } = await supabase.from("property_files").insert(row).select().single()
      if (error) { setError(error.message); continue }
      if (data) newRows.push(data as FileRow)
    }

    if (newRows.length) setFiles(prev => [...newRows, ...prev])
    setUploading(false)
  }

  async function remove(id: string) {
    const prev = files
    setFiles(f => f.filter(x => x.id !== id))
    const { error } = await supabase.from("property_files").delete().eq("id", id)
    if (error) setFiles(prev)
  }

  const documents = files.filter(f => f.kind === "document")
  const photos = files.filter(f => f.kind === "photo")

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
  }

  return (
    <div className="space-y-4">
      {/* hidden inputs */}
      <input ref={docInputRef} type="file" multiple accept={DOC_ACCEPT} className="hidden"
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files, "document"); e.target.value = "" }} />
      <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files, "photo"); e.target.value = "" }} />

      {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">
            Documents {documents.length > 0 && <span className="ml-1.5 text-xs text-slate-400">({documents.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="photos">
            Photos {photos.length > 0 && <span className="ml-1.5 text-xs text-slate-400">({photos.length})</span>}
          </TabsTrigger>
        </TabsList>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="space-y-4 pt-2">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Category for next upload</label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => docInputRef.current?.click()} disabled={uploading} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Documents
            </Button>
          </div>

          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <FolderOpen className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-500">No documents yet</p>
              <p className="text-sm text-slate-400 mt-1">Inspection reports, warranties, manuals, invoices, surveys, insurance. PDFs and Office files welcome.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(f => (
                <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#0F1B2D] dark:text-white truncate">{f.name}</p>
                    <p className="text-xs text-slate-400">
                      {f.category}{f.category ? " · " : ""}{formatBytes(f.file_size)}{f.file_size ? " · " : ""}{formatDateShort(f.created_at)}
                    </p>
                  </div>
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 text-slate-400 hover:text-[#C9A96E] hover:bg-slate-100 dark:hover:bg-slate-800" title="Open / download">
                    <Download className="h-4 w-4" />
                  </a>
                  <button onClick={() => remove(f.id)} className="rounded p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos" className="space-y-4 pt-2">
          <Button onClick={() => photoInputRef.current?.click()} disabled={uploading} className="bg-[#C9A96E] text-[#0F1B2D] hover:bg-[#b8954f] gap-1.5">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Upload Photos
          </Button>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <ImageIcon className="h-12 w-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-500">No photos yet</p>
              <p className="text-sm text-slate-400 mt-1">General property photos. Walkthrough and work-order photos live with their own records.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map(f => (
                <div key={f.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${f.id}`} alt={f.name} className="h-full w-full object-cover" />
                  </a>
                  <button
                    onClick={() => remove(f.id)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
