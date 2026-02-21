'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        const handleCallback = async () => {
            // query param에서 token 읽기
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (token) {
                // verifyOtp으로 세션 직접 생성 (해시 기반 리다이렉트 없음)
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: token,
                    type: 'email',
                });
                if (error) {
                    console.error('OTP 검증 실패:', error.message);
                }
            }

            // 세션 처리 완료 후 홈으로 이동
            window.location.replace('/');
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
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐑</div>
                <div style={{ fontSize: '16px', color: '#B8924A', fontWeight: 600 }}>
                    로그인 처리 중...
                </div>
                <div style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                    잠시만 기다려주세요
                </div>
            </div>
        </div>
    );
}
