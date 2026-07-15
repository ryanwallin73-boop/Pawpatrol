import { NextResponse } from "next/server";
import { generateMonth } from "@/lib/generateMonth";

export async function POST(request) {
  const { date } = await request.json();
  if (!date) {
    return NextResponse.json({ error: "Date is required." }, { status: 400 });
  }

  const result = await generateMonth(date);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...result });
}
