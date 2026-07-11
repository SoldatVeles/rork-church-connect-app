export const siteConfig = {
  name: "Siebenten Tags Adventisten Reformationsbewegung Schweiz",
  shortName: "STA Reformationsbewegung Schweiz",
  domain: "sdarm.ch",
  email: "info@sdarm.ch",

    freeBooks: {
    title: "Kostenlose Bücher bestellen",
    shortTitle: "Kostenlose Bücher",
    href: "/kostenlose-buecher",
    description:
        "Bestellen Sie kostenlos ausgewählte christliche Bücher und Bibelmaterial für Ihr persönliches Studium.",
    },

  defaultLanguage: "de",

  languages: [
    {
      code: "de",
      label: "Deutsch",
      enabled: true,
    },
    {
      code: "fr",
      label: "Français",
      enabled: false,
    },
    {
      code: "en",
      label: "English",
      enabled: false,
    },
    {
      code: "es",
      label: "Español",
      enabled: false,
    },
    {
      code: "pt",
      label: "Português",
      enabled: false,
    },
    {
      code: "it",
      label: "Italiano",
      enabled: false,
    },
  ],

  navigation: [
    { name: "Startseite", href: "/" },
    { name: "Gemeinden", href: "/gemeinden" },
    { name: "Veranstaltungen", href: "/veranstaltungen" },
    { name: "Gebet", href: "/gebet" },
    { name: "Über uns", href: "/ueber-uns" },
    { name: "Glaubenspunkte", href: "/glaubenspunkte" },
    { name: "Ressourcen", href: "/ressourcen" },
    { name: "Kontakt", href: "/kontakt" },
  ],
};