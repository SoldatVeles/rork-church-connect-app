import Image from "next/image";

const eventImages = [
  "/images/website/open-bible-study.webp",
  "/images/website/event-family.webp",
  "/images/website/event-youth-mountains.webp",
  "/images/website/community-prayer.webp",
];

export function getChurchCityImage(identity: string): string {
  const normalizedIdentity = identity.toLowerCase();

  if (
    normalizedIdentity.includes("genève") ||
    normalizedIdentity.includes("geneve") ||
    normalizedIdentity.includes("genf")
  ) {
    return "/images/website/city-geneva.webp";
  }

  if (normalizedIdentity.includes("bern")) {
    return "/images/website/city-bern.webp";
  }

  return "/images/website/city-zurich.webp";
}

export function ChurchCityImage({
  identity,
  alt,
}: {
  identity: string;
  alt: string;
}) {
  return (
    <Image
      src={getChurchCityImage(identity)}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
    />
  );
}

export function EventCoverImage({
  index,
  alt = "",
}: {
  index: number;
  alt?: string;
}) {
  return (
    <Image
      src={eventImages[index % eventImages.length]}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
    />
  );
}
