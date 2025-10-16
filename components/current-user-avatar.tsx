"use client";

import { useCurrentUserImage } from "@/hooks/use-current-user-image";
import { useCurrentUserName } from "@/hooks/use-current-user-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ComponentProps } from "react";

type CurrentUserAvatarProps = ComponentProps<typeof Avatar> & {
  src?: string | null;
  name?: string | null;
};

export const CurrentUserAvatar = ({
  src,
  name,
  ...props
}: CurrentUserAvatarProps) => {
  const profileImage = useCurrentUserImage();
  const fallbackName = useCurrentUserName();
  const displayName = name ?? fallbackName;
  const imageSrc = src ?? profileImage;
  const initials = displayName
    ?.split(" ")
    ?.map((word) => word[0])
    ?.join("")
    ?.toUpperCase();

  return (
    <Avatar {...props}>
      {imageSrc && <AvatarImage src={imageSrc} alt={initials} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};
