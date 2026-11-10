import React, { useMemo, useState } from "react";
import { Copy, ImageOff, Images, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { MediaItem } from "../../../services/adminMediaService";
import { Detail, Drawer, EmptyState, IconButton, PageHeader, SearchInput, Toolbar, btnOutline, fmtDateTime } from "../../admin/ui";
import { MediaGrid, NotConfiguredNotice, UploadButton, filterMedia } from "../../admin/media/MediaPicker";
import { fmtBytes, removeFromLibrary, useMediaLibrary } from "../../admin/media/mediaStore";
import { useOrg } from "../OrganizerContext";

/** The organiser's own images — logos, posters, photos. Only they (and the
 *  Jazba team) can see this folder. */
export default function OrgMediaPage() {
  const { events, org, notify, fail } = useOrg();
  const lib = useMediaLibrary();
  const [q, setQ] = useState("");
  const [openUrl, setOpenUrl] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Where each image is used on the organiser's events and profile.
  const usage = useMemo(() => {
    const m = new Map<string, string[]>();
    const add = (url: string | undefined, where: string) => {
      if (!url) return;
      m.set(url, [...(m.get(url) || []), where]);
    };
    add(org.logoUrl, "Your logo");
    add(org.bannerUrl, "Your page banner");
    for (const e of events) {
      add(e.bannerImage || e.image, `${e.title} — cover`);
      for (const g of e.gallery || []) add(g, `${e.title} — gallery`);
      for (const l of e.lineup || []) add(l.avatar, `${e.title} — ${l.name}`);
    }
    return m;
  }, [events, org]);

  const shown = filterMedia(lib.items, "all", q);
  const open = lib.items.find((i) => i.url === openUrl) || null;

  const uploaded = (items: MediaItem[]) => {
    if (items.length) notify(items.length === 1 ? "Image uploaded." : `${items.length} images uploaded.`);
  };

  const remove = async (item: MediaItem) => {
    const used = usage.get(item.url) || [];
    if (!window.confirm(used.length ? `This image is used on:\n• ${used.join("\n• ")}\n\nDelete it anyway?` : "Delete this image? This can’t be undone.")) return;
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

  return (
    <div>
      <PageHeader
        title="Media"
        sub={
          lib.configured && lib.status === "ready"
            ? `${lib.items.length} image${lib.items.length === 1 ? "" : "s"} · ${fmtBytes(lib.items.reduce((s, i) => s + i.size, 0))}. Upload here or from any image field — images are kept for reuse.`
            : "Your logos, posters and photos. Only you and the Jazba team can see them."
        }
        actions={
          lib.configured ? (
            <>
              <UploadButton folder="partners" multiple onUploaded={uploaded} label="Upload images" />
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
        <div className="bg-white border border-[#e4e4e4]">
          <Toolbar>
            <SearchInput value={q} onChange={setQ} placeholder="Search file names…" />
          </Toolbar>
          {lib.status === "loading" || lib.status === "idle" ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#8a8a8a]" />
            </div>
          ) : lib.status === "error" ? (
            <div className="py-14">
              <EmptyState icon={ImageOff} title="Couldn’t load your images" sub={lib.error} />
            </div>
          ) : shown.length === 0 ? (
            <div className="py-14">
              <EmptyState icon={Images} title={lib.items.length ? "No images match" : "No images yet"} sub="Upload your logo, event posters and photos." />
            </div>
          ) : (
            <div className="p-4">
              <MediaGrid items={shown} usage={usage} onPick={(item) => setOpenUrl(item.url)} />
            </div>
          )}
        </div>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenUrl("")}
        eyebrow="Image"
        title={open?.name || "Image"}
        footer={
          open ? (
            <>
              <button
                type="button"
                className={btnOutline}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(open.url);
                    notify("Image link copied.");
                  } catch {
                    /* select manually */
                  }
                }}
              >
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <button type="button" disabled={deleting} className="text-xs font-bold text-[#7a2f2f] hover:bg-[#f7ecec] px-3 py-2 cursor-pointer flex items-center gap-1.5" onClick={() => remove(open)}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          ) : undefined
        }
      >
        {open && (
          <div className="space-y-4">
            <img src={open.url} alt="" className="w-full max-h-80 object-contain bg-[#f7f7f7]" />
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Size">{fmtBytes(open.size)}</Detail>
              <Detail label="Uploaded">{fmtDateTime(open.uploadedAt)}</Detail>
            </div>
            <Detail label="Used on">{(usage.get(open.url) || []).join(", ") || "Not used yet"}</Detail>
          </div>
        )}
      </Drawer>
    </div>
  );
}
