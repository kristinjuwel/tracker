import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  collection: {
    id: string;
    title: string;
    description: string | null;
    image: string | null; // emoji OR image URL
    created_at: string;
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

function IconRender({ image, alt }: { image: string | null; alt: string }) {
  if (!image) return null;

  if (isUrl(image)) {
    return (
      <div className="relative h-36 w-36 overflow-hidden rounded shrink-0">
        <Image
          src={image}
          alt={alt}
          fill
          className="object-cover"
          sizes="50px"
          unoptimized
        />
      </div>
    );
  }

  // emoji
  return <span className="text-9xl leading-none shrink-0">{image}</span>;
}

export function CollectionCard({ collection }: Props) {
  // Route to the collection's task page
  const href = `/tracker/tasks?collection=${collection.id}`;

  return (
    <Link
      href={href}
      className="flex flex-start justify-start focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl"
    >
      <Card className="hover:shadow-md transition h-full w-full">
        <CardHeader className="flex items-center gap-3 space-y-0">
          <IconRender image={collection.image} alt={collection.title} />
          <CardTitle className="text-base line-clamp-1">
            {collection.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collection.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No description
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
