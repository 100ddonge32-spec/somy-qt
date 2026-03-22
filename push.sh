#!/bin/bash

# Somy-QT Push & QT Generation Utility

if [ "$1" == "qt" ]; then
  echo "🚀 오늘의 큐티 및 칼럼 생성을 수동으로 시작합니다..."
  curl -X GET "http://localhost:3000/api/cron/daily-qt"
  echo -e "\n✅ 요청 완료"
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
  echo "  ./push.sh qt             - 오늘의 큐티 및 칼럼 수동 생성 (푸시 포함)"
  echo "  ./push.sh msg [타겟] [제목] [내용] - 특정 혹은 전체 사용자에게 푸시 메시지 전송"
  echo ""
  echo "예시:"
  echo "  ./push.sh qt"
  echo "  ./push.sh msg --all \"제목\" \"내용\""
  echo "  ./push.sh msg --name \"김은영\" \"제목\" \"내용\""
fi
