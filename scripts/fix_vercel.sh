#!/bin/bash

# Vercel 환경변수 자동 설정 스크립트 (by 이과장)

echo "🚀 이과장이 서버 설정을 시작합니다..."

# .env.local에서 값 읽기
URL="https://lfjrfyylsxhvwosdpujv.supabase.co"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2VzZSIsInJlZiI6ImxmanJmeXlsc3hodndvc2RwdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA3NDUsImV4cCI6MjA4NTgzNjc0NX0.CodaJlrJ2loQTzQZE24IHs7H-DpF1Zu_PMSiRL3cRPw"
SERVICE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2VzZSIsInJlZiI6ImxmanJmeXlsc3hodndvc2RwdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI2MDc0NSwiZXhwIjoyMDg1ODM2NzQ1fQ.LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI"

echo "1. 기존 잘못된 설정 제거 중..."
vercel env rm NEXT_PUBLIC_SUPABASE_URL production -y > /dev/null 2>&1
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production -y > /dev/null 2>&1
vercel env rm SUPABASE_SERVICE_ROLE_KEY production -y > /dev/null 2>&1

echo "2. 정확한 열쇠(API Key) 등록 중..."
echo "$URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$ANON" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SERVICE" | vercel env add SUPABASE_SERVICE_ROLE_KEY production

echo "3. 서버에 변경사항 적용 중 (이 작업은 1~2분 정도 소요됩니다)..."
vercel --prod --yes

echo "✅ 모든 작업이 완료되었습니다! 이제 다시 로그인을 시도해 보세요."
