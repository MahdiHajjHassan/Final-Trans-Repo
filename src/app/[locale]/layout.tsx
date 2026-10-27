import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;if(!isLocale(locale))notFound();const t=dictionaries[locale];
  return {title:{default:t.brand,template:"%s · "+t.brand},description:t.metadataDescription};
}
// Account navigation and theme/language preferences join this header with the auth package.
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();const t=dictionaries[locale];
  return <><a className="skip-link" href="#main">{t.skip}</a>
    <header className="site-header"><div className="shell header-inner">
      <Link className="brand" href={"/"+locale+"/play"}>{t.brand}</Link>
      <nav aria-label={t.mainNavigation} className="main-nav"><Link href={"/"+locale+"/play"}>{t.board}</Link></nav>
    </div></header>
    <main className="shell main" id="main">{children}</main>
    <footer className="shell footer">{(["privacy","terms"] as const).map(kind=><Link key={kind} href={"/"+locale+"/"+kind} target="_blank" rel="noopener noreferrer" title={t.opensNewTab}>{t[kind]}<span className="sr-only"> ({t.opensNewTab})</span></Link>)}</footer>
  </>;
}
