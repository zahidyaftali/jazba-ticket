import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ImageOff, Images, Loader2, RefreshCw, Upload, X } from "lucide-react";
import {
  MEDIA_FOLDERS,
  MEDIA_FOLDER_LABELS,
  type MediaFolder,
  type MediaItem,
} from "../../../services/adminMediaService";
import { useMediaScope, useNotify } from "../notify";
import { EmptyState, FilterTabs, SearchInput, Toolbar, btnDark, btnOutline, btnPrimary, fmtDate } from "../ui";
import { fmtBytes, uploadToLibrary, useMediaLibrary } from "./mediaStore";

export type FolderTab = "all" | MediaFolder;

/** Uploads files one after another, reporting failures as toasts. */
export function useUploader() {
  const { fail } = useNotify();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const uploadFiles = async (files: FileList | File[] | null, folder: MediaFolder): Promise<MediaItem[]> => {
    const list = Array.from(files || []);
    if (!list.length) return [];
    const uploaded: MediaItem[] = [];
    setProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        uploaded.push(await uploadToLibrary(list[i], folder));
      } catch (err: any) {
        fail(err?.message || `Couldn’t upload “${list[i].name}”.`);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    return uploaded;
  };

  const label = progress ? (progress.total > 1 ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "Uploading…") : "";
  return { busy: !!progress, label, uploadFiles };
}

/** A button that opens the file chooser and uploads what's picked. */
export function UploadButton({
  folder,
  multiple = false,
  onUploaded,
  className = btnDark,
  label = "Upload",
}: {
  folder: MediaFolder;
  multiple?: boolean;
  onUploaded?: (items: MediaItem[]) => void;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const uploader = useUploader();
  return (
    <>
      <button type="button" className={className} disabled={uploader.busy} onClick={() => ref.current?.click()}>
        {uploader.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {uploader.busy ? uploader.label : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={async (e) => {
          const files = Array.from<File>(e.target.files || []);
          e.target.value = "";
          const items = await uploader.uploadFiles(files, folder);
          if (items.length) onUploaded?.(items);
        }}
      />
    </>
  );
}

export function NotConfiguredNotice() {
  if (useMediaScope() === "organizer") {
    return (
      <div className="max-w-xl mx-auto bg-[#fff8c2] border border-[#e6d200] p-5 text-sm text-black">
        <p className="font-bold flex items-center gap-2">
          <ImageOff className="w-4 h-4" /> Image uploads aren’t available yet
        </p>
        <p className="mt-2 text-black/75">You can paste a link to an image instead, or email your images to info@jazbatickets.com.</p>
      </div>
    );
  }
  return (
    <div className="max-w-xl mx-auto bg-[#fff8c2] border border-[#e6d200] p-5 text-sm text-black">
      <p className="font-bold flex items-center gap-2">
        <ImageOff className="w-4 h-4" /> Image uploads aren’t switched on yet
      </p>
      <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-black/80">
        <li>
          On <span className="font-bold">vercel.com</span>, open the jazba-ticket project and click <span className="font-bold">Storage</span>.
        </li>
        <li>
          <span className="font-bold">Create Storage → Blob → Continue</span>, set access to <span className="font-bold">Public</span>, name it
          e.g. <span className="font-mono text-xs">jazba-images</span> and create it.
        </li>
        <li>
          Redeploy the site (Deployments → latest → <span className="font-bold">Redeploy</span>) so it picks up the new store.
        </li>
      </ol>
      <p className="mt-3 text-black/70">Until then you can still paste image links into the fields.</p>
    </div>
  );
}

/** Square thumbnails of library images. */
export function MediaGrid({
  items,
  selected,
  usage,
  onPick,
}: {
  items: MediaItem[];
  selected?: string[];
  usage?: Map<string, string[]>;
  onPick: (item: MediaItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map((item) => {
        const on = !!selected?.includes(item.url);
        const used = usage?.get(item.url)?.length || 0;
        return (
          <button
            key={item.url}
            type="button"
            onClick={() => onPick(item)}
            title={item.name}
            className={`group text-left bg-white border cursor-pointer transition-colors ${
              on ? "border-black outline outline-2 outline-[#ffed00] -outline-offset-4" : "border-[#e4e4e4] hover:border-black"
            }`}
          >
            <div className="relative aspect-square bg-[#f2f2f2] overflow-hidden">
              <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              {on && (
                <span className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#ffed00] text-black flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </span>
              )}
              {used > 0 && (
                <span className="absolute bottom-1.5 left-1.5 bg-black text-white text-[9px] font-bold tracking-[0.12em] uppercase px-1.5 py-0.5">
                  In use
                </span>
              )}
            </div>
            <div className="px-2 py-1.5 min-w-0">
              <p className="text-[11px] font-bold text-black truncate">{item.name}</p>
              <p className="text-[10px] text-[#8a8a8a] font-medium truncate">
                {fmtBytes(item.size)} · {fmtDate(item.uploadedAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function folderTabs(items: MediaItem[]): { id: FolderTab; label: string; count: number }[] {
  const partners = items.filter((i) => i.folder === "partners").length;
  return [
    { id: "all" as FolderTab, label: "All", count: items.length },
    ...MEDIA_FOLDERS.map((f) => ({ id: f as FolderTab, label: MEDIA_FOLDER_LABELS[f], count: items.filter((i) => i.folder === f).length })),
    ...(partners ? [{ id: "partners" as FolderTab, label: MEDIA_FOLDER_LABELS.partners, count: partners }] : []),
  ];
}

export function filterMedia(items: MediaItem[], tab: FolderTab, q: string): MediaItem[] {
  const needle = q.trim().toLowerCase();
  return items.filter((i) => (tab === "all" || i.folder === tab) && (!needle || i.name.toLowerCase().includes(needle)));
}

/** Pick one image (or several, for galleries) from the library, or upload new ones. */
export function MediaPicker({
  folder,
  multiple = false,
  onSelect,
  onClose,
}: {
  folder: MediaFolder;
  multiple?: boolean;
  onSelect: (urls: string[]) => void;
  onClose: () => void;
}) {
  const lib = useMediaLibrary();
  const uploader = useUploader();
  const scope = useMediaScope();
  const [tab, setTab] = useState<FolderTab>("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const shown = useMemo(() => filterMedia(lib.items, tab, q), [lib.items, tab, q]);

  const uploaded = (items: MediaItem[]) => {
    if (!items.length) return;
    if (multiple) setPicked((p) => [...p, ...items.map((i) => i.url).filter((u) => !p.includes(u))]);
    else onSelect([items[0].url]);
  };

  const pick = (item: MediaItem) => {
    if (!multiple) return onSelect([item.url]);
    setPicked((p) => (p.includes(item.url) ? p.filter((u) => u !== item.url) : [...p, item.url]));
  };

  let body: React.ReactNode;
  if (lib.status === "loading" || lib.status === "idle") {
    body = (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8a8a8a]" />
      </div>
    );
  } else if (lib.status === "error") {
    body = (
      <div className="py-16">
        <EmptyState
          icon={ImageOff}
          title="Couldn’t load the media library"
          sub={lib.error}
          action={
            <button type="button" className={btnOutline} onClick={() => lib.refresh()}>
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          }
        />
      </div>
    );
  } else if (!lib.configured) {
    body = <NotConfiguredNotice />;
  } else if (!shown.length) {
    body = (
      <div className="py-16">
        <EmptyState
          icon={Images}
          title={lib.items.length ? "No images match" : "No images yet"}
          sub={lib.items.length ? "Try another folder or search." : "Upload an image — or drop one here — and it’s saved to the library for next time."}
        />
      </div>
    );
  } else {
    body = <MediaGrid items={shown} selected={picked} onPick={pick} />;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Media library">
      <div className="absolute inset-0 bg-black/50 jz-admin-fade" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl h-[92vh] sm:h-[86vh] flex flex-col border border-black">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#efefef]">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg leading-tight text-black">Media library</h2>
            <p className="text-xs text-[#666] mt-0.5">
              {multiple ? "Pick one or more images, or upload new ones." : "Pick an image, or upload a new one."}
              {scope === "admin" && (
                <>
                  {" "}New uploads go to <span className="font-bold">{MEDIA_FOLDER_LABELS[folder]}</span>.
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center border border-[#e4e4e4] hover:border-black cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {lib.configured && (
          <>
            {scope === "admin" && <FilterTabs tabs={folderTabs(lib.items)} value={tab} onChange={setTab} />}
            <Toolbar>
              <SearchInput value={q} onChange={setQ} placeholder="Search images…" />
              <div className="ml-auto">
                {uploader.busy ? (
                  <span className={`${btnDark} pointer-events-none`}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploader.label}
                  </span>
                ) : (
                  <UploadButton folder={folder} multiple={multiple} onUploaded={uploaded} label={multiple ? "Upload images" : "Upload image"} />
                )}
              </div>
            </Toolbar>
          </>
        )}

        <div
          className={`relative flex-1 overflow-y-auto p-4 ${dragging ? "bg-[#fffbd6]" : ""}`}
          onDragOver={(e) => {
            if (!lib.configured || !e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={async (e) => {
            if (!lib.configured) return;
            e.preventDefault();
            setDragging(false);
            uploaded(await uploader.uploadFiles(e.dataTransfer.files, folder));
          }}
        >
          {dragging && (
            <div className="absolute inset-3 border-2 border-dashed border-black flex items-center justify-center pointer-events-none z-10">
              <span className="bg-black text-white text-xs font-bold px-3 py-2">Drop to upload</span>
            </div>
          )}
          {body}
        </div>

        {multiple && lib.configured && (
          <div className="border-t border-[#efefef] px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#666]">{picked.length ? `${picked.length} selected` : "Nothing selected"}</span>
            <div className="flex gap-2">
              <button type="button" className={btnOutline} onClick={onClose}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} disabled={!picked.length} onClick={() => onSelect(picked)}>
                {picked.length > 1 ? `Add ${picked.length} images` : "Add image"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
