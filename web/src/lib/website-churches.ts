import { churches as fallbackChurches } from "@/data/churches";
import { createSupabaseClient } from "@/lib/supabase/client";

export type WebsiteChurch = {
  slug: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  note: string;
  languages: string[];
};

type WebsiteChurchRow = {
  slug: string;
  display_name: string;
  venue_name: string | null;
  venue_note: string | null;
  address_line: string;
  postal_code: string;
  city: string;
  languages: string[] | null;
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

function getFallbackChurches(): WebsiteChurch[] {
  return fallbackChurches.map((church) => ({
    slug: church.slug,
    name: church.name,
    address: church.address,
    postalCode: church.postalCode,
    city: church.city,
    note: church.note,
    languages: [...church.languages],
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
          languages,
          sort_order
        `,
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        "Could not load website churches from Supabase:",
        error.message,
      );

      return getFallbackChurches();
    }

    const rows = data as WebsiteChurchRow[] | null;

    if (!rows || rows.length === 0) {
      console.warn(
        "No active website churches were returned. Using static fallback data.",
      );

      return getFallbackChurches();
    }

    return rows.map((church) => {
      const noteParts = [church.venue_name, church.venue_note].filter(
        (value): value is string => Boolean(value),
      );

      return {
        slug: church.slug,
        name: church.display_name,
        address: church.address_line,
        postalCode: church.postal_code,
        city: church.city,
        note:
          noteParts.length > 0
            ? noteParts.join(" · ")
            : "Gemeinde der Reformationbewegung",
        languages: (church.languages ?? []).map(
          (language) => languageLabels[language] ?? language.toUpperCase(),
        ),
      };
    });
  } catch (error) {
    console.error(
      "Unexpected error while loading website churches:",
      error,
    );

    return getFallbackChurches();
  }
}