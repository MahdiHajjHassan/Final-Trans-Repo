import { handleGame } from "@/server/services";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handleGame("read",request,(await params).id);}
