import { handleGame } from "@/server/services";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return handleGame("move",request,(await params).id);}
