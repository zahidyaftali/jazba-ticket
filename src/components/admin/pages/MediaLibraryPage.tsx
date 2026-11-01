import React, { useMemo, useState } from "react";
import { Copy, ExternalLink, ImageOff, Images, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { MEDIA_FOLDERS, MEDIA_FOLDER_LABELS, type MediaFolder, type MediaItem } from "../../../services/adminMediaService";
import { useAdmin } from "../AdminContext";
import { Detail, Drawer, EmptyState, FilterTabs, IconButton, PageHeader, SearchInput, Toolbar, btnDark, btnOutline, fmtDateTime, inputCls, labelCls } from "../ui";
import { MediaGrid, NotConfiguredNotice, UploadButton, filterMedia, folderTabs, useUploader, type FolderTab } from "../media/MediaPicker";
import { fmtBytes, mediaUsage, removeFromLibrary, useMediaLibrary } from "../media/mediaStore";

/** /admin/media — every uploaded image, WordPress-style. */
export default function MediaLibraryPage() {
  const { data, notify, fail } = useAdmin();
  const lib = useMediaLibrary();
  const dropUploader = useUploader();
  const [tab, setTab] = useState<FolderTab>("all");
  const [q, setQ] = useState("");
  const [saveTo, setSaveTo] = useState<MediaFolder>("events");
  const [openUrl, setOpenUrl] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const usage = useMemo(() => mediaUsage(data), [data]);
  const shown = useMemo(() => filterMedia(lib.items, tab, q), [lib.items, tab, q]);
  const totalBytes = lib.items.reduce((s, i) => s + i.size, 0);
  const open = lib.items.find((i) => i.url === openUrl) || null;
  const openUses = open ? usage.get(open.url) || [] : [];

  const onTab = (t: FolderTab) => {
    setTab(t);
    if (t !== "all") setSaveTo(t);
  };

  const uploaded = (items: MediaItem[]) => {
    if (items.length) notify(items.length === 1 ? "Image uploaded to the library." : `${items.length} images uploaded to the library.`);
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Image link copied.");
    } catch {
      fail("Couldn’t copy automatically — select the link and copy it instead.");
    }
  };

  const remove = async (item: MediaItem) => {
    const used = usage.get(item.url) || [];
    const msg = used.length
      ? `This image is used on:\n• ${used.join("\n• ")}\n\nDeleting it leaves those places without an image. Delete anyway?`
      : "Delete this image from the library? This can’t be undone.";
    if (!window.confirm(msg)) return;
    setDeleting(true);
    try {
      await removeFromLibrary(item.url);
      setOpenUrl("");
      notify("Image deleted.");
    } catch (err: any) {
      fail(err?.message || "Couldn’t delete the image.");
    } finally {
      setDeleting(false);
    }
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
  } else if (!shown.length) {
    body = (
      <div className="py-16">
        <EmptyState
          icon={Images}
          title={lib.items.length ? "No images match" : "No images yet"}
          sub={
            lib.items.length
              ? "Try another folder or search."
              : "Upload images here — or drop them onto this page — and pick them from any image field in the admin."
          }
        />
      </div>
    );
  } else {
    body = <MediaGrid items={shown} usage={usage} onPick={(item) => setOpenUrl(item.url)} />;
  }

  return (
    <div>
      <PageHeader
        title="Media library"
        sub={
          lib.configured && lib.status === "ready"
            ? `${lib.items.length} image${lib.items.length === 1 ? "" : "s"} · ${fmtBytes(totalBytes)} stored. Upload here or from any image field — every upload is kept here for reuse.`
            : "Images for events, artists and organisers. Upload here or from any image field — every upload is kept here for reuse."
        }
        actions={
          lib.configured ? (
            <>
              <label className="flex items-center gap-2 text-xs font-bold text-[#666]">
                Save to
                <select
                  value={saveTo}
                  onChange={(e) => setSaveTo(e.target.value as MediaFolder)}
                  className="bg-white border border-[#e4e4e4] px-2 py-2 text-xs font-bold text-black cursor-pointer outline-none focus:border-black"
                >
                  {MEDIA_FOLDERS.map((f) => (
                    <option key={f} value={f}>
                      {MEDIA_FOLDER_LABELS[f]}
                    </option>
                  ))}
                </select>
              </label>
              <UploadButton folder={saveTo} multiple onUploaded={uploaded} label="Upload images" />
              <IconButton title="Refresh" onClick={() => lib.refresh()}>
                <RefreshCw className="w-4 h-4" />
              </IconButton>
            </>
          ) : undefined
        }
      />

      {!lib.configured ? (
        <NotConfiguredNotice />
      ) : (
        <section
          className={`relative bg-white border ${dragging ? "border-black" : "border-[#e4e4e4]"}`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setDragging(false);
            uploaded(await dropUploader.uploadFiles(e.dataTransfer.files, saveTo));
          }}
        >
          <FilterTabs tabs={folderTabs(lib.items)} value={tab} onChange={onTab} />
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search images…" />
            {dropUploader.busy && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-[#666]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {dropUploader.label}
              </span>
            )}
          </Toolbar>
          <div className="p-4">{body}</div>
          {dragging && (
            <div className="absolute inset-0 bg-[#fffbd6]/80 border-2 border-dashed border-black flex items-center justify-center pointer-events-none">
              <span className="bg-black text-white text-xs font-bold px-3 py-2">Drop to upload to {MEDIA_FOLDER_LABELS[saveTo]}</span>
            </div>
          )}
        </section>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenUrl("")}
        eyebrow={open ? MEDIA_FOLDER_LABELS[open.folder] : ""}
        title={<span className="break-all">{open?.name}</span>}
        footer={
          open && (
            <>
              <button type="button" className={btnDark} onClick={() => copy(open.url)}>
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <a href={open.url} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
              <button
                type="button"
                disabled={deleting}
                onClick={() => remove(open)}
                className="ml-auto inline-flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] cursor-pointer disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
              </button>
            </>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <div className="bg-[#f2f2f2] border border-[#e4e4e4] flex items-center justify-center p-2">
              <img src={open.url} alt="" className="max-h-[45vh] max-w-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Size">{fmtBytes(open.size)}</Detail>
              <Detail label="Uploaded">{fmtDateTime(open.uploadedAt)}</Detail>
            </div>
            <div>
              <span className={labelCls}>Used on</span>
              {openUses.length ? (
                <ul className="space-y-1 text-sm font-bold text-black">
                  {openUses.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#8a8a8a]">Not used anywhere yet.</p>
              )}
            </div>
            <div>
              <span className={labelCls}>Image link</span>
              <input readOnly value={open.url} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} !text-xs`} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
