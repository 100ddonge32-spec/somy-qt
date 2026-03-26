#!/bin/bash

# Somy-QT Push & QT Generation Utility

if [ "$1" == "qt" ]; then
  echo "🚀 오늘의 큐티 및 칼럼 생성을 수동으로 시작합니다..."
  curl -X GET "http://localhost:3000/api/cron/daily-qt"
  echo -e "\n✅ 요청 완료"
elif [ "$1" == "scheduler" ]; then
  echo "🚀 [스케줄러 테스트] 현재 시간에 알림 발송이 설정된 모든 교회를 확인합니다..."
  curl -X GET "http://localhost:3000/api/cron/push-scheduler?secret=somy-push-secret-123"
  echo -e "\n✅ 스케줄러 요청 완료"
elif [ "$1" == "daily-push" ]; then
  CHURCH_ID=${2:-"jesus-in"}
  echo "🚀 [특정 교회 발송] ${CHURCH_ID} 교회의 오늘의 큐티 알림을 즉시 발송합니다..."
  curl -X GET "http://localhost:3000/api/push-send-daily?secret=somy-push-secret-123&church_id=${CHURCH_ID}"
  echo -e "\n✅ 발송 요청 완료"
elif [ "$1" == "msg" ]; then
  if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    echo "使用法: ./push.sh msg [대상] [제목] [내용]"
    echo "예시: ./push.sh msg --all \"샬롬\" \"오늘도 승리하세요\""
    echo "대상 옵션: --all, --name [이름], --phone [번호], --email [이메일], --id [ID]"
  else
    node send_push.js "$2" "$3" "$4" "$5"
  fi
else
  echo "🚀 [Somy-QT 터미널 도구]"
  echo "사용법:"
  echo "  ./push.sh qt                   - 오늘의 큐티 및 칼럼 수동 생성 (전역)"
  echo "  ./push.sh scheduler            - [신규] 현재 시간대별 알림 자동 발송 테스트 (전체 교회)"
  echo "  ./push.sh daily-push [교회ID]   - [신규] 특정 교회의 큐티 알림을 즉시 발송 (기본값: jesus-in)"
  echo "  ./push.sh msg [타겟] [제목] [내용] - 특정 혹은 전체 사용자에게 수동 푸시 메시지 전송"
  echo ""
  echo "예시:"
  echo "  ./push.sh qt"
  echo "  ./push.sh scheduler"
  echo "  ./push.sh daily-push demo"
  echo "  ./push.sh msg --all \"예배 안내\" \"내일은 주일입니다.\""
fi
