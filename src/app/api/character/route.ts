import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    // 생성된 소미 캐릭터 이미지를 서빙
    const imagePath = "/Users/macbook/.gemini/antigravity/brain/4c4d6efb-e2cd-4d51-8224-4cfe3efc4dd6/somy_character_1771587459514.png";

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
}
