import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { squarePublicConfig } from "@/lib/square";

export const GET = withAuth(async () => {
  return NextResponse.json(squarePublicConfig());
});
