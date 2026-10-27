"use client";
import { useParams } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { Alert, Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { const { locale } = useParams(); const t = dictionaries[isLocale(locale) ? locale : "en"]; return <Alert tone="error"><div className="stack"><h1>{t.INTERNAL}</h1><Button onClick={reset}>{t.retry}</Button></div></Alert>; }
