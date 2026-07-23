import { createSupabaseClient } from "@/lib/supabase/client";

const WEBSITE_LOCALE = "de";
const SWISS_COUNTRY_CODE = "CH";

export type WebsitePrayer = {
  id: string;
  title: string;
  details: string;
  category: string;
  isAnswered: boolean;
  churchName: string;
  churchSlug: string;
};

type WebsitePrayerRow = {
  id: string;
  group_id: string;
  title: string;
  details: string | null;
  category: string | null;
  is_answered: boolean;
};

type WebsiteChurchRow = {
  group_id: string;
  slug: string;
  display_name: string;
};

export async function getWebsitePrayers(): Promise<WebsitePrayer[]> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("website_prayers")
      .select("id, group_id, title, details, category, is_answered")
      .eq("locale", WEBSITE_LOCALE)
      .eq("is_active", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error(
        "Could not load Swiss website prayers from Supabase:",
        error.message,
      );
      return [];
    }

    const prayerRows = data as WebsitePrayerRow[] | null;
    if (!prayerRows || prayerRows.length === 0) return [];

    const groupIds = Array.from(
      new Set(prayerRows.map((prayer) => prayer.group_id)),
    );
    const { data: churchData, error: churchError } = await supabase
      .from("website_churches")
      .select("group_id, slug, display_name")
      .in("group_id", groupIds)
      .eq("country_code", SWISS_COUNTRY_CODE)
      .eq("is_active", true);

    if (churchError) {
      console.error(
        "Could not match website prayers to Swiss churches:",
        churchError.message,
      );
      return [];
    }

    const churchesByGroup = new Map(
      ((churchData as WebsiteChurchRow[] | null) ?? []).map((church) => [
        church.group_id,
        church,
      ]),
    );

    return prayerRows.flatMap((prayer) => {
      const church = churchesByGroup.get(prayer.group_id);
      if (!church) return [];

      return [
        {
          id: prayer.id,
          title: prayer.title,
          details:
            prayer.details ??
            "Wir nehmen dieses Anliegen gemeinsam ins Gebet.",
          category: prayer.category ?? "Gebetsschwerpunkt",
          isAnswered: prayer.is_answered,
          churchName: church.display_name,
          churchSlug: church.slug,
        },
      ];
    });
  } catch (error) {
    console.error(
      "Unexpected error while loading Swiss website prayers:",
      error,
    );
    return [];
  }
}
