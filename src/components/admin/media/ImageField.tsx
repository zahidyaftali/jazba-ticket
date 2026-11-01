import React, { useEffect, useRef, useState } from "react";
import { Images, Loader2, Upload, X } from "lucide-react";
import type { MediaFolder } from "../../../services/adminMediaService";
import { Field, inputCls } from "../ui";
import { MediaPicker, useUploader } from "./MediaPicker";

const smallBtn =
  "inline-flex items-center gap-1.5 py-1.5 px-3 text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

/**
 * An image field: upload a file, pick one from the media library, or paste a
 * link. Uploads are saved to the library (in `folder`) for reuse.
 */
export function ImageUrlField({
  label,
  value,
  onChange,
  folder,
  wide = false,
  placeholder = "…or paste an image link",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  folder: MediaFolder;
  wide?: boolean;
  placeholder?: string;
}) {
  const [broken, setBroken] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploader = useUploader();
  useEffect(() => setBroken(false), [value]);

  const upload = async (files: FileList | File[] | null) => {
    const [item] = await uploader.uploadFiles(Array.from(files || []).slice(0, 1), folder);
    if (item) onChange(item.url);
  };

  return (
    <Field label={label}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          title={uploader.busy ? "Uploading…" : "Upload an image (or drop one here)"}
          disabled={uploader.busy}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
          className={`shrink-0 bg-[#f2f2f2] border overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${
            dragging ? "border-black border-dashed bg-[#fffbd6]" : "border-[#e4e4e4] hover:border-black"
          } ${wide ? "w-28 h-[68px]" : "w-[68px] h-[68px]"}`}
        >
          {uploader.busy ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#666]" />
          ) : value && !broken ? (
            <img src={value} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          ) : (
            <span className="text-[9px] font-bold text-[#8a8a8a] flex flex-col items-center gap-1">
              {value ? (
                "Bad link"
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Add
                </>
              )}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${smallBtn} bg-black hover:bg-neutral-800 text-white`} disabled={uploader.busy} onClick={() => fileRef.current?.click()}>
              {uploader.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploader.busy ? "Uploading…" : "Upload"}
            </button>
            <button type="button" className={`${smallBtn} bg-white border border-black hover:bg-[#f7f7f7] text-black`} onClick={() => setPicker(true)}>
              <Images className="w-3.5 h-3.5" /> Library
            </button>
            {value && (
              <button type="button" className={`${smallBtn} text-[#7a2f2f] hover:bg-[#f7ecec]`} onClick={() => onChange("")}>
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <input type="text" className={`${inputCls} !py-2 !text-xs`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const files = Array.from<File>(e.target.files || []);
            e.target.value = "";
            void upload(files);
          }}
        />
      </div>
      {picker && (
        <MediaPicker
          folder={folder}
          onClose={() => setPicker(false)}
          onSelect={(urls) => {
            if (urls[0]) onChange(urls[0]);
            setPicker(false);
          }}
        />
      )}
    </Field>
  );
}

/** A compact button that opens the media library — for tight rows and galleries. */
export function MediaPickButton({
  folder,
  multiple = false,
  onSelect,
  label,
  className,
}: {
  folder: MediaFolder;
  multiple?: boolean;
  onSelect: (urls: string[]) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title={label || "Choose from the media library"}
        aria-label={label || "Choose from the media library"}
        onClick={() => setOpen(true)}
        className={
          className ||
          `${smallBtn} ${label ? "" : "!px-2"} bg-white border border-[#e4e4e4] hover:border-black text-black shrink-0`
        }
      >
        <Images className="w-3.5 h-3.5" />
        {label}
      </button>
      {open && (
        <MediaPicker
          folder={folder}
          multiple={multiple}
          onClose={() => setOpen(false)}
          onSelect={(urls) => {
            if (urls.length) onSelect(urls);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
