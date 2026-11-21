import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/current";
import { AppError, errorCode } from "@/server/errors";
import { certificateForDownload, renderCertificatePdf } from "@/server/services/certificates";

export async function GET(_req: Request, ctx: RouteContext<"/api/certificates/[number]/pdf">) {
  try {
    const actor = await requireUser();
    const { number } = await ctx.params;
    const cert = await certificateForDownload(actor, number);
    const bytes = await renderCertificatePdf(cert);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="certificate-${cert.number}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errorCode(e) }, { status: e instanceof AppError ? e.status : 500 });
  }
}
