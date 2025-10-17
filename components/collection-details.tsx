"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionMembers } from "@/components/collection-members";

type Props = {
  collectionId: string;
  userId: string;
  canEdit: boolean;
  initial: {
    title: string;
    description: string | null;
    image: string | null; // emoji or URL
  };
};

function isUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function CollectionDetails({
  collectionId,
  userId,
  canEdit,
  initial,
}: Props) {
  const supabase = createClient();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [image, setImage] = useState<string | null>(initial.image ?? null);

  const [open, setOpen] = useState(false);
  const [iconOrUrl, setIconOrUrl] = useState(initial.image ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const previewToShow = useMemo(() => {
    if (filePreview) return filePreview;
    if (iconOrUrl && isUrl(iconOrUrl)) return iconOrUrl;
    return null;
  }, [filePreview, iconOrUrl]);

  const handlePickFile = (f: File | null) => {
    setFile(f);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  };

  const uploadToStorage = async (f: File): Promise<string> => {
    const bucket = "collection-images"; // ensure bucket exists
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "image/*",
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const onSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let finalImage: string | null = null;
      if (file) {
        finalImage = await uploadToStorage(file);
      } else if (iconOrUrl.trim()) {
        finalImage = iconOrUrl.trim(); // emoji or URL
      } else {
        finalImage = null;
      }

      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          image: finalImage,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to update collection");
      }
      const updated: {
        title: string;
        description: string | null;
        image: string | null;
      } = await res.json();
      setTitle(updated.title);
      setDescription(updated.description ?? "");
      setImage(updated.image ?? null);
      setOpen(false);
      setFile(null);
      if (filePreview) URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Image/emoji */}
        {image ? (
          isUrl(image) ? (
            <Image
              src={image}
              alt={title}
              width={72}
              height={72}
              className="h-18 w-18 rounded object-cover"
              sizes="72px"
              unoptimized
            />
          ) : (
            <span className="text-6xl leading-none">{image}</span>
          )
        ) : (
          <div className="h-18 w-18 rounded bg-muted/60 flex items-center justify-center text-muted-foreground">
            <span className="text-xs">No image</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  {description}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground italic">
                  No description
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEdit ? (
                <Button size="sm" onClick={() => setOpen(true)}>
                  Edit
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMembersOpen(true)}
              >
                Members
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-60 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update the title, description, or image for this collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Collection name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon-or-url">Icon (emoji or image URL)</Label>
              <Input
                id="icon-or-url"
                value={iconOrUrl}
                onChange={(e) => setIconOrUrl(e.target.value)}
                placeholder="😀 or https://…/image.png"
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
              {previewToShow ? (
                <div className="mt-2">
                  <Image
                    src={previewToShow}
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
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !title.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-2xl max-h-90 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collection Members</DialogTitle>
            <DialogDescription>
              Invite people, change roles, or remove members.
            </DialogDescription>
          </DialogHeader>

          <CollectionMembers
            collectionId={collectionId}
            currentUserId={userId}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default CollectionDetails;
