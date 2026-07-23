import { churches as fallbackChurches } from "@/data/churches";
import { createSupabaseClient } from "@/lib/supabase/client";

const SWISS_COUNTRY_CODE = "CH";

export type WebsiteChurch = {
  slug: string;
  name: string;
  region: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  description: string;
  meetingTime: string;
  note: string;
  languages: string[];
  mapUrl: string;
};

export type PrayerSubmissionChurch = {
  groupId: string;
  name: string;
};

type WebsiteChurchRow = {
  slug: string;
  display_name: string;
  venue_name: string | null;
  venue_note: string | null;
  address_line: string;
  postal_code: string;
  city: string;
  country_code: string;
  languages: string[] | null;
  meeting_information: string | null;
  summary: string | null;
  map_url: string | null;
  sort_order: number;
};

const languageLabels: Record<string, string> = {
  de: "Deutsch",
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  it: "Italiano",
};

function isSwissCountryName(country: string): boolean {
  const normalizedCountry = country.trim().toLowerCase();

  return [
    "schweiz",
    "switzerland",
    "suisse",
    "svizzera",
  ].includes(normalizedCountry);
}

function createMapUrl(
  venueName: string | null,
  address: string,
  postalCode: string,
  city: string,
): string {
  const location = [
    venueName,
    address,
    `${postalCode} ${city}`,
    "Schweiz",
  ]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    location,
  )}`;
}

function getFallbackChurches(): WebsiteChurch[] {
  return fallbackChurches
    .filter((church) => isSwissCountryName(church.country))
    .map((church) => ({
      slug: church.slug,
      name: church.name,
      region: church.region,
      address: church.address,
      postalCode: church.postalCode,
      city: church.city,
      country: church.country,
      description: church.description,
      meetingTime: church.meetingTime,
      note: church.note,
      languages: [...church.languages],
      mapUrl: church.mapUrl,
    }));
}

export async function getWebsiteChurches(): Promise<WebsiteChurch[]> {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("website_churches")
      .select(
        `
          slug,
          display_name,
          venue_name,
          venue_note,
          address_line,
          postal_code,
          city,
          country_code,
          languages,
          meeting_information,
          summary,
          map_url,
          sort_order
        `,
      )
      .eq("country_code", SWISS_COUNTRY_CODE)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        "Could not load Swiss website churches from Supabase:",
        error.message,
      );

      return getFallbackChurches();
    }

    const rows = data as WebsiteChurchRow[] | null;

    if (!rows || rows.length === 0) {
      console.warn(
        "No active Swiss website churches were returned. Using static fallback data.",
      );

      return getFallbackChurches();
    }

    return rows.map((church) => {
      const region =
        church.display_name.replace(/^Gemeinde\s+/i, "").trim() ||
        church.city;

      const noteParts = [
        church.venue_name,
        church.venue_note,
      ].filter((value): value is string => Boolean(value));

      const languages = (church.languages ?? []).map(
        (language) =>
          languageLabels[language] ?? language.toUpperCase(),
      );

      return {
        slug: church.slug,
        name: church.display_name,
        region,
        address: church.address_line,
        postalCode: church.postal_code,
        city: church.city,
        country: "Schweiz",
        description:
          church.summary ??
          `${church.display_name} ist eine Gemeinde der Siebenten Tags Adventisten der Reformationbewegung in der Schweiz.`,
        meetingTime:
          church.meeting_information ??
          "Gottesdienstzeiten bitte vor dem Besuch erfragen.",
        note:
          noteParts.length > 0
            ? noteParts.join(" · ")
            : "Versammlungsort der Gemeinde",
        languages,
        mapUrl:
          church.map_url ??
          createMapUrl(
            church.venue_name,
            church.address_line,
            church.postal_code,
            church.city,
          ),
      };
    });
  } catch (error) {
    console.error(
      "Unexpected error while loading Swiss website churches:",
      error,
    );

    return getFallbackChurches();
  }
}
export async function getPrayerSubmissionChurches(): Promise<
  PrayerSubmissionChurch[]
> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("website_churches")
      .select("group_id, display_name, sort_order")
      .eq("country_code", SWISS_COUNTRY_CODE)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        "Could not load churches for the prayer submission form:",
        error.message,
      );
      return [];
    }

    return ((data as {
      group_id: string;
      display_name: string;
    }[] | null) ?? []).map((church) => ({
      groupId: church.group_id,
      name: church.display_name,
    }));
  } catch (error) {
    console.error(
      "Unexpected error while loading prayer submission churches:",
      error,
    );
    return [];
  }
}
