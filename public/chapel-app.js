/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — 멀티플레이 · 강의/칠판/PPT/화면공유 · 통독방 · 큐티방 · 사랑방 앱 컨트롤러
 * ========================================================================= */
(function () {
  const BIBLE_BOOKS = [
    '창세기','출애굽기','레위기','민수기','신명기','여호수아','사사기','룻기','사무엘상','사무엘하',
    '열왕기상','열왕기하','역대상','역대하','에스라','느헤미야','에스더','욥기','시편','잠언',
    '전도서','아가','이사야','예레미야','예레미야애가','에스겔','다니엘','호세아','요엘','아모스',
    '오바댜','요나','미가','나훔','하박국','스바냐','학개','스가랴','말라기',
    '마태복음','마가복음','누가복음','요한복음','사도행전','로마서','고린도전서','고린도후서','갈라디아서','에베소서',
    '빌립보서','골로새서','데살로니가전서','데살로니가후서','디모데전서','디모데후서','디도서','빌레몬서','히브리서',
    '야고보서','베드로전서','베드로후서','요한일서','요한이서','요한삼서','유다서','요한계시록'
  ];

  const SAMPLE_NPCS = {
    garden: [
      { id: 'npc_g1', name: '김은혜 권사', presetId: 'lydia', x: -8.5, z: 13, rotY: Math.PI / 2, pose: 'sit', isNpc: true, bubble: '🌿 정원 공기가 참 평안하네요' },
      { id: 'npc_g2', name: '박소망 청년', presetId: 'joseph', x: -12.5, z: -5.5, rotY: 0.3, pose: 'stand', drink: 'coffee', isNpc: true, bubble: '☕ 대성전 들어가기 전 커피 한 잔!' }
    ],
    sanctuary: [
      { id: 'npc_s1', name: '한충성 장로', presetId: 'david', x: -5.0, z: -2.8, rotY: 0.25, pose: 'sit', isNpc: true, bubble: '🙏 주님 홀로 영광 받으소서' },
      { id: 'npc_s2', name: '이믿음 집사', presetId: 'miriam', x: 5.0, z: -2.8, rotY: -0.25, pose: 'sit', isNpc: true },
      { id: 'npc_s3', name: '정온유 성도', presetId: 'lydia', x: 0, z: -5.2, rotY: Math.PI, pose: 'kneel', isNpc: true, bubble: '🕯️ 간절히 무릎으로 기도합니다' }
    ],
    sarangbang: [
      { id: 'npc_r1', name: '윤평강 순장', presetId: 'somy', x: -3.6, z: 4.1, rotY: 2.3, pose: 'sit', drink: 'coffee', isNpc: true, bubble: '🏠 사랑방에 오신 것을 환영해요!' }
    ],
    bible: [
      { id: 'npc_b1', name: '강기쁨 청년', presetId: 'miriam', x: -7.5, z: -3.5, rotY: Math.PI, pose: 'sit', isNpc: true, bubble: '📖 시편 말씀을 통독 중입니다' }
    ],
    qt: [
      { id: 'npc_q1', name: '송찬양 간사', presetId: 'somy', x: -6.5, z: -3.65, rotY: Math.PI, pose: 'sit', isNpc: true, bubble: '✏️ 큐티 기초반 강의안을 함께 읽어봐요' }
    ],
    prayer: [
      { id: 'npc_p1', name: '오감사 권사', presetId: 'lydia', x: -2, z: -11.5, rotY: Math.PI, pose: 'kneel', isNpc: true }
    ],
    rooftop: [
      { id: 'npc_t1', name: '류화평 청년', presetId: 'joseph', x: -6.3, z: 4.6, rotY: -2.3, pose: 'sit', drink: 'coffee', isNpc: true, bubble: '✨ 별빛 루프탑에서 교제 나눠요' }
    ]
  };

  // 내 프로필 상태
  const myClientId = 'u_' + Math.random().toString(36).slice(2, 10);
  let myName = '백동희 성도';
  let myPresetId = 'david';
  let myDrink = '';
  try {
    myName = localStorage.getItem('somy_world_name') || myName;
    myPresetId = localStorage.getItem('somy_world_preset') || myPresetId;
  } catch {}

  let showNpcs = true;
  let currentZone = 'garden';
  let currentSarangId = 'group-1';

  // 서버 공용 상태
  let worldState = {
    sarangbangs: [
      { id: 'group-1', name: '1교구 믿음 사랑방', leader: '김은혜 권사', topic: '주일 설교 말씀 삶으로 살아내기' },
      { id: 'group-2', name: '청년부 소망 셀모임', leader: '박소망 리더', topic: '직장과 캠퍼스에서의 경건 생활 나눔' },
      { id: 'group-3', name: '새가족 환영 사랑방', leader: '이믿음 집사', topic: '교회 안내 및 첫 믿음의 발걸음 교제' }
    ],
    qtLectures: [],
    qtShares: [],
    candles: [],
    roomBoards: {}
  };

  // Supabase Realtime 멀티플레이 & WebRTC 화면공유 상태
  let supaClient = null;
  let roomChannel = null;
  let onlinePeers = new Map(); // clientId -> state

  // 칠판·화이트보드·PPT·화면공유 상태
  const boardOffscreen = document.getElementById('boardOffscreenCanvas');
  const bCtx = boardOffscreen.getContext('2d');
  const wbCanvas = document.getElementById('wbCanvas');
  const wbCtx = wbCanvas.getContext('2d');

  // 화이트보드 전용 레이어 캔버스
  const wbLayer = document.createElement('canvas');
  wbLayer.width = 960;
  wbLayer.height = 540;
  const wbLayerCtx = wbLayer.getContext('2d');

  let boardState = {
    mode: 'slide', // 'slide' | 'whiteboard' | 'ppt_images' | 'ppt_embed' | 'screenshare' | 'webcam' | 'youtube'
    badge: 'SUNDAY WORSHIP · 그레이스 대성전',
    body: '여호와는 나의 빛이요 나의 구원이시니\n내가 누구를 두려워하리요 (시편 27:1)',
    slideImages: [], // DataURL or URL array
    slideIndex: 0,
    embedUrl: '',
    youtubeId: ''
  };
  let loadedSlideImg = null;
  let wbColor = '#FFFFFF';
  let wbSize = 5;

  // WebRTC PC 화면(PPT) 실시간 공유 및 웹캠
  const screenShareVideo = document.getElementById('screenShareVideo');
  const webcamVideo = document.getElementById('webcamVideo');
  let localScreenStream = null;
  let isSharingMyScreen = false;
  let peerConnections = new Map(); // remoteClientId -> RTCPeerConnection
  let webcamStream = null;
  let camFacingMode = 'user';

  // 마이크 음성 파동 & BGM
  let micActive = false;
  let micSim = false;
  let micStream = null;
  let micAudioCtx = null;
  let micAnalyser = null;
  let micData = null;

  const customBgmAudio = document.getElementById('customBgmAudio');
  const bgmYtIframe = document.getElementById('bgmYtIframe');
  let bgmType = 'none';
  let synthCtx = null;
  let synthTimer = null;
  let bgmBlobUrl = null;

  // 토스트 알림
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('world-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  function getRoomKey() {
    return currentZone === 'sarangbang' ? `sarangbang:${currentSarangId}` : currentZone;
  }

  function getCurrentSarangObj() {
    return worldState.sarangbangs.find((s) => s.id === currentSarangId) || worldState.sarangbangs[0];
  }

  // -------------------------------------------------------------------------
  // 3D 월드 엔진 초기화
  // -------------------------------------------------------------------------
  const world3d = new window.ChapelWorld3D({
    canvas: document.getElementById('worldCanvas'),
    overlayContainer: document.getElementById('avatarOverlayLayer'),
    boardCanvas: boardOffscreen,
    onProximityChange: (item) => {
      const btn = document.getElementById('proximity-btn');
      if (!item) {
        btn.classList.add('hidden');
        return;
      }
      btn.textContent = `${item.label}`;
      btn.classList.remove('hidden');
    },
    onPortalEnter: (targetZone) => {
      enterZone(targetZone);
    },
    onInteract: (item) => {
      handleInteractable(item);
    },
    onLocalMove: (coords) => {
      broadcastEvent('move', {
        clientId: myClientId,
        name: myName,
        presetId: myPresetId,
        ...coords
      });
    }
  });

  world3d.createAvatar('me', {
    isMe: true,
    name: myName,
    presetId: myPresetId,
    drink: myDrink,
    x: 0,
    y: 0,
    z: 24,
    rotY: Math.PI
  });

  // -------------------------------------------------------------------------
  // 3D 칠판 / 슬라이드 / 화이트보드 / PPT / 화면공유 렌더링 루프
  // -------------------------------------------------------------------------
  function initWhiteboardBg() {
    wbLayerCtx.fillStyle = '#0f291e';
    wbLayerCtx.fillRect(0, 0, 960, 540);
    wbLayerCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    wbLayerCtx.lineWidth = 1;
    for (let x = 0; x < 960; x += 48) {
      wbLayerCtx.beginPath();
      wbLayerCtx.moveTo(x, 0);
      wbLayerCtx.lineTo(x, 540);
      wbLayerCtx.stroke();
    }
    for (let y = 0; y < 540; y += 48) {
      wbLayerCtx.beginPath();
      wbLayerCtx.moveTo(0, y);
      wbLayerCtx.lineTo(960, y);
      wbLayerCtx.stroke();
    }
  }
  initWhiteboardBg();

  function renderBoardSurface() {
    const W = 960, H = 540;

    if (boardState.mode === 'screenshare' && screenShareVideo.readyState >= 2) {
      bCtx.fillStyle = '#000000';
      bCtx.fillRect(0, 0, W, H);
      bCtx.drawImage(screenShareVideo, 0, 0, W, H);
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      bCtx.fillRect(0, H - 44, W, 44);
      bCtx.fillStyle = '#38bdf8';
      bCtx.font = '800 20px -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('🖥️ 실시간 강의 화면(PPT/PC) 공유 중', W / 2, H - 22);
    } else if (boardState.mode === 'webcam' && webcamVideo.readyState >= 2) {
      bCtx.save();
      if (camFacingMode === 'user') {
        bCtx.translate(W, 0);
        bCtx.scale(-1, 1);
      }
      bCtx.drawImage(webcamVideo, 0, 0, W, H);
      bCtx.restore();
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      bCtx.fillRect(0, H - 46, W, 46);
      bCtx.fillStyle = '#f87171';
      bCtx.font = '800 21px -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('● LIVE 실시간 강단/인도자 카메라 송출 중', W / 2, H - 23);
    } else if (boardState.mode === 'whiteboard') {
      bCtx.drawImage(wbLayer, 0, 0, W, H);
    } else if (boardState.mode === 'ppt_images' && loadedSlideImg) {
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(0, 0, W, H);
      const iw = loadedSlideImg.width || W;
      const ih = loadedSlideImg.height || H;
      const scale = Math.min(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      bCtx.drawImage(loadedSlideImg, (W - dw) / 2, (H - dh) / 2, dw, dh);

      bCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      bCtx.fillRect(W - 150, H - 40, 136, 30);
      bCtx.fillStyle = '#fde047';
      bCtx.font = '800 16px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(`슬라이드 ${boardState.slideIndex + 1} / ${boardState.slideImages.length}`, W - 82, H - 25);
    } else if (boardState.mode === 'ppt_embed') {
      const grd = bCtx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#1e1b4b');
      grd.addColorStop(1, '#0f172a');
      bCtx.fillStyle = grd;
      bCtx.fillRect(0, 0, W, H);
      bCtx.fillStyle = '#fde047';
      bCtx.font = '800 28px -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('📊 실시간 외부 PPT / 웹 강의자료 공유 중', W / 2, H * 0.40);
      bCtx.fillStyle = '#ffffff';
      bCtx.font = '700 22px -apple-system, sans-serif';
      bCtx.fillText('칠판을 클릭하거나 상단 [👨‍🏫 칠판·PPT] 버튼을 눌러 크게 보세요!', W / 2, H * 0.58);
    } else if (boardState.mode === 'youtube') {
      const grd = bCtx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#3b0764');
      grd.addColorStop(1, '#0f172a');
      bCtx.fillStyle = grd;
      bCtx.fillRect(0, 0, W, H);
      bCtx.fillStyle = '#fda4af';
      bCtx.font = '800 30px -apple-system, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText('▶️ 유튜브 예배 / 강의 영상 송출 중', W / 2, H * 0.42);
      bCtx.fillStyle = '#ffffff';
      bCtx.font = '700 21px -apple-system, sans-serif';
      bCtx.fillText('우측 미니 영상창 또는 [👨‍🏫 칠판·PPT] 창에서 시청하실 수 있습니다', W / 2, H * 0.58);
    } else {
      // 기본 텍스트 강의/예배 자막 슬라이드
      const grd = bCtx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#0c223d');
      grd.addColorStop(0.5, '#1b4978');
      grd.addColorStop(1, '#0c223d');
      bCtx.fillStyle = grd;
      bCtx.fillRect(0, 0, W, H);

      bCtx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
      bCtx.lineWidth = 6;
      bCtx.strokeRect(14, 14, W - 28, H - 28);

      const badge = (boardState.badge || '').trim();
      const rawLines = String(boardState.body || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);

      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';

      let topY = 90;
      if (badge) {
        bCtx.fillStyle = '#fde047';
        bCtx.font = '800 30px -apple-system, sans-serif';
        bCtx.fillText(badge, W / 2, 86, W - 90);
        topY = 155;
      }

      const availH = H - topY - 50;
      const n = Math.max(1, rawLines.length);
      const fontSize = n === 1 ? 52 : n === 2 ? 44 : n === 3 ? 36 : 30;
      const step = availH / n;

      rawLines.forEach((line, idx) => {
        bCtx.fillStyle = idx === 0 ? '#ffffff' : 'rgba(255,255,255,0.93)';
        bCtx.font = `${idx === 0 ? 800 : 700} ${fontSize}px -apple-system, sans-serif`;
        bCtx.fillText(line, W / 2, topY + step * (idx + 0.5), W - 90);
      });
    }

    // 화이트보드 모달 내 프리뷰 캔버스 동기화
    if (wbCtx) {
      wbCtx.drawImage(boardState.mode === 'whiteboard' ? wbLayer : boardOffscreen, 0, 0, wbCanvas.width, wbCanvas.height);
    }

    world3d.markBoardDirty();
  }

  function loadCurrentPptImage() {
    const arr = boardState.slideImages || [];
    const src = arr[boardState.slideIndex];
    if (!src) {
      loadedSlideImg = null;
      renderBoardSurface();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedSlideImg = img;
      renderBoardSurface();
      updatePptPageUi();
    };
    img.src = src;
  }

  function updatePptPageUi() {
    const info = document.getElementById('ppt-page-indicator');
    const total = (boardState.slideImages || []).length;
    if (info) {
      info.textContent = total > 0 ? `${boardState.slideIndex + 1} / ${total} 페이지` : '업로드된 슬라이드 없음';
    }
  }

  function syncLiveMediaDock() {
    const dock = document.getElementById('live-media-dock');
    const embedFrame = document.getElementById('dockEmbedFrame');
    const dockTitle = document.getElementById('dock-title');

    if (boardState.mode === 'ppt_embed' && boardState.embedUrl) {
      dockTitle.textContent = '📊 실시간 공유 PPT / 강의자료';
      if (embedFrame.dataset.url !== boardState.embedUrl) {
        embedFrame.src = boardState.embedUrl;
        embedFrame.dataset.url = boardState.embedUrl;
      }
      embedFrame.classList.remove('hidden');
      screenShareVideo.classList.add('hidden');
      dock.classList.remove('hidden');
    } else if (boardState.mode === 'youtube' && boardState.youtubeId) {
      const ytUrl = `https://www.youtube.com/embed/${boardState.youtubeId}?autoplay=1&playsinline=1&rel=0`;
      dockTitle.textContent = '▶️ 실시간 공유 유튜브 영상';
      if (embedFrame.dataset.url !== ytUrl) {
        embedFrame.src = ytUrl;
        embedFrame.dataset.url = ytUrl;
      }
      embedFrame.classList.remove('hidden');
      screenShareVideo.classList.add('hidden');
      dock.classList.remove('hidden');
    } else if (boardState.mode === 'screenshare') {
      dockTitle.textContent = '🖥️ 실시간 PC 화면(PPT) 공유';
      embedFrame.src = '';
      embedFrame.dataset.url = '';
      embedFrame.classList.add('hidden');
      screenShareVideo.classList.remove('hidden');
      dock.classList.remove('hidden');
    } else {
      embedFrame.src = '';
      embedFrame.dataset.url = '';
      dock.classList.add('hidden');
    }
  }

  // 실시간 비디오(화면공유/웹캠) 프레임일 때는 주기적으로 칠판 텍스처 갱신
  setInterval(() => {
    if (boardState.mode === 'screenshare' || boardState.mode === 'webcam') {
      renderBoardSurface();
    }
    if (micActive) {
      let lv = 0;
      if (micAnalyser && micData) {
        micAnalyser.getByteFrequencyData(micData);
        let sum = 0;
        for (let i = 0; i < micData.length; i++) sum += micData[i];
        lv = Math.min(1, sum / micData.length / 60);
      } else if (micSim) {
        lv = 0.35 + Math.abs(Math.sin(Date.now() * 0.008)) * 0.45;
      }
      const bar = document.getElementById('mic-meter-bar');
      if (bar) bar.style.width = `${Math.round(lv * 100)}%`;
      world3d.updateAvatarInfo('me', { micWave: lv > 0.1 });
    }
  }, 90);

  // -------------------------------------------------------------------------
  // 공간(Zone) 이동 & 상호작용 처리
  // -------------------------------------------------------------------------
  function refreshNpcsForZone() {
    for (const [id, av] of Array.from(world3d.avatars.entries())) {
      if (av.isNpc) world3d.removeAvatar(id);
    }
    if (!showNpcs) return;
    const list = SAMPLE_NPCS[currentZone] || [];
    list.forEach((n) => world3d.createAvatar(n.id, n));
  }

  function applySavedRoomBoard() {
    const rk = getRoomKey();
    const saved = worldState.roomBoards && worldState.roomBoards[rk];
    if (saved) {
      boardState = {
        mode: saved.mode || 'slide',
        badge: saved.badge || '',
        body: saved.body || '',
        slideImages: saved.slideImages || [],
        slideIndex: saved.slideIndex || 0,
        embedUrl: saved.embedUrl || '',
        youtubeId: saved.youtubeId || ''
      };
    } else {
      const meta = world3d.getZoneMeta(currentZone);
      boardState = {
        mode: 'slide',
        badge: meta.name,
        body: meta.subtitle,
        slideImages: [],
        slideIndex: 0,
        embedUrl: '',
        youtubeId: ''
      };
    }
    if (boardState.mode === 'ppt_images') loadCurrentPptImage();
    else renderBoardSurface();
    syncLiveMediaDock();
  }

  function enterZone(zoneId, sarangIdOpt) {
    if (sarangIdOpt) currentSarangId = sarangIdOpt;
    currentZone = zoneId;
    const meta = world3d.getZoneMeta(zoneId);
    const sarangObj = getCurrentSarangObj();

    // 화면공유 중 방을 옮기면 정리
    if (isSharingMyScreen) stopMyScreenShare();

    world3d.clearRemoteAvatars(false);
    world3d.loadZone(zoneId, {
      candles: worldState.candles,
      sarangbangName: sarangObj ? sarangObj.name : '사랑방'
    });
    refreshNpcsForZone();
    applySavedRoomBoard();

    // 상·하단 UI 상태 업데이트
    const titleText = zoneId === 'sarangbang' && sarangObj ? `🏠 ${sarangObj.name}` : meta.name;
    document.getElementById('zone-title-badge').textContent = titleText;
    document.getElementById('btn-sarang-Menu').classList.toggle('hidden', zoneId !== 'sarangbang');
    document.getElementById('btn-bible-reader').classList.toggle('hidden', zoneId !== 'bible');
    document.getElementById('btn-qt-academy').classList.toggle('hidden', zoneId !== 'qt');
    document.getElementById('btn-candle-board').classList.toggle('hidden', zoneId !== 'sanctuary' && zoneId !== 'prayer');
    document.getElementById('btn-board-studio').classList.toggle('hidden', !meta.hasBoard);

    document.querySelectorAll('.zone-tab-btn').forEach((b) => {
      const active = b.getAttribute('data-zone') === zoneId;
      b.className = active
        ? 'zone-tab-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 shadow cursor-pointer transition'
        : 'zone-tab-btn shrink-0 px-3 py-1.5 rounded-full text-xs font-bold text-white/90 hover:bg-white/15 cursor-pointer transition';
    });

    joinMultiplayerRoom();
    toast(`${titleText}에 입장했습니다`);
  }

  function handleInteractable(item) {
    if (!item) return;
    if (item.type === 'portal') {
      enterZone(item.targetZone);
    } else if (item.type === 'seat') {
      world3d.sitOrPoseMe('sit', item.x, item.y, item.z, item.rotY ?? Math.PI);
      toast('🪑 자리에 앉았습니다 (이동하면 일어섭니다)');
    } else if (item.type === 'kneel') {
      world3d.sitOrPoseMe('kneel', item.x, item.y, item.z, item.rotY ?? Math.PI);
      world3d.showBubble('me', '🙏 주님, 두 손 모아 간절히 기도합니다', 5);
      broadcastEvent('chat', { clientId: myClientId, name: myName, text: '🙏 무릎 꿇고 조용히 기도합니다' });
      toast('🧎 무릎을 꿇고 기도합니다');
    } else if (item.type === 'cafe') {
      myDrink = item.drinkType || 'coffee';
      world3d.updateAvatarInfo('me', { drink: myDrink });
      document.getElementById('btn-sip-drink').classList.remove('hidden');
      document.getElementById('btn-sip-drink').textContent = myDrink === 'water' ? '💧 생수 마시기' : '☕ 커피 마시기';
      const msg = myDrink === 'water' ? '💧 시원한 생수를 받았습니다!' : '☕ 따뜻한 커피를 받았습니다!';
      world3d.showBubble('me', msg, 4);
      syncMyPresence();
      toast(msg);
    } else if (item.type === 'board') {
      openModal('board-modal');
    } else if (item.type === 'bible_desk') {
      world3d.sitOrPoseMe('sit', item.x, 0, item.z, item.rotY ?? Math.PI);
      openModal('bible-modal');
    } else if (item.type === 'qt_academy') {
      world3d.sitOrPoseMe('sit', item.x, 0, item.z, item.rotY ?? Math.PI);
      openModal('qt-modal');
    } else if (item.type === 'sarang_menu') {
      openModal('sarang-modal');
    } else if (item.type === 'candle_altar') {
      openModal('candle-modal');
    } else if (item.type === 'artwork' && item.artwork) {
      document.getElementById('art-modal-title').textContent = `🖼️ ${item.artwork.title}`;
      document.getElementById('art-modal-desc').textContent = item.artwork.desc;
      openModal('art-modal');
    }
  }

  // -------------------------------------------------------------------------
  // Supabase Realtime 멀티플레이 (실시간 성도 접속·이동·채팅·칠판·WebRTC 시그널링)
  // -------------------------------------------------------------------------
  function updateOnlineCounter() {
    const realCount = 1 + onlinePeers.size;
    const npcCount = showNpcs ? (SAMPLE_NPCS[currentZone] || []).length : 0;
    const el = document.getElementById('online-count-label');
    if (el) {
      el.textContent = supaClient
        ? `🟢 실시간 ${realCount}명${npcCount ? ` (+교제성도 ${npcCount})` : ''}`
        : `성도 ${realCount + npcCount}명`;
    }
  }

  function syncMyPresence() {
    if (!roomChannel) return;
    const me = world3d.avatars.get('me');
    roomChannel.track({
      clientId: myClientId,
      name: myName,
      presetId: myPresetId,
      drink: myDrink,
      x: me ? me.x : 0,
      y: 0,
      z: me ? me.z : 16,
      rotY: me ? me.rotY : Math.PI,
      pose: me ? me.pose : 'stand'
    }).catch(() => {});
  }

  function broadcastEvent(event, payload) {
    if (!roomChannel) return;
    roomChannel.send({
      type: 'broadcast',
      event,
      payload
    }).catch(() => {});
  }

  function joinMultiplayerRoom() {
    onlinePeers.clear();
    for (const peerPc of peerConnections.values()) {
      try { peerPc.close(); } catch {}
    }
    peerConnections.clear();

    if (roomChannel && supaClient) {
      supaClient.removeChannel(roomChannel);
      roomChannel = null;
    }
    updateOnlineCounter();

    if (!supaClient) return;

    const chanName = `somy_world_v2:${getRoomKey()}`;
    roomChannel = supaClient.channel(chanName, {
      config: { presence: { key: myClientId }, broadcast: { self: false } }
    });

    roomChannel.on('presence', { event: 'sync' }, () => {
      const state = roomChannel.presenceState();
      const seen = new Set();

      Object.keys(state).forEach((key) => {
        if (key === myClientId) return;
        const arr = state[key];
        if (!arr || !arr.length) return;
        const p = arr[arr.length - 1];
        seen.add(key);
        onlinePeers.set(key, p);
        world3d.createAvatar(key, {
          isMe: false,
          isNpc: false,
          name: p.name || '성도',
          presetId: p.presetId || 'david',
          drink: p.drink || '',
          x: p.x ?? 0,
          y: p.y ?? 0,
          z: p.z ?? 18,
          rotY: p.rotY ?? Math.PI,
          pose: p.pose || 'stand'
        });

        // 내가 현재 화면공유 중인데 새로 들어온 성도가 있으면 WebRTC 연결 시작
        if (isSharingMyScreen && localScreenStream && !peerConnections.has(key)) {
          initiateScreenShareOfferTo(key);
        }
      });

      for (const oldKey of Array.from(onlinePeers.keys())) {
        if (!seen.has(oldKey)) {
          onlinePeers.delete(oldKey);
          world3d.removeAvatar(oldKey);
          if (peerConnections.has(oldKey)) {
            try { peerConnections.get(oldKey).close(); } catch {}
            peerConnections.delete(oldKey);
          }
        }
      }
      updateOnlineCounter();
    });

    roomChannel.on('broadcast', { event: 'move' }, ({ payload }) => {
      if (!payload || payload.clientId === myClientId) return;
      if (!world3d.avatars.has(payload.clientId)) {
        world3d.createAvatar(payload.clientId, { ...payload, isMe: false, isNpc: false });
      } else {
        world3d.updateAvatarInfo(payload.clientId, payload);
      }
    });

    roomChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (!payload) return;
      appendChatMessage(payload.name || '성도', payload.text || '', false);
      if (payload.clientId && world3d.avatars.has(payload.clientId)) {
        world3d.showBubble(payload.clientId, payload.text, 5.5);
      }
    });

    roomChannel.on('broadcast', { event: 'wb_stroke' }, ({ payload }) => {
      if (!payload) return;
      boardState.mode = 'whiteboard';
      drawStrokeOnWbLayer(payload);
      renderBoardSurface();
    });

    roomChannel.on('broadcast', { event: 'wb_clear' }, () => {
      initWhiteboardBg();
      boardState.mode = 'whiteboard';
      renderBoardSurface();
    });

    roomChannel.on('broadcast', { event: 'board_sync' }, ({ payload }) => {
      if (!payload) return;
      boardState = { ...boardState, ...payload };
      if (boardState.mode === 'ppt_images') loadCurrentPptImage();
      else renderBoardSurface();
      syncLiveMediaDock();
      toast('👨‍🏫 인도자가 칠판/강의자료를 업데이트했습니다');
    });

    // WebRTC P2P 화면공유 시그널링 수신
    roomChannel.on('broadcast', { event: 'rtc_signal' }, async ({ payload }) => {
      if (!payload || payload.targetId !== myClientId) return;
      await handleRtcSignal(payload);
    });

    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        syncMyPresence();
        updateOnlineCounter();
      }
    });
  }

  // -------------------------------------------------------------------------
  // WebRTC P2P 실시간 PC 화면(PPT·문서) 공유
  // -------------------------------------------------------------------------
  const RTC_CFG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  async function initiateScreenShareOfferTo(targetClientId) {
    if (!localScreenStream) return;
    const pc = new RTCPeerConnection(RTC_CFG);
    peerConnections.set(targetClientId, pc);

    localScreenStream.getTracks().forEach((track) => pc.addTrack(track, localScreenStream));
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        broadcastEvent('rtc_signal', {
          fromId: myClientId,
          targetId: targetClientId,
          type: 'ice',
          candidate: e.candidate
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    broadcastEvent('rtc_signal', {
      fromId: myClientId,
      targetId: targetClientId,
      type: 'offer',
      sdp: pc.localDescription
    });
  }

  async function handleRtcSignal(msg) {
    try {
      if (msg.type === 'offer') {
        const pc = new RTCPeerConnection(RTC_CFG);
        peerConnections.set(msg.fromId, pc);

        pc.ontrack = (e) => {
          if (e.streams && e.streams[0]) {
            screenShareVideo.srcObject = e.streams[0];
            screenShareVideo.play().catch(() => {});
            boardState.mode = 'screenshare';
            syncLiveMediaDock();
            toast('🖥️ 인도자의 실시간 PC 화면(PPT) 공유가 시작되었습니다!');
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            broadcastEvent('rtc_signal', {
              fromId: myClientId,
              targetId: msg.fromId,
              type: 'ice',
              candidate: e.candidate
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcastEvent('rtc_signal', {
          fromId: myClientId,
          targetId: msg.fromId,
          type: 'answer',
          sdp: pc.localDescription
        });
      } else if (msg.type === 'answer') {
        const pc = peerConnections.get(msg.fromId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === 'ice') {
        const pc = peerConnections.get(msg.fromId);
        if (pc && msg.candidate) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } else if (msg.type === 'stop') {
        screenShareVideo.srcObject = null;
        boardState.mode = 'slide';
        syncLiveMediaDock();
        renderBoardSurface();
      }
    } catch (err) {
      console.warn('RTC signal error:', err);
    }
  }

  async function startMyScreenShare() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast('⚠️ PC 크롬/사파리/엣지 브라우저에서 화면(PPT) 공유가 지원됩니다');
      return;
    }
    try {
      localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true
      });
      isSharingMyScreen = true;
      screenShareVideo.srcObject = localScreenStream;
      await screenShareVideo.play();

      localScreenStream.getVideoTracks()[0].onended = () => {
        stopMyScreenShare();
      };

      boardState.mode = 'screenshare';
      syncLiveMediaDock();
      renderBoardSurface();
      document.getElementById('btn-start-screenshare').textContent = '⏹️ 내 화면(PPT) 공유 중지';

      for (const remoteId of onlinePeers.keys()) {
        initiateScreenShareOfferTo(remoteId);
      }
      closeModal('board-modal');
      toast('🖥️ 내 PC 화면(PPT)이 방 안 칠판과 성도들에게 실시간 공유됩니다!');
    } catch {
      toast('화면 공유가 취소되었습니다');
    }
  }

  function stopMyScreenShare() {
    isSharingMyScreen = false;
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      localScreenStream = null;
    }
    screenShareVideo.srcObject = null;
    for (const [remoteId, pc] of peerConnections.entries()) {
      broadcastEvent('rtc_signal', { fromId: myClientId, targetId: remoteId, type: 'stop' });
      try { pc.close(); } catch {}
    }
    peerConnections.clear();
    boardState.mode = 'slide';
    syncLiveMediaDock();
    renderBoardSurface();
    document.getElementById('btn-start-screenshare').textContent = '🖥️ 내 PC 화면(PPT·문서) 실시간 공유 시작';
  }

  // -------------------------------------------------------------------------
  // 화이트보드 드로잉 & 텍스트 스탬프 & PPT 슬라이드 업로드
  // -------------------------------------------------------------------------
  function drawStrokeOnWbLayer(st) {
    wbLayerCtx.save();
    if (st.kind === 'text') {
      wbLayerCtx.fillStyle = st.color || '#fde047';
      wbLayerCtx.font = '800 32px -apple-system, sans-serif';
      wbLayerCtx.textBaseline = 'middle';
      wbLayerCtx.fillText(st.text, st.x, st.y, 880);
    } else {
      wbLayerCtx.strokeStyle = st.color || '#ffffff';
      wbLayerCtx.lineWidth = st.size || 5;
      wbLayerCtx.lineCap = 'round';
      wbLayerCtx.lineJoin = 'round';
      wbLayerCtx.beginPath();
      wbLayerCtx.moveTo(st.x0, st.y0);
      wbLayerCtx.lineTo(st.x1, st.y1);
      wbLayerCtx.stroke();
    }
    wbLayerCtx.restore();
  }

  let wbDrawing = false;
  let wbLast = { x: 0, y: 0 };

  function toWbCoords(e) {
    const r = wbCanvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 960,
      y: ((e.clientY - r.top) / r.height) * 540
    };
  }

  wbCanvas.addEventListener('pointerdown', (e) => {
    wbDrawing = true;
    boardState.mode = 'whiteboard';
    wbLast = toWbCoords(e);
    try { wbCanvas.setPointerCapture(e.pointerId); } catch {}
  });

  wbCanvas.addEventListener('pointermove', (e) => {
    if (!wbDrawing) return;
    const cur = toWbCoords(e);
    const stroke = { x0: wbLast.x, y0: wbLast.y, x1: cur.x, y1: cur.y, color: wbColor, size: wbSize };
    drawStrokeOnWbLayer(stroke);
    renderBoardSurface();
    broadcastEvent('wb_stroke', stroke);
    wbLast = cur;
  });

  wbCanvas.addEventListener('pointerup', () => { wbDrawing = false; });
  wbCanvas.addEventListener('pointercancel', () => { wbDrawing = false; });

  document.querySelectorAll('.wb-color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      wbColor = btn.getAttribute('data-color') || '#ffffff';
      wbSize = Number(btn.getAttribute('data-size') || 5);
      document.querySelectorAll('.wb-color-btn').forEach((b) => b.classList.remove('ring-2', 'ring-amber-400'));
      btn.classList.add('ring-2', 'ring-amber-400');
    });
  });

  document.getElementById('btn-wb-stamp').addEventListener('click', () => {
    const inp = document.getElementById('wb-text-input');
    const txt = inp.value.trim();
    if (!txt) return;
    boardState.mode = 'whiteboard';
    const st = { kind: 'text', text: txt, x: 70, y: 90 + Math.random() * 340, color: wbColor === '#0f291e' ? '#fde047' : wbColor };
    drawStrokeOnWbLayer(st);
    renderBoardSurface();
    broadcastEvent('wb_stroke', st);
    inp.value = '';
  });

  document.getElementById('btn-wb-clear').addEventListener('click', () => {
    initWhiteboardBg();
    boardState.mode = 'whiteboard';
    renderBoardSurface();
    broadcastEvent('wb_clear', {});
  });

  document.getElementById('btn-wb-apply').addEventListener('click', () => {
    boardState.mode = 'whiteboard';
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'whiteboard' });
    closeModal('board-modal');
    toast('✏️ 화이트보드 판서 화면이 3D 칠판에 적용되었습니다');
  });

  // PPT 이미지 슬라이드 여러 장 업로드 (자동 경량 리사이즈 후 전 성도 실시간 동기화!)
  document.getElementById('ppt-files-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const compressed = [];
    for (const file of files.slice(0, 20)) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            const scale = Math.min(1, 960 / img.width, 540 / img.height);
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', 0.76));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
      compressed.push(dataUrl);
    }

    boardState.mode = 'ppt_images';
    boardState.slideImages = compressed;
    boardState.slideIndex = 0;
    loadCurrentPptImage();
    updatePptPageUi();
    broadcastEvent('board_sync', {
      mode: 'ppt_images',
      slideImages: compressed,
      slideIndex: 0
    });
    toast(`📊 PPT/강의 슬라이드 ${compressed.length}장이 칠판에 등록되었습니다!`);
  });

  function stepPptSlide(dir) {
    const total = (boardState.slideImages || []).length;
    if (!total) return;
    boardState.mode = 'ppt_images';
    boardState.slideIndex = (boardState.slideIndex + dir + total) % total;
    loadCurrentPptImage();
    broadcastEvent('board_sync', { mode: 'ppt_images', slideIndex: boardState.slideIndex });
  }

  document.getElementById('btn-ppt-prev').addEventListener('click', () => stepPptSlide(-1));
  document.getElementById('btn-ppt-next').addEventListener('click', () => stepPptSlide(1));

  // 구글슬라이드 / Canva / 미리캔버스 / PDF 웹 게시 링크 공유
  document.getElementById('btn-apply-embed').addEventListener('click', async () => {
    const url = document.getElementById('ppt-embed-input').value.trim();
    if (!url) return;
    boardState.mode = 'ppt_embed';
    boardState.embedUrl = url;
    renderBoardSurface();
    syncLiveMediaDock();
    broadcastEvent('board_sync', { mode: 'ppt_embed', embedUrl: url });
    await saveRoomBoardToServer();
    closeModal('board-modal');
    toast('📊 외부 PPT/강의자료 링크가 방 전체에 실시간 공유되었습니다!');
  });

  // 직접 타이핑 자막/강의 슬라이드 적용
  document.getElementById('btn-apply-slide-text').addEventListener('click', async () => {
    const badge = document.getElementById('slide-badge-input').value.trim();
    const body = document.getElementById('slide-body-input').value.trim();
    if (!badge && !body) return;
    boardState.mode = 'slide';
    boardState.badge = badge;
    boardState.body = body || badge;
    renderBoardSurface();
    syncLiveMediaDock();
    broadcastEvent('board_sync', { mode: 'slide', badge: boardState.badge, body: boardState.body });
    await saveRoomBoardToServer();
    closeModal('board-modal');
    toast('✍️ 입력하신 강의/말씀 문구가 3D 대형 칠판에 게시되었습니다!');
  });

  // 유튜브 영상 칠판 송출
  document.getElementById('btn-apply-yt-board').addEventListener('click', async () => {
    const raw = document.getElementById('board-yt-input').value.trim();
    const m = raw.match(/(?:v=|youtu\.be\/|embed\/|live\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    const vid = m ? m[1] : raw;
    if (!vid) return;
    boardState.mode = 'youtube';
    boardState.youtubeId = vid;
    renderBoardSurface();
    syncLiveMediaDock();
    broadcastEvent('board_sync', { mode: 'youtube', youtubeId: vid });
    await saveRoomBoardToServer();
    closeModal('board-modal');
    toast('▶️ 유튜브 강의/예배 영상이 공유되었습니다!');
  });

  document.getElementById('btn-start-screenshare').addEventListener('click', () => {
    if (isSharingMyScreen) stopMyScreenShare();
    else startMyScreenShare();
  });

  document.getElementById('btn-close-dock').addEventListener('click', () => {
    document.getElementById('live-media-dock').classList.add('hidden');
  });

  async function saveRoomBoardToServer() {
    try {
      await fetch('/api/chapel-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_room_board',
          payload: { roomKey: getRoomKey(), board: boardState }
        })
      });
    } catch {}
  }

  // 칠판 모달 내 탭 전환
  document.querySelectorAll('.board-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-btab');
      document.querySelectorAll('.board-tab-pane').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`btab-${tab}`).classList.remove('hidden');
      document.querySelectorAll('.board-tab-btn').forEach((b) => {
        b.className = 'board-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 cursor-pointer';
      });
      btn.className = 'board-tab-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 cursor-pointer';
      if (tab === 'wb') renderBoardSurface();
    });
  });

  // -------------------------------------------------------------------------
  // 🏠 사랑방 (그룹별 소그룹실 생성·선택·삭제)
  // -------------------------------------------------------------------------
  function renderSarangList() {
    const box = document.getElementById('sarang-list-box');
    if (!box) return;
    box.innerHTML = worldState.sarangbangs.map((rm) => {
      const isCur = currentZone === 'sarangbang' && currentSarangId === rm.id;
      return `
        <div class="p-3 rounded-xl bg-slate-900 border ${isCur ? 'border-amber-400' : 'border-slate-700'} flex items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-extrabold text-amber-300 truncate">🏠 ${rm.name} <span class="text-slate-400 font-normal">· 인도: ${rm.leader}</span></div>
            <div class="text-xs text-slate-300 truncate mt-0.5">${rm.topic}</div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button data-srid="${rm.id}" class="sarang-enter-btn px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer">
              ${isCur ? '현재 방' : '입장'}
            </button>
            ${worldState.sarangbangs.length > 1 ? `<button data-srid="${rm.id}" class="sarang-del-btn px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white text-xs cursor-pointer">✕</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('.sarang-enter-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-srid');
        closeModal('sarang-modal');
        enterZone('sarangbang', id);
      });
    });

    box.querySelectorAll('.sarang-del-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-srid');
        const res = await fetch('/api/chapel-world', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_sarangbang', payload: { id } })
        }).then((r) => r.json()).catch(() => null);
        if (res && res.state) {
          worldState = res.state;
          if (currentSarangId === id) currentSarangId = worldState.sarangbangs[0].id;
          renderSarangList();
        }
      });
    });
  }

  document.getElementById('btn-create-sarang').addEventListener('click', async () => {
    const nameEl = document.getElementById('sarang-name-input');
    const leaderEl = document.getElementById('sarang-leader-input');
    const topicEl = document.getElementById('sarang-topic-input');
    const name = nameEl.value.trim();
    if (!name) {
      nameEl.focus();
      return;
    }
    const res = await fetch('/api/chapel-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_sarangbang',
        payload: {
          name,
          leader: leaderEl.value.trim() || myName,
          topic: topicEl.value.trim() || '함께 말씀을 나누는 사랑방'
        }
      })
    }).then((r) => r.json()).catch(() => null);

    if (res && res.room) {
      worldState = res.state;
      nameEl.value = '';
      topicEl.value = '';
      closeModal('sarang-modal');
      enterZone('sarangbang', res.room.id);
    }
  });

  // -------------------------------------------------------------------------
  // 📖 성경통독방 — 개역개정 66권 실시간 조회 & 칠판/채팅 공유
  // -------------------------------------------------------------------------
  const bookSel = document.getElementById('bible-book-select');
  if (bookSel) {
    bookSel.innerHTML = BIBLE_BOOKS.map((b) => `<option value="${b}" ${b === '시편' ? 'selected' : ''}>${b}</option>`).join('');
  }

  let lastLoadedBibleRef = '시편 23장';
  let lastLoadedBibleText = '1. 여호와는 나의 목자시니 내게 부족함이 없으리로다\n2. 그가 나를 푸른 풀밭에 누이시며 쉴 만한 물 가로 인도하시는도다\n3. 내 영혼을 소생시키시고 자기 이름을 위하여 의의 길로 인도하시는도다';

  async function fetchBiblePassage(refQuery) {
    const box = document.getElementById('bible-passage-box');
    const title = document.getElementById('bible-passage-title');
    box.textContent = '📖 성경 본문을 불러오는 중입니다...';
    try {
      const res = await fetch('/api/bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: refQuery })
      }).then((r) => r.json());
      if (res && res.passage) {
        lastLoadedBibleRef = res.reference || refQuery;
        lastLoadedBibleText = res.passage;
        title.textContent = `📖 ${lastLoadedBibleRef} (개역개정)`;
        box.textContent = res.passage;
      } else {
        box.textContent = '구절을 찾지 못했습니다. (예: 창세기 1:1-10 또는 시편 23:1-6)';
      }
    } catch {
      box.textContent = lastLoadedBibleText;
    }
  }

  document.getElementById('btn-fetch-bible').addEventListener('click', () => {
    const book = bookSel.value;
    const chap = document.getElementById('bible-chap-input').value.trim() || '1';
    fetchBiblePassage(`${book} ${chap}장`);
  });

  document.getElementById('btn-send-bible-board').addEventListener('click', async () => {
    const shortLines = lastLoadedBibleText.split('\n').slice(0, 4).join('\n');
    boardState.mode = 'slide';
    boardState.badge = `📖 성경통독 · ${lastLoadedBibleRef}`;
    boardState.body = shortLines;
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'slide', badge: boardState.badge, body: boardState.body });
    await saveRoomBoardToServer();
    closeModal('bible-modal');
    toast(`📖 '${lastLoadedBibleRef}' 본문이 통독방 칠판에 게시되었습니다!`);
  });

  document.getElementById('btn-complete-bible').addEventListener('click', () => {
    const msg = `📖 [${lastLoadedBibleRef}] 통독을 완료했습니다! 아멘 🙏`;
    sendChatMessage(msg);
    closeModal('bible-modal');
  });

  // -------------------------------------------------------------------------
  // ✏️ 큐티방 — 관리자 큐티 기초반 강의안 + 오늘의 큐티 + 실시간 큐티 나눔
  // -------------------------------------------------------------------------
  let selectedLectureId = '';

  function renderQtLectures() {
    const listEl = document.getElementById('qt-lecture-list');
    const detailTitle = document.getElementById('qt-lec-detail-title');
    const detailBody = document.getElementById('qt-lec-detail-body');
    const lectures = worldState.qtLectures || [];
    if (!lectures.length) return;

    if (!selectedLectureId || !lectures.some((l) => l.id === selectedLectureId)) {
      selectedLectureId = lectures[0].id;
    }

    listEl.innerHTML = lectures.map((lec) => `
      <button data-lid="${lec.id}" class="qt-lec-item w-full text-left p-2.5 rounded-xl border ${
        lec.id === selectedLectureId ? 'bg-amber-400/20 border-amber-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'
      } cursor-pointer">
        <div class="text-[11px] font-extrabold text-amber-300">${lec.week}</div>
        <div class="text-xs font-bold truncate">${lec.title}</div>
      </button>
    `).join('');

    const cur = lectures.find((l) => l.id === selectedLectureId) || lectures[0];
    detailTitle.textContent = `[${cur.week}] ${cur.title}`;
    detailBody.textContent = cur.content;

    listEl.querySelectorAll('.qt-lec-item').forEach((b) => {
      b.addEventListener('click', () => {
        selectedLectureId = b.getAttribute('data-lid');
        renderQtLectures();
      });
    });
  }

  document.getElementById('btn-project-qt-lec').addEventListener('click', async () => {
    const cur = (worldState.qtLectures || []).find((l) => l.id === selectedLectureId);
    if (!cur) return;
    boardState.mode = 'slide';
    boardState.badge = `✏️ ${cur.week} · ${cur.title}`;
    boardState.body = cur.content.split('\n').filter(Boolean).slice(0, 4).join('\n');
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'slide', badge: boardState.badge, body: boardState.body });
    await saveRoomBoardToServer();
    closeModal('qt-modal');
    toast('🖥️ 선택한 큐티 강의안 핵심 요약이 방 정면 칠판에 게시되었습니다!');
  });

  document.getElementById('btn-toggle-lec-editor').addEventListener('click', () => {
    document.getElementById('qt-lec-editor').classList.toggle('hidden');
  });

  document.getElementById('btn-save-qt-lec').addEventListener('click', async () => {
    const week = document.getElementById('lec-week-input').value.trim() || '큐티 기초반';
    const title = document.getElementById('lec-title-input').value.trim();
    const content = document.getElementById('lec-content-input').value.trim();
    if (!title || !content) return;

    const res = await fetch('/api/chapel-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_qt_lecture', payload: { week, title, content } })
    }).then((r) => r.json()).catch(() => null);

    if (res && res.state) {
      worldState = res.state;
      selectedLectureId = res.lecture.id;
      document.getElementById('lec-title-input').value = '';
      document.getElementById('lec-content-input').value = '';
      document.getElementById('qt-lec-editor').classList.add('hidden');
      renderQtLectures();
      toast('📘 새 큐티 기초반 강의안이 저장되었습니다!');
    }
  });

  async function loadTodaySomyQt() {
    const box = document.getElementById('today-qt-box');
    try {
      const res = await fetch('/api/qt?check_only=true').then((r) => r.json());
      if (res && res.reference) {
        const [biblePart, interpPart] = String(res.passage || '').split('|||');
        box.innerHTML = `
          <div class="text-xs font-extrabold text-amber-300">📅 ${res.date || '오늘'} · ${res.reference}</div>
          <div class="text-xs text-slate-200 whitespace-pre-line leading-relaxed mt-1.5">${biblePart || ''}</div>
          ${interpPart ? `<div class="mt-2 p-2.5 rounded-xl bg-slate-800 text-xs text-slate-300 whitespace-pre-line">${interpPart}</div>` : ''}
        `;
      } else {
        box.textContent = '오늘 등록된 큐티 본문을 불러왔습니다. 성경통독방이나 강의안과 함께 묵상해보세요!';
      }
    } catch {
      box.textContent = '오늘의 말씀: 여호와는 나의 빛이요 나의 구원이시니 내가 누구를 두려워하리요 (시편 27:1)';
    }
  }

  function renderQtShares() {
    const box = document.getElementById('qt-shares-list');
    if (!box) return;
    box.innerHTML = (worldState.qtShares || []).map((s) => `
      <div class="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-amber-300">✍️ ${s.author} <span class="text-slate-400 font-normal">· ${s.passage}</span></span>
          <button data-qsid="${s.id}" class="qt-amen-btn px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-extrabold cursor-pointer">🙏 아멘 ${s.amens || 1}</button>
        </div>
        <div class="text-xs text-slate-200 leading-relaxed break-keep">${s.content}</div>
      </div>
    `).join('');

    box.querySelectorAll('.qt-amen-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-qsid');
        const res = await fetch('/api/chapel-world', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'amen_qt_share', payload: { id } })
        }).then((r) => r.json()).catch(() => null);
        if (res && res.state) {
          worldState = res.state;
          renderQtShares();
        }
      });
    });
  }

  document.getElementById('btn-submit-qt-share').addEventListener('click', async () => {
    const passage = document.getElementById('qt-share-passage').value.trim() || '오늘의 큐티';
    const contentEl = document.getElementById('qt-share-input');
    const content = contentEl.value.trim();
    if (!content) return;

    const res = await fetch('/api/chapel-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_qt_share',
        payload: { author: myName, passage, content }
      })
    }).then((r) => r.json()).catch(() => null);

    if (res && res.state) {
      worldState = res.state;
      contentEl.value = '';
      renderQtShares();
      sendChatMessage(`✏️ [큐티 나눔 · ${passage}] ${content.slice(0, 36)}${content.length > 36 ? '...' : ''}`);
      toast('🙏 큐티 묵상 나눔이 등록되었습니다!');
    }
  });

  document.querySelectorAll('.qt-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-qtab');
      document.querySelectorAll('.qt-tab-pane').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`qtab-${t}`).classList.remove('hidden');
      document.querySelectorAll('.qt-tab-btn').forEach((b) => {
        b.className = 'qt-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 cursor-pointer';
      });
      btn.className = 'qt-tab-btn px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 cursor-pointer';
      if (t === 'today') loadTodaySomyQt();
    });
  });

  // -------------------------------------------------------------------------
  // 🕯️ 기도 등불 봉헌 & 실시간 채팅
  // -------------------------------------------------------------------------
  function renderCandlesList() {
    const box = document.getElementById('candles-list-box');
    if (!box) return;
    box.innerHTML = (worldState.candles || []).map((c) => `
      <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="text-xs font-extrabold text-amber-300 truncate">🕯️ ${c.name}</div>
          <div class="text-xs text-slate-300 truncate">${c.text}</div>
        </div>
        <button data-cid="${c.id}" class="candle-amen-btn shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-extrabold cursor-pointer">🙏 ${c.amens}</button>
      </div>
    `).join('');

    box.querySelectorAll('.candle-amen-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = Number(b.getAttribute('data-cid'));
        const res = await fetch('/api/chapel-world', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'amen_candle', payload: { id } })
        }).then((r) => r.json()).catch(() => null);
        if (res && res.state) {
          worldState = res.state;
          renderCandlesList();
        }
      });
    });
  }

  document.getElementById('btn-add-candle').addEventListener('click', async () => {
    const inp = document.getElementById('candle-text-input');
    const text = inp.value.trim();
    if (!text) return;
    const res = await fetch('/api/chapel-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_candle', payload: { name: myName, text } })
    }).then((r) => r.json()).catch(() => null);
    if (res && res.state) {
      worldState = res.state;
      inp.value = '';
      world3d.updateCandles(worldState.candles);
      renderCandlesList();
      sendChatMessage(`🕯️ [기도 등불] ${text}`);
      toast('🕯️ 강단 앞에 기도 등불이 켜졌습니다!');
    }
  });

  function appendChatMessage(sender, text, isMe) {
    const log = document.getElementById('chat-messages');
    if (!log) return;
    const div = document.createElement('div');
    div.className = `text-xs leading-snug ${isMe ? 'text-amber-200' : 'text-slate-100'}`;
    div.innerHTML = `<span class="font-extrabold ${isMe ? 'text-amber-400' : 'text-emerald-300'}">${sender}:</span> ${text.replace(/</g, '&lt;')}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function sendChatMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return;
    appendChatMessage(myName, text, true);
    world3d.showBubble('me', text, 5.5);
    broadcastEvent('chat', { clientId: myClientId, name: myName, text });
  }

  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = document.getElementById('chat-input');
    sendChatMessage(inp.value);
    inp.value = '';
  });

  document.getElementById('btn-toggle-chat').addEventListener('click', () => {
    document.getElementById('chat-panel').classList.toggle('hidden');
  });

  // -------------------------------------------------------------------------
  // 🎵 기도음악(유튜브 링크 / 내 음악 파일 / 기본 반주) & 🎙️ 마이크 & 📹 카메라
  // -------------------------------------------------------------------------
  function stopAllBgm() {
    bgmType = 'none';
    if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
    customBgmAudio.pause();
    customBgmAudio.src = '';
    bgmYtIframe.src = '';
    document.getElementById('bgm-mini-bar').classList.add('hidden');
  }

  document.getElementById('btn-start-yt-bgm').addEventListener('click', () => {
    const raw = document.getElementById('bgm-yt-input').value.trim();
    const m = raw.match(/(?:v=|youtu\.be\/|embed\/|live\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    const vid = m ? m[1] : raw;
    if (!vid) return;
    stopAllBgm();
    bgmType = 'youtube';
    bgmYtIframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&loop=1&playlist=${vid}&playsinline=1&rel=0`;
    document.getElementById('bgm-mini-label').textContent = '🎵 유튜브 기도음악 재생 중';
    document.getElementById('bgm-yt-wrap').classList.remove('hidden');
    document.getElementById('bgm-mini-bar').classList.remove('hidden');
    closeModal('bgm-modal');
    toast('🎵 유튜브 기도음악이 연결되었습니다!');
  });

  document.getElementById('bgm-file-input').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    stopAllBgm();
    if (bgmBlobUrl) URL.revokeObjectURL(bgmBlobUrl);
    bgmBlobUrl = URL.createObjectURL(f);
    bgmType = 'audio';
    customBgmAudio.src = bgmBlobUrl;
    customBgmAudio.volume = 0.65;
    document.getElementById('bgm-mini-label').textContent = `🎵 ${f.name}`;
    document.getElementById('bgm-yt-wrap').classList.add('hidden');
    document.getElementById('bgm-mini-bar').classList.remove('hidden');
    closeModal('bgm-modal');
    customBgmAudio.play().catch(() => {});
  });

  document.getElementById('btn-start-synth-bgm').addEventListener('click', () => {
    stopAllBgm();
    bgmType = 'synth';
    const chords = [
      [261.63, 329.63, 392.00, 523.25],
      [220.00, 261.63, 329.63, 440.00],
      [174.61, 220.00, 261.63, 349.23],
      [196.00, 246.94, 293.66, 392.00]
    ];
    let idx = 0;
    const playChord = (freqs) => {
      try {
        if (!synthCtx) synthCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (synthCtx.state === 'suspended') synthCtx.resume();
        const now = synthCtx.currentTime;
        freqs.forEach((f, i) => {
          const osc = synthCtx.createOscillator();
          const gain = synthCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0.0001, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.025, now + i * 0.08 + 0.45);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 3.2);
          osc.connect(gain);
          gain.connect(synthCtx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 3.3);
        });
      } catch {}
    };
    playChord(chords[0]);
    synthTimer = setInterval(() => {
      idx = (idx + 1) % chords.length;
      playChord(chords[idx]);
    }, 3400);
    document.getElementById('bgm-mini-label').textContent = '🎹 기본 은혜 패드 기도반주';
    document.getElementById('bgm-yt-wrap').classList.add('hidden');
    document.getElementById('bgm-mini-bar').classList.remove('hidden');
    closeModal('bgm-modal');
  });

  document.getElementById('btn-stop-bgm').addEventListener('click', stopAllBgm);
  document.getElementById('btn-stop-bgm-mini').addEventListener('click', stopAllBgm);

  document.getElementById('btn-mic-toggle').addEventListener('click', async () => {
    const lbl = document.getElementById('mic-btn-label');
    const wrap = document.getElementById('mic-meter-wrap');
    if (micActive) {
      micActive = false;
      micSim = false;
      if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
      world3d.updateAvatarInfo('me', { micWave: false });
      lbl.textContent = '🎙️ 마이크';
      wrap.classList.add('hidden');
      return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (micAudioCtx.state === 'suspended') await micAudioCtx.resume();
      const src = micAudioCtx.createMediaStreamSource(micStream);
      micAnalyser = micAudioCtx.createAnalyser();
      micAnalyser.fftSize = 64;
      src.connect(micAnalyser);
      micData = new Uint8Array(micAnalyser.frequencyBinCount);
      micActive = true;
      micSim = false;
      lbl.textContent = '🎙️ ON';
      wrap.classList.remove('hidden');
      toast('🎙️ 마이크가 켜졌습니다! 말씀하시면 내 캐릭터에 초록 파동이 표시됩니다');
    } catch {
      micActive = true;
      micSim = true;
      lbl.textContent = '🎙️ 시뮬';
      wrap.classList.remove('hidden');
      toast('🎙️ 음성 파동 시뮬레이션 모드입니다');
    }
  });

  document.getElementById('btn-webcam-board').addEventListener('click', async () => {
    if (boardState.mode === 'webcam') {
      if (webcamStream) { webcamStream.getTracks().forEach((t) => t.stop()); webcamStream = null; }
      boardState.mode = 'slide';
      renderBoardSurface();
      document.getElementById('btn-webcam-board').textContent = '📹 내 카메라 칠판 송출';
      return;
    }
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camFacingMode, width: 640, height: 360 } });
      webcamVideo.srcObject = webcamStream;
      await webcamVideo.play();
      boardState.mode = 'webcam';
      document.getElementById('btn-webcam-board').textContent = '⏹️ 카메라 송출 중지';
      closeModal('board-modal');
      toast('📹 내 카메라 화면이 방 정면 3D 스크린에 실시간 투사됩니다!');
    } catch {
      toast('⚠️ HTTPS 환경에서 카메라 권한을 허용해주세요');
    }
  });

  // -------------------------------------------------------------------------
  // 모바일 가상 조이스틱 & 상단/하단 UI 버튼 바인딩
  // -------------------------------------------------------------------------
  const joyBase = document.getElementById('joystick-base');
  const joyStick = document.getElementById('joystick-knob');
  let joyPid = null;

  joyBase.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyPid = e.pointerId;
    try { joyBase.setPointerCapture(e.pointerId); } catch {}
    updateKnob(e);
  });

  joyBase.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPid) return;
    e.stopPropagation();
    updateKnob(e);
  });

  const endJoy = (e) => {
    if (e.pointerId !== joyPid) return;
    joyPid = null;
    joyStick.style.transform = 'translate(0px, 0px)';
    world3d.setJoystick(0, 0);
  };
  joyBase.addEventListener('pointerup', endJoy);
  joyBase.addEventListener('pointercancel', endJoy);

  function updateKnob(e) {
    const r = joyBase.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxR = r.width * 0.36;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) {
      dx = (dx / d) * maxR;
      dy = (dy / d) * maxR;
    }
    joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
    world3d.setJoystick(dx / maxR, dy / maxR);
  }

  // 모달 열기/닫기 헬퍼
  function openModal(id) {
    if (id === 'sarang-modal') renderSarangList();
    if (id === 'qt-modal') { renderQtLectures(); renderQtShares(); }
    if (id === 'candle-modal') renderCandlesList();
    if (id === 'board-modal') {
      document.getElementById('slide-badge-input').value = boardState.badge || '';
      document.getElementById('slide-body-input').value = boardState.body || '';
      updatePptPageUi();
      renderBoardSurface();
    }
    if (id === 'share-modal') {
      const url = window.location.href.startsWith('http') ? window.location.href : 'https://somy-qt.vercel.app/chapel';
      document.getElementById('share-url-input').value = url;
      const qr = document.getElementById('share-qr-img');
      qr.style.display = 'block';
      qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(url)}`;
    }
    document.getElementById(id).classList.remove('hidden');
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });

  // 프로필 & 캐릭터 선택 모달
  const presetBox = document.getElementById('avatar-preset-grid');
  presetBox.innerHTML = world3d.getPresets().map((p) => `
    <button type="button" data-pid="${p.id}" class="preset-pick-btn p-2.5 rounded-xl border ${
      p.id === myPresetId ? 'border-amber-400 bg-amber-400/20 text-white' : 'border-slate-700 bg-slate-900 text-slate-300'
    } text-xs font-extrabold cursor-pointer">
      😊 ${p.label}
    </button>
  `).join('');

  let tempPreset = myPresetId;
  presetBox.querySelectorAll('.preset-pick-btn').forEach((b) => {
    b.addEventListener('click', () => {
      tempPreset = b.getAttribute('data-pid');
      presetBox.querySelectorAll('.preset-pick-btn').forEach((x) => {
        x.className = 'preset-pick-btn p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-extrabold cursor-pointer';
      });
      b.className = 'preset-pick-btn p-2.5 rounded-xl border border-amber-400 bg-amber-400/20 text-white text-xs font-extrabold cursor-pointer';
    });
  });

  document.getElementById('btn-open-profile').addEventListener('click', () => {
    document.getElementById('profile-name-input').value = myName;
    openModal('profile-modal');
  });

  document.getElementById('btn-save-profile').addEventListener('click', () => {
    const n = document.getElementById('profile-name-input').value.trim();
    if (n) myName = n.slice(0, 18);
    myPresetId = tempPreset;
    try {
      localStorage.setItem('somy_world_name', myName);
      localStorage.setItem('somy_world_preset', myPresetId);
    } catch {}
    document.getElementById('my-name-badge').textContent = myName;
    world3d.updateAvatarInfo('me', { name: myName, presetId: myPresetId });
    syncMyPresence();
    closeModal('profile-modal');
    toast(`✨ '${myName}' 프로필이 적용되었습니다!`);
  });

  document.getElementById('npc-toggle-chk').addEventListener('change', (e) => {
    showNpcs = e.target.checked;
    refreshNpcsForZone();
    updateOnlineCounter();
  });

  // 상단/중앙 액션 버튼들
  document.getElementById('proximity-btn').addEventListener('click', () => {
    if (world3d.nearestInteractable) handleInteractable(world3d.nearestInteractable);
  });

  document.getElementById('btn-sip-drink').addEventListener('click', () => {
    world3d.triggerSip('me');
    world3d.showBubble('me', myDrink === 'water' ? '💧 시원하다~ 감사히 마십니다!' : '☕ 향긋한 커피 한 모금~', 3.5);
  });

  document.getElementById('btn-board-studio').addEventListener('click', () => openModal('board-modal'));
  document.getElementById('btn-sarang-Menu').addEventListener('click', () => openModal('sarang-modal'));
  document.getElementById('btn-bible-reader').addEventListener('click', () => openModal('bible-modal'));
  document.getElementById('btn-qt-academy').addEventListener('click', () => openModal('qt-modal'));
  document.getElementById('btn-candle-board').addEventListener('click', () => openModal('candle-modal'));
  document.getElementById('btn-open-bgm').addEventListener('click', () => openModal('bgm-modal'));
  document.getElementById('btn-light-mood').addEventListener('click', (e) => {
    const dimmed = world3d.toggleLightingMood();
    e.currentTarget.textContent = dimmed ? '🕯️ 간접조명 모드' : '💡 본당조명 ON';
    toast(dimmed ? '🕯️ 은은한 기도회 간접조명 모드로 전환했습니다' : '💡 화사한 CAD 본예배 전체조명 모드로 전환했습니다');
  });
  document.getElementById('btn-open-share').addEventListener('click', () => openModal('share-modal'));

  document.getElementById('btn-cam-mode').addEventListener('click', (e) => {
    const next = world3d.cameraMode === 'follow' ? 'panorama' : 'follow';
    world3d.setCameraMode(next);
    e.currentTarget.textContent = next === 'panorama' ? '🚶 캐릭터 추적 시점' : '🏛️ 전체 파노라마 뷰';
    toast(next === 'panorama' ? '🏛️ 공간 전체를 한눈에 조망합니다' : '🚶 내 캐릭터 등 뒤를 따라갑니다');
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => world3d.zoomBy(-2.0));
  document.getElementById('btn-zoom-out').addEventListener('click', () => world3d.zoomBy(2.0));

  document.getElementById('btn-fullscreen').addEventListener('click', async () => {
    const root = document.getElementById('appRoot');
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else if (root.requestFullscreen) {
      await root.requestFullscreen().catch(() => {});
    }
  });

  document.querySelectorAll('.zone-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const z = btn.getAttribute('data-zone');
      enterZone(z);
    });
  });

  document.getElementById('btn-copy-share').addEventListener('click', async () => {
    const url = document.getElementById('share-url-input').value;
    try {
      await navigator.clipboard.writeText(url);
      toast('✅ 온라인 캠퍼스 주소가 복사되었습니다!');
    } catch {}
  });

  document.getElementById('btn-amen-shout').addEventListener('click', () => {
    sendChatMessage('🙌 할렐루야 아멘!');
  });

  // -------------------------------------------------------------------------
  // 서버 상태 및 Supabase Realtime 초기화 후 월드 시작
  // -------------------------------------------------------------------------
  async function boot() {
    document.getElementById('my-name-badge').textContent = myName;
    renderBoardSurface();
    world3d.loadZone('garden');
    refreshNpcsForZone();
    world3d.start();

    try {
      const res = await fetch('/api/chapel-world').then((r) => r.json());
      if (res && res.state) {
        worldState = res.state;
        if (worldState.sarangbangs && worldState.sarangbangs.length > 0) {
          currentSarangId = worldState.sarangbangs[0].id;
        }
      }
      if (res && res.supabaseUrl && res.supabaseAnonKey && window.supabase) {
        supaClient = window.supabase.createClient(res.supabaseUrl, res.supabaseAnonKey, {
          realtime: { params: { eventsPerSecond: 12 } }
        });
        joinMultiplayerRoom();
      }
    } catch (e) {
      console.warn('Standalone offline fallback mode:', e);
    }
    updateOnlineCounter();
  }

  boot();
})();

