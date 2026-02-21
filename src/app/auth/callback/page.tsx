'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        const handleCallback = async () => {
            const hash = window.location.hash;

            if (hash && hash.includes('access_token=')) {
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                }
            }

            // 세션 처리 후 홈으로 이동
            window.location.href = '/';
        };

        handleCallback();
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0D8 100%)',
            fontFamily: "'Segoe UI', sans-serif",
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🐑</div>
                <div style={{ fontSize: '16px', color: '#B8924A', fontWeight: 600 }}>
                    로그인 처리 중...
                </div>
            </div>
        </div>
    );
}
