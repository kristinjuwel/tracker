"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { CollectionCard } from "./collection-card";
import { List, Grid2x2 } from "lucide-react";
import Image from "next/image";

type Collection = {
  id: string;
  title: string;
  description: string | null;
  image: string | null; // emoji OR image URL
  created_at: string;
};

function isUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function CollectionsClient({
  initialCollections,
  userId,
}: {
  initialCollections: Collection[];
  userId: string;
}) {
  const supabase = createClient();

  const [collections, setCollections] =
    useState<Collection[]>(initialCollections);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [iconOrUrl, setIconOrUrl] = useState(""); // emoji OR URL
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return collections;
    const q = query.toLowerCase();
    return collections.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
    );
  }, [query, collections]);

  const handlePickFile = (f: File | null) => {
    setFile(f);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  };

  const uploadToStorage = async (f: File): Promise<string> => {
    const bucket = "collection-images"; // MUST exist
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "image/*",
      });
    if (upErr) {
      if (
        (upErr as { message?: string }).message?.includes("Bucket not found")
      ) {
        throw new Error(
          "Bucket 'collection-images' not found. Create it in Supabase Storage."
        );
      }
      throw upErr;
    }

    // Public bucket URL
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    setSaving(true);

    let finalImage: string | null = null;
    const optimisticImage =
      filePreview || (iconOrUrl ? iconOrUrl.trim() : null);

    // optimistic row
    const optimistic: Collection = {
      id: `tmp-${crypto.randomUUID()}`,
      title: title.trim(),
      description: desc.trim() || null,
      image: optimisticImage,
      created_at: new Date().toISOString(),
    };
    setCollections((s) => [optimistic, ...s]);

    try {
      if (file) {
        finalImage = await uploadToStorage(file);
      } else if (iconOrUrl) {
        finalImage = iconOrUrl.trim(); // emoji or URL
      }

      const { data, error } = await supabase
        .from("collections")
        .insert({
          created_by: userId, // RLS
          title: optimistic.title,
          description: optimistic.description,
          image: finalImage ?? null,
        })
        .select("id, title, description, image, created_at")
        .single();

      if (error || !data) {
        setCollections((s) => s.filter((c) => c.id !== optimistic.id));
        alert("Failed to create collection");
      } else {
        setCollections((s) => [
          data,
          ...s.filter((c) => c.id !== optimistic.id),
        ]);
      }
    } catch (err) {
      setCollections((s) => s.filter((c) => c.id !== optimistic.id));
      alert((err as Error).message || "Failed to create collection");
    } finally {
      setSaving(false);
      setOpen(false);
      setTitle("");
      setDesc("");
      setIconOrUrl("");
      handlePickFile(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            placeholder="Search collections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-72"
          />
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <Grid2x2 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Add Collection
        </Button>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No collections found.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3">
          {filtered.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {filtered.map((c) => {
            const href = `/tracker/collections/${c.id}`;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                {/* left */}
                <div className="flex items-center gap-2">
                  {c.image ? (
                    isUrl(c.image) ? (
                      <Image
                        src={c.image}
                        alt={c.title}
                        width={24}
                        height={24}
                        className="h-12 w-12 rounded object-cover"
                        sizes="24px"
                        unoptimized
                      />
                    ) : (
                      <span className="text-4xl">{c.image}</span>
                    )
                  ) : null}
                  <div>
                    <a
                      href={href}
                      className="font-semibold break-words hover:underline"
                    >
                      {c.title}
                    </a>
                    {c.description ? (
                      <p className="mt-1 text-sm text-muted-foreground break-words">
                        {c.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                {/* right */}
                <div className="text-xs text-muted-foreground sm:text-right">
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
            <DialogDescription>
              Add a title, optional description, and an icon (emoji/URL) or
              upload an image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Marketing Assets"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Short description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon-or-url">Icon (emoji or image URL)</Label>
              <Input
                id="icon-or-url"
                value={iconOrUrl}
                onChange={(e) => setIconOrUrl(e.target.value)}
                placeholder="😀 or https://…/icon.png"
              />
              <div className="text-xs text-muted-foreground">
                You can paste an emoji/URL here, or upload a file below.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload image (optional)</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
              {filePreview ? (
                <div className="mt-2">
                  <Image
                    src={filePreview}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setTitle("");
                setDesc("");
                setIconOrUrl("");
                handlePickFile(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !title.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
