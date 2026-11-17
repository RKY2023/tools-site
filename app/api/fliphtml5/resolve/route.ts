import { NextResponse } from "next/server";
import { resolveBook } from "@/lib/fliphtml5/resolve";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { input } = (await req.json()) as { input?: string };
    if (!input || typeof input !== "string" || input.length > 500) {
      return NextResponse.json({ error: "Provide a FlipHTML5 link or book ID" }, { status: 400 });
    }
    return NextResponse.json(await resolveBook(input));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
