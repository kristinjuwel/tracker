"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface ProfileMenuProps {
  user: { email?: string };
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
}

export function ProfileMenu({ user, firstName, lastName }: ProfileMenuProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newFirstName, setNewFirstName] = useState(firstName || "");
  const [newLastName, setNewLastName] = useState(lastName || "");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Seed avatar URL from current session metadata
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const url = data.session?.user.user_metadata?.avatar_url as
        | string
        | undefined;
      if (url) setNewAvatarUrl(url);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: newFirstName,
          last_name: newLastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      // Update Supabase user metadata so avatar/name reflect immediately
      const fullName = `${newFirstName} ${newLastName}`.trim();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName || null,
          first_name: newFirstName || null,
          last_name: newLastName || null,
          avatar_url: newAvatarUrl || null,
        },
      });
      if (updateError) console.error(updateError);

      // 🔁 Force a fresh JWT with updated user_metadata
      await supabase.auth.refreshSession();

      setIsEditOpen(false);
      router.refresh();
      toast.success("Profile updated");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Initials are now handled inside CurrentUserAvatar

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <CurrentUserAvatar className="h-8 w-8" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{firstName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-full md:h-2/3 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your name and avatar to personalize your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <CurrentUserAvatar
                className="h-16 w-16"
                src={newAvatarUrl || null}
                name={`${newFirstName} ${newLastName}`}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  placeholder="Your first name"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  placeholder="Your last name"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input
                id="avatar-url"
                placeholder="https://example.com/avatar.jpg"
                value={newAvatarUrl}
                onChange={(e) => setNewAvatarUrl(e.target.value)}
              />
            </div>
            <div className="flex pt-2 justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
