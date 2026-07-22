import { createSupabaseClient } from "@/lib/supabase/client";

const WEBSITE_LOCALE = "de";
const SWISS_COUNTRY_CODE = "CH";

export type WebsiteEvent = {
  slug: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: string;
  churchName: string | null;
  churchSlug: string | null;
  registrationInformation: string | null;
  imageUrl: string | null;
};

type WebsiteEventRow = {
  group_id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  event_type: string | null;
  image_url: string | null;
  registration_information: string | null;
};

type WebsiteChurchRow = {
  group_id: string;
  slug: string;
  display_name: string;
};

const eventTypeLabels: Record<string, string> = {
  sabbath: "Gottesdienst",
  prayer_meeting: "Gebet",
  bible_study: "Bibelstudium",
  youth: "Jugend",
  special: "Besondere Veranstaltung",
  conference: "Konferenz",
};

function formatEventDate(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zurich",
  });

  const calendarDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Zurich",
  });

  if (!endsAt || calendarDate.format(startsAt) === calendarDate.format(endsAt)) {
    return formatter.format(startsAt);
  }

  return `${formatter.format(startsAt)} – ${formatter.format(endsAt)}`;
}

function formatEventTime(startsAt: Date, endsAt: Date | null): string {
  const formatter = new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  });
  const start = formatter.format(startsAt);

  return endsAt ? `${start} – ${formatter.format(endsAt)} Uhr` : `${start} Uhr`;
}

export async function getWebsiteEvents(): Promise<WebsiteEvent[]> {
  try {
    const supabase = createSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("website_events")
      .select("group_id, slug, title, description, starts_at, ends_at, location, event_type, image_url, registration_information")
      .eq("locale", WEBSITE_LOCALE)
      .eq("is_active", true)
      .or(`starts_at.gte.${now},ends_at.gte.${now}`)
      .order("starts_at", { ascending: true });

    if (error) {
      console.error("Could not load Swiss website events from Supabase:", error.message);
      return [];
    }

    const eventRows = data as WebsiteEventRow[] | null;
    if (!eventRows || eventRows.length === 0) return [];

    const groupIds = Array.from(new Set(eventRows.map((event) => event.group_id)));
    const { data: churchData, error: churchError } = await supabase
      .from("website_churches")
      .select("group_id, slug, display_name")
      .in("group_id", groupIds)
      .eq("country_code", SWISS_COUNTRY_CODE)
      .eq("is_active", true);

    if (churchError) {
      console.error("Could not match website events to Swiss churches:", churchError.message);
      return [];
    }

    const churchesByGroup = new Map(
      ((churchData as WebsiteChurchRow[] | null) ?? []).map((church) => [church.group_id, church]),
    );

    const events = eventRows.flatMap((event) => {
      const church = churchesByGroup.get(event.group_id);
      if (!church) return [];

      const startsAt = new Date(event.starts_at);
      const endsAt = event.ends_at ? new Date(event.ends_at) : null;

      return [{
        slug: event.slug,
        title: event.title,
        description: event.description ?? "Weitere Informationen folgen.",
        date: formatEventDate(startsAt, endsAt),
        time: formatEventTime(startsAt, endsAt),
        location: event.location ?? church.display_name,
        type: eventTypeLabels[event.event_type ?? ""] ?? "Veranstaltung",
        churchName: church.display_name,
        churchSlug: church.slug,
        registrationInformation: event.registration_information,
        imageUrl: event.image_url,
      }];
    });

    return events;
  } catch (error) {
    console.error("Unexpected error while loading Swiss website events:", error);
    return [];
  }
}
