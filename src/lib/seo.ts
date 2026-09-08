const SITE = "Uendi Platform";

/**
 * Metadata e njësuar për çdo faqe (titull, përshkrim, Open Graph, Twitter).
 * Përdoret brenda `head: () => ({ meta: pageMeta(...) })` në route-t.
 */
export function pageMeta(title: string, description: string) {
  const fullTitle = `${title} — ${SITE}`;
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];
}
