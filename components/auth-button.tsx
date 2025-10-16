// components/auth-button.tsx
import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { ProfileMenu } from "./profile-menu";
import { unstable_noStore as noStore } from "next/cache";

export async function AuthButton() {
  noStore(); // prevent caching this server component

  const supabase = await createClient();

  // 🔄 Always get fresh user with latest metadata
  const { data: { user } = {} } = await supabase.auth.getUser();

  const getFirstName = () => {
    if (user?.user_metadata?.first_name) return user.user_metadata.first_name;
    const email = user?.email || "";
    const namePart = email.split("@")[0];
    return namePart
      ? namePart.charAt(0).toUpperCase() + namePart.slice(1)
      : "User";
  };

  return user ? (
    <ProfileMenu
      user={{ email: user.email || undefined }}
      firstName={getFirstName()}
      lastName={user?.user_metadata?.last_name}
      avatarUrl={user?.user_metadata?.avatar_url}
    />
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
