import { pageLocale } from "@/shared/i18n/server";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { t } = await pageLocale(params);
  return { title: t.privacy };
}

/** /:locale/privacy: the privacy information, rendered in the selected language. */
export default async function Legal({ params }: { params: Promise<{ locale: string }> }) {
  const { t } = await pageLocale(params);
  return (
    <article className="legal">
      <h1>{t.privacy}</h1>
      <p>
        <small>{t.legalUpdated}</small>
      </p>
      <p>{t.privacyBody}</p>
    </article>
  );
}
