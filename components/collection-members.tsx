"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

type Member = {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export function CollectionMembers({
  collectionId,
  currentUserId,
}: {
  collectionId: string;
  currentUserId: string;
}) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [canManage, setCanManage] = useState(false); // owner/editor
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("viewer");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    // 1) Fetch membership rows (user_collections)
    const { data: ucRows = [] } = await supabase
      .from("user_collections")
      .select("user_id, role")
      .eq("col_id", collectionId);

    // 2) Fetch profiles of these users
    const ids = (ucRows as Array<{ user_id: string }>).map((r) => r.user_id);
    let profiles: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }[] = [];

    if (ids.length) {
      const res = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", ids);
      profiles = res.data ?? [];
    }

    // 3) Build member list
    const merged: Member[] = (
      ucRows as Array<{
        user_id: string;
        role: Member["role"];
      }>
    ).map((u) => {
      const p = profiles.find((x) => x.id === u.user_id);
      return {
        user_id: u.user_id,
        role: (u.role as Member["role"]) ?? "viewer",
        first_name: p?.first_name ?? null,
        last_name: p?.last_name ?? null,
        email: p?.email ?? null,
      };
    });
    setMembers(merged);

    // 4) Determine perms: current user is owner or editor?
    const myself = merged.find((m) => m.user_id === currentUserId);
    setCanManage(myself?.role === "owner" || myself?.role === "editor");
  }, [collectionId, currentUserId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = (m: Member) =>
    m.first_name || m.last_name
      ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
      : m.email ?? m.user_id;

  const onInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);

    // Find profile by email
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim())
      .maybeSingle();

    if (profErr || !prof?.id) {
      alert("User not found. The user must sign up first so a profile exists.");
      setSaving(false);
      return;
    }

    // Insert membership; RLS: only owner can add by our policies
    const { error: insErr } = await supabase.from("user_collections").insert({
      user_id: prof.id,
      col_id: collectionId,
      role,
    });

    if (insErr) {
      alert(
        insErr.message || "Failed to add user. You may not have permission."
      );
    } else {
      await load();
      setOpen(false);
      setEmail("");
      setRole("viewer");
    }
    setSaving(false);
  };

  const onChangeRole = async (userId: string, nextRole: Member["role"]) => {
    // Upsert via API route preserves RLS on server side
    const res = await fetch(`/api/collections/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        col_id: collectionId,
        user_id: userId,
        role: nextRole,
      }),
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Failed to update role");
      return;
    }
    await load();
  };

  const onRemove = async (userId: string) => {
    const confirm = window.confirm("Remove this member from the collection?");
    if (!confirm) return;
    const res = await fetch(
      `/api/collections/members/${userId}?col_id=${collectionId}`,
      {
        method: "DELETE",
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Failed to remove member");
      return;
    }
    await load();
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Members</div>
          <div className="text-xs text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </div>
        </div>

        {canManage ? (
          <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            Add Member
          </Button>
        ) : null}
      </div>

      <div className="mt-3 divide-y rounded border">
        {members.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No members yet.
          </div>
        ) : (
          members.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <div className="truncate">{displayName(m)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.email}
                </div>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs rounded border bg-background px-2 py-1 capitalize"
                    value={m.role}
                    onChange={(e) =>
                      onChangeRole(m.user_id, e.target.value as Member["role"])
                    }
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="owner">Owner</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(m.user_id)}
                    disabled={m.user_id === currentUserId}
                    title={
                      m.user_id === currentUserId
                        ? "You cannot remove yourself"
                        : "Remove member"
                    }
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="text-xs capitalize text-muted-foreground">
                  {m.role}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-y-auto max-h-60">
          <DialogHeader>
            <DialogTitle>Invite to Collection</DialogTitle>
            <DialogDescription>
              Grant access so they can view/assign tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as Member["role"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
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
              onClick={onInvite}
              disabled={saving || !email.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? "Adding..." : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
