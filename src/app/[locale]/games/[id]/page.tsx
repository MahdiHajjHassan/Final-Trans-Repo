import { notFound,redirect } from "next/navigation";
import { pageLocale } from "@/i18n/server";
import { requirePageActor } from "@/server/auth/page";
import { getServices } from "@/server/services";
import { DomainError } from "@/server/errors";
import { LiveGame } from "@/features/games/live-game";
export const metadata={robots:{index:false,follow:false}};
export default async function Match({params}:{params:Promise<{locale:string;id:string}>}) {
  const {locale}=await pageLocale(params),{id}=await params,actor=await requirePageActor(locale);
  let initial;
  try {initial=await (await getServices()).games.read(actor,id);}
  catch(error){if(error instanceof DomainError){if(error.code==="UNAUTHENTICATED")redirect("/"+locale+"/login");if(["NOT_FOUND","FORBIDDEN","VALIDATION"].includes(error.code))notFound();}throw error;}
  return <LiveGame key={id+locale} initial={initial} locale={locale}/>;
}
