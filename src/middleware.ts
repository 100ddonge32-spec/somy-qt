import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { searchParams, pathname } = request.nextUrl;

    // 1. 쿼리 파라미터에서 church_id 추출
    let churchId = searchParams.get('church_id') || searchParams.get('church');

    const requestHeaders = new Headers(request.headers);

    // 2. 경로(Path)에서 church_id 추출 (예: /mychurch)
    if (!churchId) {
        const pathParts = pathname.split('/').filter(Boolean);
        // /api, /auth, /_next 등 시스템 경로는 제외
        if (pathParts.length === 1 && !['api', 'auth', 'manifest.json', 'somy.png', 'og-image.png', 'sw.js', 'favicon.ico'].includes(pathParts[0].toLowerCase())) {
            churchId = pathParts[0];
            
            // ✅ [핵심 수정] Next.js 서버리스 환경에서는 /[church_id] 폴더가 없으므로 404 에러가 발생합니다.
            // URL 주소창은 그대로 유지하면서 내부적으로만 '/' (page.tsx) 로 라우팅되도록 Rewrite 처리합니다.
            requestHeaders.set('x-church-id', churchId);
            const url = request.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.rewrite(url, {
                request: { headers: requestHeaders },
            });
        }
    }

    // 3. 헤더에 church_id 주입 (기본값 jesus-in)
    requestHeaders.set('x-church-id', churchId || 'jesus-in');

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// 미들웨어가 실행될 경로 설정
export const config = {
    matcher: [
        /*
         * 다음으로 시작하는 경로를 제외한 모든 요청 경로와 일치:
         * - api (API 라우트)
         * - _next/static (정적 파일)
         * - _next/image (이미지 최적화 파일)
         * - favicon.ico (파비콘 파일)
         * - 기타 최상위 정적 에셋들 (sw.js, png, svg 등)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)',
    ],
};
