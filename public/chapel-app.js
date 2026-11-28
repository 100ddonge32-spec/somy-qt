/* =========================================================================
 * 소미 3D 온라인 캠퍼스 — 멀티플레이 · 사계절 루프탑 · 실물 성경책 & 음성통독 · 예스통독 · 소미 큐티 컨트롤러 (v4)
 * ========================================================================= */
(function () {
  // 개역개정 66권 목록 및 각 권의 정확한 총 장수 (총 1,189장)
  const BIBLE_BOOKS = [
    '창세기','출애굽기','레위기','민수기','신명기','여호수아','사사기','룻기','사무엘상','사무엘하',
    '열왕기상','열왕기하','역대상','역대하','에스라','느헤미야','에스더','욥기','시편','잠언',
    '전도서','아가','이사야','예레미야','예레미야애가','에스겔','다니엘','호세아','요엘','아모스',
    '오바댜','요나','미가','나훔','하박국','스바냐','학개','스가랴','말라기',
    '마태복음','마가복음','누가복음','요한복음','사도행전','로마서','고린도전서','고린도후서','갈라디아서','에베소서',
    '빌립보서','골로새서','데살로니가전서','데살로니가후서','디모데전서','디모데후서','디도서','빌레몬서','히브리서',
    '야고보서','베드로전서','베드로후서','요한일서','요한이서','요한삼서','유다서','요한계시록'
  ];

  const BIBLE_CHAPTER_COUNTS = [
    50, 40, 27, 36, 34, 24, 21, 4, 31, 24,
    22, 25, 29, 36, 10, 13, 10, 42, 150, 31,
    12, 8, 66, 52, 5, 48, 12, 14, 3, 9,
    1, 4, 7, 3, 3, 3, 2, 14, 4,
    28, 16, 24, 21, 28, 16, 16, 13, 6, 6,
    4, 4, 5, 3, 6, 4, 3, 1, 13,
    5, 5, 3, 5, 1, 1, 1, 22
  ];

  function getBookChapterCount(bookName) {
    const idx = BIBLE_BOOKS.indexOf(bookName);
    return idx >= 0 ? BIBLE_CHAPTER_COUNTS[idx] : 1;
  }

  function unitWord(bookName) {
    return bookName === '시편' ? '편' : '장';
  }

  // 정통 연대기순 성경통독(역사적 사건 시간순, 전 1,189장 완벽 매핑)
  const CHRONOLOGICAL_SEGMENTS = [
    ['창세기', 1, 11], ['욥기', 1, 42], ['창세기', 12, 50],
    ['출애굽기', 1, 40], ['레위기', 1, 27], ['민수기', 1, 36], ['신명기', 1, 34],
    ['여호수아', 1, 24], ['사사기', 1, 21], ['룻기', 1, 4],
    ['사무엘상', 1, 31], ['사무엘하', 1, 24], ['시편', 1, 72], ['역대상', 1, 29],
    ['열왕기상', 1, 11], ['잠언', 1, 31], ['전도서', 1, 12], ['아가', 1, 8], ['역대하', 1, 9],
    ['열왕기상', 12, 22], ['오바댜', 1, 1], ['요엘', 1, 3], ['열왕기하', 1, 14],
    ['요나', 1, 4], ['아모스', 1, 9], ['호세아', 1, 14], ['열왕기하', 15, 25],
    ['이사야', 1, 66], ['미가', 1, 7], ['스바냐', 1, 3], ['나훔', 1, 3], ['하박국', 1, 3],
    ['역대하', 10, 36], ['예레미야', 1, 52], ['예레미야애가', 1, 5],
    ['에스겔', 1, 48], ['다니엘', 1, 12],
    ['에스라', 1, 6], ['학개', 1, 2], ['스가랴', 1, 14], ['에스더', 1, 10],
    ['에스라', 7, 10], ['느헤미야', 1, 13], ['시편', 73, 150], ['말라기', 1, 4],
    ['마태복음', 1, 28], ['마가복음', 1, 16], ['누가복음', 1, 24], ['요한복음', 1, 21],
    ['사도행전', 1, 14], ['야고보서', 1, 5], ['갈라디아서', 1, 6], ['사도행전', 15, 18],
    ['데살로니가전서', 1, 5], ['데살로니가후서', 1, 3], ['사도행전', 19, 20],
    ['고린도전서', 1, 16], ['고린도후서', 1, 13], ['로마서', 1, 16], ['사도행전', 21, 28],
    ['에베소서', 1, 6], ['빌립보서', 1, 4], ['골로새서', 1, 4], ['빌레몬서', 1, 1],
    ['디모데전서', 1, 6], ['디도서', 1, 3], ['베드로전서', 1, 5], ['베드로후서', 1, 3],
    ['디모데후서', 1, 4], ['히브리서', 1, 13], ['유다서', 1, 1],
    ['요한일서', 1, 5], ['요한이서', 1, 1], ['요한삼서', 1, 1], ['요한계시록', 1, 22]
  ];

  const PLAN_NAMES = {
    chronological: '⏳ 연대기순 통독',
    canonical: '📖 성경 순서 정독',
    balanced: '⚖️ 구약+신약+시편 균형',
    nt_psalms: '🌱 신약·시편·잠언 집중'
  };

  function buildReadingSequence(planKey) {
    if (planKey === 'chronological') {
      const seq = [];
      CHRONOLOGICAL_SEGMENTS.forEach(([b, s, e]) => {
        for (let c = s; c <= e; c++) seq.push({ book: b, chap: c });
      });
      return seq;
    }
    if (planKey === 'nt_psalms') {
      const seq = [];
      for (let i = 39; i < 66; i++) {
        for (let c = 1; c <= BIBLE_CHAPTER_COUNTS[i]; c++) seq.push({ book: BIBLE_BOOKS[i], chap: c });
      }
      for (let c = 1; c <= 150; c++) seq.push({ book: '시편', chap: c });
      for (let c = 1; c <= 31; c++) seq.push({ book: '잠언', chap: c });
      return seq;
    }
    if (planKey === 'balanced') {
      const ot = [];
      const nt = [];
      const wis = [];
      for (let i = 0; i < 39; i++) {
        const b = BIBLE_BOOKS[i];
        if (b === '시편' || b === '잠언') {
          for (let c = 1; c <= BIBLE_CHAPTER_COUNTS[i]; c++) wis.push({ book: b, chap: c });
        } else {
          for (let c = 1; c <= BIBLE_CHAPTER_COUNTS[i]; c++) ot.push({ book: b, chap: c });
        }
      }
      for (let i = 39; i < 66; i++) {
        for (let c = 1; c <= BIBLE_CHAPTER_COUNTS[i]; c++) nt.push({ book: BIBLE_BOOKS[i], chap: c });
      }
      const seq = [];
      let oi = 0, ni = 0, wi = 0;
      while (oi < ot.length || ni < nt.length || wi < wis.length) {
        if (oi < ot.length) seq.push(ot[oi++]);
        if (oi < ot.length) seq.push(ot[oi++]);
        if (ni < nt.length) seq.push(nt[ni++]);
        if (wi < wis.length) seq.push(wis[wi++]);
      }
      return seq;
    }
    // 기본: canonical (창세기 1 ~ 요한계시록 22)
    const seq = [];
    for (let i = 0; i < 66; i++) {
      for (let c = 1; c <= BIBLE_CHAPTER_COUNTS[i]; c++) seq.push({ book: BIBLE_BOOKS[i], chap: c });
    }
    return seq;
  }

  function formatChapterQueueLabel(items) {
    if (!items || !items.length) return '';
    const groups = [];
    items.forEach((it) => {
      const last = groups[groups.length - 1];
      if (last && last.book === it.book && it.chap === last.end + 1) {
        last.end = it.chap;
      } else {
        groups.push({ book: it.book, start: it.chap, end: it.chap });
      }
    });
    return groups.map((g) => {
      const u = unitWord(g.book);
      return g.start === g.end ? `${g.book} ${g.start}${u}` : `${g.book} ${g.start}${u}~${g.end}${u}`;
    }).join(', ');
  }

  const SAMPLE_NPCS = {
    garden: [
      { id: 'npc_g1', name: '김은혜 권사', presetId: 'kwonsa_grace', x: -8.5, z: 13, rotY: Math.PI / 2, pose: 'sit', isNpc: true, bubble: '🌿 정원 공기가 참 평안하네요' },
      { id: 'npc_g2', name: '박소망 청년', presetId: 'dandy_suit', x: -12.5, z: -5.5, rotY: 0.3, pose: 'stand', drink: 'coffee', isNpc: true, bubble: '☕ 대성전 들어가기 전 커피 한 잔!' }
    ],
    sanctuary: [
      { id: 'npc_s1', name: '한충성 장로', presetId: 'elder_suit', x: -2.96, z: -4.16, rotY: Math.PI, pose: 'sit', isNpc: true, bubble: '🙏 주님 홀로 영광 받으소서' },
      { id: 'npc_s2', name: '이믿음 집사', presetId: 'tweed_bob', x: 2.96, z: -4.16, rotY: Math.PI, pose: 'sit', isNpc: true },
      { id: 'npc_s3', name: '정온유 성도', presetId: 'lovely_wave', avatarConfig: { vrmModel: 'sample_a', bodyStyle: 'model', skinTone: 'porcelain', eyeColor: 'original', expression: 'pray', hairColor: 'espresso', outfitColor: '#f1f5f9', bottomColor: '#e7e5e4', accessory: 'necklace' }, x: 0, z: -13.6, rotY: Math.PI, pose: 'kneel', isNpc: true, bubble: '🕯️ 간절히 무릎으로 기도합니다' }
    ],
    sarangbang: [
      { id: 'npc_r1', name: '윤평강 순장', presetId: 'trench_chic', x: -3.6, z: 4.1, rotY: 2.3, pose: 'sit', drink: 'coffee', isNpc: true, bubble: '🏠 사랑방에 오신 것을 환영해요!' }
    ],
    bible: [
      { id: 'npc_b1', name: '강기쁨 청년', presetId: 'lovely_wave', x: -7.2, z: -3.95, rotY: Math.PI, pose: 'sit', isNpc: true, bubble: '📖 연대기순 음성통독 중! 예스통독 🙌' }
    ],
    qt: [
      { id: 'npc_q1', name: '송찬양 간사', presetId: 'tweed_bob', x: -6.4, z: -3.75, rotY: Math.PI, pose: 'sit', isNpc: true, bubble: '🌅 오늘의 소미 큐티 말씀 함께 묵상해요!' }
    ],
    prayer: [
      { id: 'npc_p1', name: '오감사 권사', presetId: 'kwonsa_grace', avatarConfig: { vrmModel: 'shino', bodyStyle: 'model', skinTone: 'warm', eyeColor: 'original', expression: 'pray', hairColor: 'espresso', outfitColor: '#6d28d9', bottomColor: '#1e1b4b', accessory: 'necklace' }, x: -2, z: -11.2, rotY: Math.PI, pose: 'kneel', isNpc: true }
    ],
    rooftop: [
      { id: 'npc_t1', name: '류화평 청년', presetId: 'webtoon_boy', x: -6.2, z: -17.6, rotY: Math.PI, pose: 'sit', drink: 'coffee', isNpc: true, bubble: '🏞️ 산과 바다 사계절 풍경이 정말 아름답네요!' }
    ]
  };

  const SEASON_LABELS = {
    auto: '계절자동',
    spring: '🌸 봄 벚꽃·바다',
    summer: '🌊 여름 에메랄드바다',
    autumn: '🍁 가을 단풍산맥',
    winter: '❄️ 겨울 설산·적설',
    rain: '🌧️ 우천 운무·빗소리',
    night: '🌌 별빛·달빛바다'
  };

  function getTodayKstStr() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  // 소미 앱 통합 파라미터 (교회 ID · 성도 계정 · 임베드 모드)
  const chapelParams = new URLSearchParams(window.location.search);
  const isEmbeddedInSomy = chapelParams.get('embedded') === '1';
  const currentChurchId = (chapelParams.get('church_id') || 'jesus-in').trim() || 'jesus-in';
  const currentChurchName = (chapelParams.get('church_name') || '예수인교회').trim() || '예수인교회';
  let somyUserId = (chapelParams.get('user_id') || '').trim();
  const somyUserName = (chapelParams.get('user_name') || '').trim();
  const somyAvatarUrl = (chapelParams.get('avatar_url') || '').trim();
  window.SOMY_CHURCH_NAME = currentChurchName;

  function postChapelApi(action, payload) {
    return fetch('/api/chapel-world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        churchId: currentChurchId,
        payload: { ...(payload || {}), churchId: currentChurchId }
      })
    }).then((r) => r.json()).catch(() => null);
  }

  // 내 프로필 & 순정만화 3D 커스텀 아바타 상태
  const myClientId = 'u_' + Math.random().toString(36).slice(2, 10);
  let myName = '백동희 성도';
  let myPresetId = 'webtoon_boy';
  let myAvatarConfig = null;
  let myDrink = '';
  try {
    myName = localStorage.getItem('somy_world_name') || myName;
    myPresetId = localStorage.getItem('somy_world_preset_v4') || 'webtoon_boy';
    const savedCfg = localStorage.getItem('somy_world_avatar_v4');
    if (savedCfg) myAvatarConfig = JSON.parse(savedCfg);
  } catch {}
  if (somyUserName) {
    myName = somyUserName.slice(0, 18);
  }

  let showNpcs = true;
  let currentZone = 'garden';
  let currentSarangId = 'group-1';

  // -------------------------------------------------------------------------
  // 👑 관리자 및 인도자 권한 판별 (칠판 게시 · 화면공유 · 전원 찬양 송출 통제)
  // -------------------------------------------------------------------------
  function isUserLeaderOrAdmin() {
    // 1) URL 파라미터로 명시적 role이 전달된 경우 (소미 관리자/순장/교역자 연동)
    const paramRole = (chapelParams.get('role') || '').toLowerCase();
    if (paramRole === 'admin' || paramRole === 'super_admin' || paramRole === 'leader' || paramRole === 'pastor') {
      return true;
    }
    // 2) 이름에 담긴 직분 판정 (목사, 전도사, 강도사, 장로, 권사, 순장, 리더, 간사 등 관리자/리더 직분)
    const nameStr = String(myName || '').trim();
    if (/목사|전도사|강도사|장로|권사|순장|리더|간사|관리자|인도자/i.test(nameStr)) {
      return true;
    }
    // 3) 백동희 성도(본계정 마스터/총괄 관리자)
    if (nameStr.includes('백동희') || nameStr.includes('동희')) {
      return true;
    }
    // 4) 현재 사랑방의 순장/인도자 성함과 일치하는 경우
    const curSarang = (worldState.sarangbangs || []).find((s) => s.id === currentSarangId);
    if (curSarang && curSarang.leader && nameStr.includes(curSarang.leader.replace(/권사|집사|순장|성도|리더/g, '').trim())) {
      return true;
    }
    return false;
  }

  // 서버 공용 상태
  let worldState = {
    sarangbangs: [
      { id: 'group-1', name: '1교구 믿음 사랑방', leader: '김은혜 권사', topic: '주일 설교 말씀 삶으로 살아내기' },
      { id: 'group-2', name: '청년부 소망 셀모임', leader: '박소망 리더', topic: '직장과 캠퍼스에서의 경건 생활 나눔' },
      { id: 'group-3', name: '새가족 환영 사랑방', leader: '이믿음 집사', topic: '교회 안내 및 첫 믿음의 발걸음 교제' }
    ],
    qtLectures: [],
    qtShares: [],
    bibleLogs: [],
    candles: [],
    roomBoards: {}
  };

  // 소미 큐티 프리로드 캐시
  let currentSomyQt = null;
  let recentSomyQtDates = [];

  // Supabase Realtime 멀티플레이 & WebRTC 화면공유 상태
  let supaClient = null;
  let roomChannel = null;
  let campusChannel = null; // 7개 전체 공간 실시간 접속 현황 트래킹 채널
  let onlinePeers = new Map(); // 현재 룸 내 동료들
  let campusPeers = new Map(); // 전체 캠퍼스 성도들 (누가 어느 방에 있는지)

  // 칠판·화이트보드·PPT·화면공유 상태
  const boardOffscreen = document.getElementById('boardOffscreenCanvas');
  const bCtx = boardOffscreen.getContext('2d');
  const wbCanvas = document.getElementById('wbCanvas');
  const wbCtx = wbCanvas.getContext('2d');

  const wbLayer = document.createElement('canvas');
  wbLayer.width = 960;
  wbLayer.height = 540;
  const wbLayerCtx = wbLayer.getContext('2d');

  let boardState = {
    mode: 'slide',
    badge: 'SUNDAY WORSHIP · 그레이스 대성전',
    body: '여호와는 나의 빛이요 나의 구원이시니\n내가 누구를 두려워하리요 (시편 27:1)',
    slideImages: [],
    slideIndex: 0,
    embedUrl: '',
    youtubeId: ''
  };
  let loadedSlideImg = null;
  let wbColor = '#FFFFFF';
  let wbSize = 5;

  const screenShareVideo = document.getElementById('screenShareVideo');
  const webcamVideo = document.getElementById('webcamVideo');
  let localScreenStream = null;
  let isSharingMyScreen = false;
  let peerConnections = new Map();
  let webcamStream = null;
  let camFacingMode = 'user';

  // 양방향 성도 얼굴 화상 교제 (WebRTC Mesh P2P) 상태
  let myFaceCamOn = false;
  let myFaceStream = null;
  let faceFacingMode = 'user';
  let myFaceMuted = false;
  let faceGalleryCollapsed = false;
  const facePeers = new Map(); // remoteClientId -> { pc, makingOffer, remoteStream, name }

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

  // 루프탑 우천 자연 빗소리 앰비언스 Web Audio
  let rainAudioCtx = null;
  let rainSource = null;
  let rainSoundOn = false;

  function toggleRainAmbience(forceOff = false) {
    const btn = document.getElementById('btn-rain-sound');
    if (forceOff || rainSoundOn) {
      rainSoundOn = false;
      if (rainSource) {
        try { rainSource.stop(); } catch {}
        rainSource = null;
      }
      if (btn) btn.textContent = '🔊 빗소리 켜기';
      return;
    }
    try {
      if (!rainAudioCtx) rainAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (rainAudioCtx.state === 'suspended') rainAudioCtx.resume();
      const bufferSize = rainAudioCtx.sampleRate * 3;
      const noiseBuffer = rainAudioCtx.createBuffer(1, bufferSize, rainAudioCtx.sampleRate);
      const out = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        out[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = out[i];
        out[i] *= 0.65;
      }
      rainSource = rainAudioCtx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const filter = rainAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 980;

      const gain = rainAudioCtx.createGain();
      gain.gain.value = 0.14;

      rainSource.connect(filter);
      filter.connect(gain);
      gain.connect(rainAudioCtx.destination);
      rainSource.start();
      rainSoundOn = true;
      if (btn) btn.textContent = '🔇 빗소리 끄기';
      toast('🌧️ 잔잔한 루프탑 빗소리가 재생됩니다');
    } catch {}
  }

  // 책장 넘기는 사각거리는 종이 효과음
  function playPageFlipSound() {
    try {
      const ctx = synthCtx || rainAudioCtx || (synthCtx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      const dur = 0.11;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.sin((i / data.length) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.08;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      src.connect(bp);
      bp.connect(ctx.destination);
      src.start();
    } catch {}
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('world-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
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
        avatarConfig: myAvatarConfig,
        ...coords
      });
    }
  });
  window.__world3d = world3d;

  myAvatarConfig = world3d.resolveAvatarConfig(myPresetId, myAvatarConfig);

  world3d.createAvatar('me', {
    isMe: true,
    name: myName,
    presetId: myPresetId,
    avatarConfig: myAvatarConfig,
    drink: myDrink,
    x: 0,
    y: 0,
    z: 22,
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
  // 공간(Zone) 이동 & 루프탑 사계절 배경 전환 처리
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

  function updateRooftopUi() {
    const isRoof = currentZone === 'rooftop';
    document.getElementById('btn-rooftop-season').classList.toggle('hidden', !isRoof);
    // 기본적으로 3단으로 화면을 가리던 사계절 선택 바는 숨겨두고, 사용자가 [🏞️ 사계절배경] 버튼을 눌렀을 때만 토글되도록 변경
    const seasonBar = document.getElementById('rooftop-season-bar');
    if (!isRoof) {
      seasonBar.classList.add('hidden');
      if (rainSoundOn) toggleRainAmbience(true);
    }

    if (isRoof) {
      const resolved = world3d.getResolvedRooftopSeason();
      const mode = world3d.rooftopSeasonMode || 'auto';
      document.getElementById('zone-title-badge').textContent = `☕ 루프탑 카페 · ${SEASON_LABELS[resolved] || ''}`;
      document.getElementById('btn-rain-sound').classList.toggle('hidden', resolved !== 'rain');
      document.querySelectorAll('.roof-season-btn').forEach((b) => {
        const active = b.getAttribute('data-season') === mode;
        b.className = active
          ? 'roof-season-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-teal-400 text-slate-950 shadow cursor-pointer'
          : 'roof-season-btn shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-200 hover:bg-white/10 cursor-pointer';
      });
    }
  }

  document.querySelectorAll('.roof-season-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const season = btn.getAttribute('data-season') || 'auto';
      const resolved = world3d.setRooftopSeason(season);
      refreshNpcsForZone();
      applySavedRoomBoard();
      if (resolved !== 'rain' && rainSoundOn) toggleRainAmbience(true);
      updateRooftopUi();
      toast(`🏞️ 루프탑 풍경이 [${SEASON_LABELS[resolved]}] 실사 배경으로 변경되었습니다!`);
    });
  });

  document.getElementById('btn-rooftop-season').addEventListener('click', () => {
    const bar = document.getElementById('rooftop-season-bar');
    bar.classList.toggle('hidden');
  });

  document.getElementById('btn-rain-sound').addEventListener('click', () => toggleRainAmbience(false));

  function enterZone(zoneId, sarangIdOpt) {
    if (sarangIdOpt) currentSarangId = sarangIdOpt;
    if (currentZone === 'bible' && zoneId !== 'bible') stopBibleTts();
    currentZone = zoneId;
    const meta = world3d.getZoneMeta(zoneId);
    const sarangObj = getCurrentSarangObj();

    if (isSharingMyScreen) stopMyScreenShare();

    world3d.clearRemoteAvatars(false);
    world3d.loadZone(zoneId, {
      candles: worldState.candles,
      sarangbangName: sarangObj ? sarangObj.name : '사랑방'
    });
    if (myFaceCamOn && myFaceStream) {
      world3d.setAvatarVideoStream('me', myFaceStream, faceFacingMode === 'user');
    }
    refreshNpcsForZone();
    applySavedRoomBoard();

    const titleText = zoneId === 'sarangbang' && sarangObj ? `🏠 ${sarangObj.name}` : meta.name;
    document.getElementById('zone-title-badge').textContent = titleText;
    document.getElementById('btn-sarang-Menu').classList.toggle('hidden', zoneId !== 'sarangbang');
    document.getElementById('btn-bible-reader').classList.toggle('hidden', zoneId !== 'bible');
    document.getElementById('btn-yes-tongdok-quick').classList.toggle('hidden', zoneId !== 'bible');
    document.getElementById('btn-qt-academy').classList.toggle('hidden', zoneId !== 'qt');
    document.getElementById('btn-candle-board').classList.toggle('hidden', zoneId !== 'sanctuary' && zoneId !== 'prayer');
    document.getElementById('btn-board-studio').classList.toggle('hidden', !meta.hasBoard);
    updateRooftopUi();

    const ZONE_SHORT_NAMES = {
      garden: { icon: '🌿', name: '앞마당 정원' },
      sanctuary: { icon: '🏛️', name: '그레이스 대성전' },
      sarangbang: { icon: '🏠', name: '사랑방(소그룹)' },
      bible: { icon: '📖', name: '성경통독방' },
      qt: { icon: '✏️', name: '큐티방' },
      prayer: { icon: '🕯️', name: '기도·갤러리' },
      rooftop: { icon: '☕', name: '루프탑 카페' }
    };
    const zInfo = ZONE_SHORT_NAMES[zoneId] || { icon: '📍', name: meta.name };
    const curIconEl = document.getElementById('cur-zone-icon');
    const curNameEl = document.getElementById('cur-zone-name');
    if (curIconEl) curIconEl.textContent = zInfo.icon;
    if (curNameEl) curNameEl.textContent = zInfo.name;

    document.querySelectorAll('.zone-tab-btn').forEach((b) => {
      const active = b.getAttribute('data-zone') === zoneId;
      b.className = active
        ? 'zone-tab-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 shadow cursor-pointer text-left transition'
        : 'zone-tab-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 cursor-pointer text-left transition';
    });

    // 이동 완료 후 펼쳐져 있던 공간이동 시트는 닫아 화면 시야 복원
    const sheet = document.getElementById('bottom-zone-sheet');
    if (sheet && !sheet.classList.contains('hidden')) {
      sheet.classList.add('hidden');
    }

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
    } else if (item.type === 'rooftop_season') {
      const order = ['spring', 'summer', 'autumn', 'winter', 'rain', 'night'];
      const cur = world3d.getResolvedRooftopSeason();
      const next = order[(order.indexOf(cur) + 1) % order.length];
      world3d.setRooftopSeason(next);
      refreshNpcsForZone();
      applySavedRoomBoard();
      if (next !== 'rain' && rainSoundOn) toggleRainAmbience(true);
      updateRooftopUi();
      document.getElementById('rooftop-season-bar').classList.remove('hidden');
      toast(`🔭 전망대 풍경을 [${SEASON_LABELS[next]}] 테마로 전환했습니다!`);
    } else if (item.type === 'board') {
      if (boardState.mode === 'screenshare' || boardState.mode === 'ppt_embed' || boardState.mode === 'youtube') {
        openMediaFullscreenModal();
      } else {
        openModal('board-modal');
      }
    } else if (item.type === 'bible_desk') {
      world3d.sitOrPoseMe('sit', item.x, 0, item.z, item.rotY ?? Math.PI);
      switchBibleTab('book');
      openModal('bible-modal');
    } else if (item.type === 'bible_board') {
      switchBibleTab('board');
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
  // Supabase Realtime 멀티플레이 (성도 접속·이동·채팅·칠판·예스통독 실시간 동기화)
  // -------------------------------------------------------------------------
  function updateOnlineCounter() {
    const realCount = Math.max(1, campusPeers.size || (1 + onlinePeers.size));
    const npcCount = showNpcs ? (SAMPLE_NPCS[currentZone] || []).length : 0;
    const el = document.getElementById('online-count-label');
    if (el) {
      // 모바일 화면(360~430px)에서 버튼들이 겹치지 않도록 짧고 깔끔하게 표시
      const total = realCount + npcCount;
      el.textContent = `🟢 ${total}명`;
    }
  }

  function syncMyPresence() {
    const me = world3d.avatars.get('me');
    const myPayload = {
      clientId: myClientId,
      name: myName,
      presetId: myPresetId,
      avatarConfig: myAvatarConfig,
      drink: myDrink,
      camOn: myFaceCamOn,
      zoneId: currentZone,
      sarangId: currentSarangId,
      zoneName: (ZONE_SHORT_NAMES[currentZone] && ZONE_SHORT_NAMES[currentZone].name) || currentZone,
      x: me ? me.x : 0,
      y: 0,
      z: me ? me.z : 16,
      rotY: me ? me.rotY : Math.PI,
      pose: me ? me.pose : 'stand'
    };

    if (roomChannel) {
      roomChannel.track(myPayload).catch(() => {});
    }
    if (campusChannel) {
      campusChannel.track({
        clientId: myClientId,
        name: myName,
        presetId: myPresetId,
        avatarConfig: myAvatarConfig,
        zoneId: currentZone,
        sarangId: currentSarangId,
        zoneName: (ZONE_SHORT_NAMES[currentZone] && ZONE_SHORT_NAMES[currentZone].name) || currentZone,
        camOn: myFaceCamOn
      }).catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // 👥 전체 캠퍼스 실시간 접속자 트래킹 및 접속현황 모달 렌더링
  // -------------------------------------------------------------------------
  const ZONE_SHORT_NAMES = {
    garden: { icon: '🌿', name: '앞마당 정원' },
    sanctuary: { icon: '🏛️', name: '그레이스 대성전' },
    sarangbang: { icon: '🏠', name: '사랑방(소그룹)' },
    bible: { icon: '📖', name: '성경통독방' },
    qt: { icon: '✏️', name: '큐티방' },
    prayer: { icon: '🕯️', name: '기도·갤러리' },
    rooftop: { icon: '☕', name: '루프탑 카페' }
  };

  function initCampusPresenceChannel() {
    if (!supaClient || campusChannel) return;
    const churchScope = currentChurchId === 'jesus-in' ? '' : `${currentChurchId}:`;
    const chanName = `somy_world_v2:${churchScope}global_campus_presence`;
    campusChannel = supaClient.channel(chanName, {
      config: { presence: { key: myClientId } }
    });

    campusChannel.on('presence', { event: 'sync' }, () => {
      const state = campusChannel.presenceState();
      campusPeers.clear();
      Object.keys(state).forEach((key) => {
        const arr = state[key];
        if (!arr || !arr.length) return;
        campusPeers.set(key, arr[arr.length - 1]);
      });
      updateOnlineCounter();
      renderPresenceModalList();
    });

    campusChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        syncMyPresence();
      }
    });
  }

  function renderPresenceModalList() {
    const listEl = document.getElementById('presence-peers-list');
    const badgeEl = document.getElementById('presence-modal-total-badge');
    if (!listEl) return;

    const allMembers = [];

    // 1. 나 자신
    allMembers.push({
      clientId: myClientId,
      name: myName || '나 (성도)',
      zoneId: currentZone,
      zoneName: (ZONE_SHORT_NAMES[currentZone] && ZONE_SHORT_NAMES[currentZone].name) || currentZone,
      icon: (ZONE_SHORT_NAMES[currentZone] && ZONE_SHORT_NAMES[currentZone].icon) || '📍',
      isMe: true,
      camOn: myFaceCamOn
    });

    // 2. 다른 실제 접속 성도들
    campusPeers.forEach((p, cid) => {
      if (cid === myClientId) return;
      const zid = p.zoneId || currentZone;
      allMembers.push({
        clientId: cid,
        name: p.name || '성도',
        zoneId: zid,
        zoneName: (ZONE_SHORT_NAMES[zid] && ZONE_SHORT_NAMES[zid].name) || p.zoneName || zid,
        icon: (ZONE_SHORT_NAMES[zid] && ZONE_SHORT_NAMES[zid].icon) || '📍',
        isMe: false,
        camOn: !!p.camOn
      });
    });

    // 3. 상주 NPC 교제 성도들 (활성화된 경우)
    if (showNpcs) {
      Object.entries(SAMPLE_NPCS).forEach(([zKey, npcs]) => {
        npcs.forEach((npc) => {
          allMembers.push({
            clientId: npc.id,
            name: npc.name,
            zoneId: zKey,
            zoneName: (ZONE_SHORT_NAMES[zKey] && ZONE_SHORT_NAMES[zKey].name) || zKey,
            icon: (ZONE_SHORT_NAMES[zKey] && ZONE_SHORT_NAMES[zKey].icon) || '📍',
            isNpc: true,
            bubble: npc.bubble || ''
          });
        });
      });
    }

    if (badgeEl) {
      const realOnly = allMembers.filter((m) => !m.isNpc).length;
      badgeEl.textContent = `${realOnly}명 온라인 (${allMembers.length}명 참여중)`;
    }

    listEl.innerHTML = '';
    allMembers.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/50 transition';

      const isCurrentHere = m.zoneId === currentZone;

      row.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold shadow shrink-0 ${m.isMe ? 'ring-2 ring-amber-400' : ''}">
            ${m.isMe ? '👤' : m.isNpc ? '🤖' : '✨'}
            <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${m.isMe || !m.isNpc ? 'bg-emerald-400' : 'bg-sky-400'} border-2 border-slate-900"></span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-white truncate">${m.name}</span>
              ${m.isMe ? '<span class="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">나</span>' : ''}
              ${m.isNpc ? '<span class="px-1.5 py-0.2 rounded-full bg-sky-500/30 text-sky-300 text-[9px] font-bold">교제성도</span>' : ''}
              ${m.camOn ? '<span class="text-[10px]" title="카메라 켬">📹</span>' : ''}
            </div>
            <div class="flex items-center gap-1 text-[11px] text-slate-300">
              <span>${m.icon}</span>
              <span class="truncate">${m.zoneName}</span>
              ${isCurrentHere ? '<span class="text-[10px] text-emerald-300 font-extrabold ml-1">(같은 공간)</span>' : ''}
            </div>
          </div>
        </div>
        <div>
          ${isCurrentHere
            ? '<span class="px-2.5 py-1 rounded-xl bg-white/10 text-white/60 text-[10px] font-bold">현재 공간</span>'
            : `<button class="btn-warp-to-peer px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold cursor-pointer shadow transition active:scale-95" data-warpzone="${m.zoneId}">
                이동 ➔
               </button>`
          }
        </div>
      `;

      const warpBtn = row.querySelector('.btn-warp-to-peer');
      if (warpBtn) {
        warpBtn.addEventListener('click', () => {
          closeModal('presence-modal');
          enterZone(m.zoneId);
          toast(`🚀 ${m.name}님이 계신 [${m.zoneName}]으로 이동했습니다!`);
        });
      }

      listEl.appendChild(row);
    });
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
    closeAllFacePeers();

    if (roomChannel && supaClient) {
      supaClient.removeChannel(roomChannel);
      roomChannel = null;
    }
    updateOnlineCounter();
    renderFaceCamGallery();
    if (!supaClient) return;

    const churchScope = currentChurchId === 'jesus-in' ? '' : `${currentChurchId}:`;
    const chanName = `somy_world_v2:${churchScope}${getRoomKey()}`;
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
        const wasKnown = onlinePeers.has(key);
        onlinePeers.set(key, p);
        world3d.createAvatar(key, {
          isMe: false,
          isNpc: false,
          name: p.name || '성도',
          presetId: p.presetId || 'dandy_suit',
          avatarConfig: p.avatarConfig || undefined,
          drink: p.drink || '',
          x: p.x ?? 0,
          y: p.y ?? 0,
          z: p.z ?? 14,
          rotY: p.rotY ?? Math.PI,
          pose: p.pose || 'stand'
        });

        if (isSharingMyScreen && localScreenStream && !peerConnections.has(key)) {
          initiateScreenShareOfferTo(key);
        }

        // 양방향 얼굴 화상 교제 자동 연결: 내가 카메라를 켜고 있거나 상대방이 카메라를 켜고 있으면 WebRTC 연결 수립
        if (myFaceCamOn && myFaceStream && (!facePeers.has(key) || !wasKnown)) {
          initiateFaceOfferTo(key, p.name || '성도');
        } else if (p.camOn && !facePeers.has(key)) {
          broadcastEvent('face_rtc', {
            type: 'cam_request',
            fromId: myClientId,
            targetId: key,
            name: myName
          });
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
          removeFacePeer(oldKey);
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

    roomChannel.on('broadcast', { event: 'avatar_style' }, ({ payload }) => {
      if (!payload || payload.clientId === myClientId) return;
      if (world3d.avatars.has(payload.clientId)) {
        world3d.updateAvatarInfo(payload.clientId, {
          name: payload.name,
          presetId: payload.presetId,
          avatarConfig: payload.avatarConfig
        });
      }
    });

    roomChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (!payload) return;
      appendChatMessage(payload.name || '성도', payload.text || '', false);
      if (payload.clientId && world3d.avatars.has(payload.clientId)) {
        world3d.showBubble(payload.clientId, payload.text, 5.5);
      }
    });

    roomChannel.on('broadcast', { event: 'bible_log_sync' }, ({ payload }) => {
      if (payload && Array.isArray(payload.bibleLogs)) {
        worldState.bibleLogs = payload.bibleLogs;
        renderBibleBoard();
        if (payload.reader) {
          toast(`🙌 ${payload.reader}님이 '${payload.rangeLabel}' 예스통독을 완료했습니다!`);
        }
      }
    });

    roomChannel.on('broadcast', { event: 'qt_share_sync' }, ({ payload }) => {
      if (payload && Array.isArray(payload.qtShares)) {
        worldState.qtShares = payload.qtShares;
        renderQtShares();
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

    // 🎵 관리자가 송출한 배경 기도음악/유튜브 찬양 전 접속자 실시간 동기화
    roomChannel.on('broadcast', { event: 'bgm_sync' }, ({ payload }) => {
      if (!payload) return;
      if (payload.action === 'play_youtube') {
        const vid = payload.youtubeId;
        if (!vid) return;
        stopAllBgm(false);
        bgmType = 'youtube';
        bgmYtIframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&loop=1&playlist=${vid}&playsinline=1&rel=0`;
        const miniLabel = document.getElementById('bgm-mini-label');
        if (miniLabel) miniLabel.textContent = `🎵 ${payload.senderName || '인도자'}의 찬양 연주`;
        const wrap = document.getElementById('bgm-yt-wrap');
        if (wrap) wrap.classList.remove('hidden');
        document.getElementById('bgm-mini-bar').classList.remove('hidden');
        const listenerStatus = document.getElementById('bgm-listener-status');
        if (listenerStatus) listenerStatus.textContent = `▶️ ${payload.senderName || '관리자'}님이 설정한 유튜브 찬양이 재생 중입니다.`;
        toast(`🎵 ${payload.senderName || '인도자'}님이 공간 찬양 음악을 연결했습니다!`);
      } else if (payload.action === 'play_synth') {
        stopAllBgm(false);
        playGraceSynthChords();
        toast('🎹 인도자가 기본 은혜 패드 기도반주를 시작했습니다');
      } else if (payload.action === 'stop') {
        stopAllBgm(false);
        toast('⏹️ 배경 음악이 중지되었습니다');
      }
    });

    roomChannel.on('broadcast', { event: 'rtc_signal' }, async ({ payload }) => {
      if (!payload || payload.targetId !== myClientId) return;
      await handleRtcSignal(payload);
    });

    // 양방향 성도 얼굴 화상 교제 시그널링 수신
    roomChannel.on('broadcast', { event: 'face_rtc' }, async ({ payload }) => {
      if (!payload || payload.fromId === myClientId) return;
      if (payload.targetId && payload.targetId !== myClientId) return;
      await handleFaceRtcSignal(payload);
    });

    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        syncMyPresence();
        updateOnlineCounter();
        if (myFaceCamOn && myFaceStream) {
          broadcastEvent('face_rtc', { type: 'cam_hello', fromId: myClientId, name: myName });
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // 📹 성도 간 양방향 실시간 얼굴 화상 교제 (WebRTC Mesh P2P — Egress 0)
  // -------------------------------------------------------------------------
  const FACE_RTC_CFG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  function renderFaceCamGallery() {
    const gallery = document.getElementById('face-cam-gallery');
    const tilesEl = document.getElementById('face-cam-tiles');
    const titleEl = document.getElementById('face-cam-count-title');
    if (!gallery || !tilesEl) return;

    const activeItems = [];
    if (myFaceCamOn && myFaceStream) {
      activeItems.push({
        id: 'me',
        name: `★ ${myName} (나)`,
        stream: myFaceStream,
        muted: true,
        mirror: faceFacingMode === 'user'
      });
    }
    for (const [remoteId, entry] of facePeers.entries()) {
      if (entry.remoteStream && entry.remoteStream.getVideoTracks().length > 0) {
        const peerInfo = onlinePeers.get(remoteId);
        activeItems.push({
          id: remoteId,
          name: `🟢 ${(peerInfo && peerInfo.name) || entry.name || '성도'}`,
          stream: entry.remoteStream,
          muted: false,
          mirror: false
        });
      }
    }

    if (activeItems.length === 0) {
      gallery.classList.add('hidden');
      tilesEl.innerHTML = '';
      return;
    }

    gallery.classList.remove('hidden');
    if (titleEl) titleEl.textContent = `📹 실시간 얼굴 교제 (${activeItems.length}명)`;
    tilesEl.classList.toggle('hidden', faceGalleryCollapsed);

    // 기존 비디오 엘리먼트 재사용으로 깜빡임 방지
    const keepIds = new Set(activeItems.map((it) => it.id));
    Array.from(tilesEl.children).forEach((child) => {
      if (!keepIds.has(child.getAttribute('data-fcid'))) {
        child.remove();
      }
    });

    activeItems.forEach((it) => {
      let card = tilesEl.querySelector(`[data-fcid="${it.id}"]`);
      if (!card) {
        card = document.createElement('div');
        card.setAttribute('data-fcid', it.id);
        card.className = 'face-tile-card relative shrink-0 w-28 h-20 sm:w-36 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-400/70 bg-slate-900 shadow-lg cursor-pointer transition-all';
        card.innerHTML = `
          <video autoplay playsinline class="w-full h-full object-cover"></video>
          <div class="face-tile-label absolute bottom-1 inset-x-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-extrabold text-white truncate text-center"></div>
        `;
        card.addEventListener('click', () => {
          card.classList.toggle('w-28');
          card.classList.toggle('h-20');
          card.classList.toggle('sm:w-36');
          card.classList.toggle('sm:h-28');
          card.classList.toggle('w-52');
          card.classList.toggle('h-40');
          card.classList.toggle('sm:w-64');
          card.classList.toggle('sm:h-48');
        });
        tilesEl.appendChild(card);
      }
      const vid = card.querySelector('video');
      const lbl = card.querySelector('.face-tile-label');
      lbl.textContent = it.name;
      vid.muted = !!it.muted;
      vid.style.transform = it.mirror ? 'scaleX(-1)' : 'none';
      if (vid.srcObject !== it.stream) {
        vid.srcObject = it.stream;
        vid.play().catch(() => {});
      }
    });
  }

  function removeFacePeer(remoteId) {
    const entry = facePeers.get(remoteId);
    if (entry) {
      try { entry.pc.close(); } catch {}
      facePeers.delete(remoteId);
    }
    world3d.setAvatarVideoStream(remoteId, null, false);
    renderFaceCamGallery();
  }

  function closeAllFacePeers() {
    for (const remoteId of Array.from(facePeers.keys())) {
      const entry = facePeers.get(remoteId);
      if (entry) {
        try { entry.pc.close(); } catch {}
      }
      world3d.setAvatarVideoStream(remoteId, null, false);
    }
    facePeers.clear();
    renderFaceCamGallery();
  }

  function getOrCreateFacePeer(remoteId, remoteName) {
    if (facePeers.has(remoteId)) {
      const existing = facePeers.get(remoteId);
      if (remoteName) existing.name = remoteName;
      return existing;
    }

    const pc = new RTCPeerConnection(FACE_RTC_CFG);
    const entry = {
      pc,
      makingOffer: false,
      remoteStream: new MediaStream(),
      name: remoteName || '성도'
    };
    facePeers.set(remoteId, entry);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        broadcastEvent('face_rtc', {
          type: 'ice',
          fromId: myClientId,
          targetId: remoteId,
          name: myName,
          candidate: e.candidate
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        entry.remoteStream = e.streams[0];
      } else if (e.track) {
        entry.remoteStream.addTrack(e.track);
      }
      world3d.setAvatarVideoStream(remoteId, entry.remoteStream, false);
      renderFaceCamGallery();
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removeFacePeer(remoteId);
      }
    };

    return entry;
  }

  function attachMyFaceTracksTo(entry) {
    if (!myFaceCamOn || !myFaceStream) return;
    const senders = entry.pc.getSenders();
    myFaceStream.getTracks().forEach((track) => {
      const sameKindSender = senders.find((s) => s.track && s.track.kind === track.kind);
      if (sameKindSender) {
        sameKindSender.replaceTrack(track).catch(() => {});
      } else {
        entry.pc.addTrack(track, myFaceStream);
      }
    });
  }

  async function initiateFaceOfferTo(remoteId, remoteName) {
    try {
      const entry = getOrCreateFacePeer(remoteId, remoteName);
      attachMyFaceTracksTo(entry);
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      await entry.pc.setLocalDescription(offer);
      entry.makingOffer = false;
      broadcastEvent('face_rtc', {
        type: 'offer',
        fromId: myClientId,
        targetId: remoteId,
        name: myName,
        sdp: entry.pc.localDescription
      });
    } catch (err) {
      const entry = facePeers.get(remoteId);
      if (entry) entry.makingOffer = false;
      console.warn('Face offer error:', err);
    }
  }

  async function handleFaceRtcSignal(msg) {
    try {
      const fromId = msg.fromId;
      if (msg.type === 'cam_hello') {
        // 상대방이 카메라를 켰음을 알림 -> 연결 요청 전송
        broadcastEvent('face_rtc', {
          type: 'cam_request',
          fromId: myClientId,
          targetId: fromId,
          name: myName
        });
        return;
      }
      if (msg.type === 'cam_request') {
        if (myFaceCamOn && myFaceStream) {
          await initiateFaceOfferTo(fromId, msg.name);
        }
        return;
      }
      if (msg.type === 'cam_off') {
        const entry = facePeers.get(fromId);
        if (entry) {
          entry.remoteStream = new MediaStream();
        }
        world3d.setAvatarVideoStream(fromId, null, false);
        renderFaceCamGallery();
        return;
      }

      const entry = getOrCreateFacePeer(fromId, msg.name);
      const pc = entry.pc;

      if (msg.type === 'offer') {
        const polite = myClientId < fromId;
        const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
        if (offerCollision) {
          if (!polite) return;
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }

        // 내 카메라도 켜져 있다면 응답(answer)에 내 영상+음성 트랙도 함께 실어 양방향 연결!
        attachMyFaceTracksTo(entry);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcastEvent('face_rtc', {
          type: 'answer',
          fromId: myClientId,
          targetId: fromId,
          name: myName,
          sdp: pc.localDescription
        });
      } else if (msg.type === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }
      } else if (msg.type === 'ice' && msg.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
      }
    } catch (err) {
      console.warn('Face RTC signal error:', err);
    }
  }

  async function startMyFaceCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('⚠️ 카메라 연결은 HTTPS 보안 연결 또는 localhost에서 지원됩니다');
      return;
    }
    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: faceFacingMode, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
          audio: true
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: faceFacingMode, width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false
        });
      }

      if (myFaceStream) {
        myFaceStream.getTracks().forEach((t) => t.stop());
      }
      myFaceStream = stream;
      myFaceCamOn = true;
      myFaceMuted = false;

      document.getElementById('face-cam-btn-label').textContent = '⏹️ 얼굴끄기';
      document.getElementById('btn-face-mute').textContent = '🎙️ 소리켜짐';

      world3d.setAvatarVideoStream('me', myFaceStream, faceFacingMode === 'user');
      renderFaceCamGallery();
      syncMyPresence();

      broadcastEvent('face_rtc', { type: 'cam_hello', fromId: myClientId, name: myName });
      for (const [remoteId, p] of onlinePeers.entries()) {
        await initiateFaceOfferTo(remoteId, p.name || '성도');
      }
      toast('📹 내 얼굴 카메라가 켜졌습니다! 같은 공간 성도들과 서로 얼굴을 보며 교제합니다');
    } catch {
      toast('⚠️ 브라우저에서 카메라 접근 권한을 허용해주세요');
    }
  }

  function stopMyFaceCam() {
    myFaceCamOn = false;
    if (myFaceStream) {
      myFaceStream.getTracks().forEach((t) => t.stop());
      myFaceStream = null;
    }
    document.getElementById('face-cam-btn-label').textContent = '📹 얼굴켜기';
    world3d.setAvatarVideoStream('me', null, false);
    syncMyPresence();
    broadcastEvent('face_rtc', { type: 'cam_off', fromId: myClientId, name: myName });
    renderFaceCamGallery();
    toast('📹 내 얼굴 카메라를 껐습니다');
  }

  document.getElementById('btn-face-cam-toggle').addEventListener('click', () => {
    if (myFaceCamOn) stopMyFaceCam();
    else startMyFaceCam();
  });

  document.getElementById('btn-face-flip').addEventListener('click', async () => {
    faceFacingMode = faceFacingMode === 'user' ? 'environment' : 'user';
    if (myFaceCamOn) {
      await startMyFaceCam();
    }
  });

  document.getElementById('btn-face-mute').addEventListener('click', () => {
    if (!myFaceStream) return;
    myFaceMuted = !myFaceMuted;
    myFaceStream.getAudioTracks().forEach((t) => { t.enabled = !myFaceMuted; });
    document.getElementById('btn-face-mute').textContent = myFaceMuted ? '🔇 음소거됨' : '🎙️ 소리켜짐';
  });

  document.getElementById('btn-face-collapse').addEventListener('click', (e) => {
    faceGalleryCollapsed = !faceGalleryCollapsed;
    e.currentTarget.textContent = faceGalleryCollapsed ? '펼치기' : '접기';
    renderFaceCamGallery();
  });

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
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 화이트보드 3D 칠판 반영은 관리자/인도자만 가능합니다');
      return;
    }
    boardState.mode = 'whiteboard';
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'whiteboard' });
    closeModal('board-modal');
    toast('✏️ 화이트보드 판서 화면이 3D 칠판에 적용되었습니다');
  });

  document.getElementById('ppt-files-input').addEventListener('change', async (e) => {
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 PPT/강의자료 등록은 관리자/인도자만 가능합니다');
      e.target.value = '';
      return;
    }
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
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 슬라이드 넘김은 관리자/인도자만 제어할 수 있습니다');
      return;
    }
    const total = (boardState.slideImages || []).length;
    if (!total) return;
    boardState.mode = 'ppt_images';
    boardState.slideIndex = (boardState.slideIndex + dir + total) % total;
    loadCurrentPptImage();
    broadcastEvent('board_sync', { mode: 'ppt_images', slideIndex: boardState.slideIndex });
  }

  document.getElementById('btn-ppt-prev').addEventListener('click', () => stepPptSlide(-1));
  document.getElementById('btn-ppt-next').addEventListener('click', () => stepPptSlide(1));

  document.getElementById('btn-apply-embed').addEventListener('click', async () => {
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 PPT/웹링크 공유는 관리자/인도자만 가능합니다');
      return;
    }
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

  document.getElementById('btn-apply-slide-text').addEventListener('click', async () => {
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 칠판 자막 게시는 관리자/인도자만 가능합니다');
      return;
    }
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

  document.getElementById('btn-apply-yt-board').addEventListener('click', async () => {
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 유튜브 영상 게시는 관리자/인도자만 가능합니다');
      return;
    }
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
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 PC 화면/영상 공유는 관리자 및 임명된 리더만 가능합니다');
      return;
    }
    if (isSharingMyScreen) stopMyScreenShare();
    else startMyScreenShare();
  });

  document.getElementById('btn-close-dock').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('live-media-dock').classList.add('hidden');
  });

  // 🔍 실시간 공유 화면 터치 시 크게 보기 (플로팅 독 또는 3D 칠판 터치)
  function openMediaFullscreenModal() {
    const modal = document.getElementById('media-fullscreen-modal');
    const fsVideo = document.getElementById('screenShareVideoFs');
    const fsIframe = document.getElementById('dockEmbedFrameFs');
    const fsCanvas = document.getElementById('boardCanvasFs');
    const titleEl = document.getElementById('fs-modal-title');
    if (!modal) return;

    fsVideo.classList.add('hidden');
    fsIframe.classList.add('hidden');
    fsCanvas.classList.add('hidden');

    if (boardState.mode === 'screenshare' && screenShareVideo && screenShareVideo.srcObject) {
      if (titleEl) titleEl.textContent = '🖥️ 실시간 PC 화면(PPT) 공유 확대';
      fsVideo.srcObject = screenShareVideo.srcObject;
      fsVideo.play().catch(() => {});
      fsVideo.classList.remove('hidden');
      modal.classList.remove('hidden');
    } else if (boardState.mode === 'ppt_embed' && boardState.embedUrl) {
      if (titleEl) titleEl.textContent = '📊 실시간 공유 PPT / 강의자료 확대';
      fsIframe.src = boardState.embedUrl;
      fsIframe.classList.remove('hidden');
      modal.classList.remove('hidden');
    } else if (boardState.mode === 'youtube' && boardState.youtubeId) {
      if (titleEl) titleEl.textContent = '▶️ 실시간 공유 유튜브 영상 확대';
      fsIframe.src = `https://www.youtube.com/embed/${boardState.youtubeId}?autoplay=1&playsinline=1&rel=0`;
      fsIframe.classList.remove('hidden');
      modal.classList.remove('hidden');
    } else {
      // 일반 화이트보드 판서 또는 슬라이드 화면 복제 렌더링
      if (titleEl) titleEl.textContent = '👨‍🏫 3D 칠판 강의 화면 확대';
      fsCanvas.width = boardOffscreen.width;
      fsCanvas.height = boardOffscreen.height;
      const fsCtx = fsCanvas.getContext('2d');
      fsCtx.drawImage(boardOffscreen, 0, 0);
      fsCanvas.classList.remove('hidden');
      modal.classList.remove('hidden');
    }
  }

  function closeMediaFullscreenModal() {
    const modal = document.getElementById('media-fullscreen-modal');
    const fsVideo = document.getElementById('screenShareVideoFs');
    const fsIframe = document.getElementById('dockEmbedFrameFs');
    if (modal) modal.classList.add('hidden');
    if (fsVideo) {
      fsVideo.srcObject = null;
      fsVideo.classList.add('hidden');
    }
    if (fsIframe) {
      fsIframe.src = '';
      fsIframe.classList.add('hidden');
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  const dockContainer = document.getElementById('dock-media-container');
  if (dockContainer) {
    dockContainer.addEventListener('click', () => {
      openMediaFullscreenModal();
    });
  }

  const btnFsDock = document.getElementById('btn-fullscreen-dock');
  if (btnFsDock) {
    btnFsDock.addEventListener('click', (e) => {
      e.stopPropagation();
      openMediaFullscreenModal();
    });
  }

  const btnCloseFsModal = document.getElementById('btn-close-fs-modal');
  if (btnCloseFsModal) {
    btnCloseFsModal.addEventListener('click', () => {
      closeMediaFullscreenModal();
    });
  }

  const btnNativeFs = document.getElementById('btn-native-fs');
  if (btnNativeFs) {
    btnNativeFs.addEventListener('click', async () => {
      const modal = document.getElementById('media-fullscreen-modal');
      if (!modal) return;
      if (!document.fullscreenElement) {
        await modal.requestFullscreen().catch(() => {});
        btnNativeFs.textContent = '📱 창모드로 복귀';
      } else {
        await document.exitFullscreen().catch(() => {});
        btnNativeFs.textContent = '📱 기기 전체화면';
      }
    });
  }

  async function saveRoomBoardToServer() {
    try {
      await postChapelApi('update_room_board', { roomKey: getRoomKey(), board: boardState });
    } catch {}
  }

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
        const res = await postChapelApi('delete_sarangbang', { id });
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
    const res = await postChapelApi('create_sarangbang', {
      name,
      leader: leaderEl.value.trim() || myName,
      topic: topicEl.value.trim() || '함께 말씀을 나누는 사랑방'
    });

    if (res && res.room) {
      worldState = res.state;
      nameEl.value = '';
      topicEl.value = '';
      closeModal('sarang-modal');
      enterZone('sarangbang', res.room.id);
    }
  });

  // -------------------------------------------------------------------------
  // 📖 성경통독방 — 실물 성경책 펼침 뷰어 + 음성 통독(배속) + 연대기순 플랜 + 예스통독 게시판
  // -------------------------------------------------------------------------
  const bookSel = document.getElementById('bible-book-select');
  const chapSel = document.getElementById('bible-chap-select');
  const bibleChapterCache = new Map();

  let currentBibleBook = '창세기';
  let currentBibleChap = 1;
  let parsedVerses = [
    { num: '1', text: '태초에 하나님이 천지를 창조하시니라' },
    { num: '2', text: '땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라' },
    { num: '3', text: '하나님이 이르시되 빛이 있으라 하시니 빛이 있었고' },
    { num: '4', text: '빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사' },
    { num: '5', text: '하나님이 빛을 낮이라 부르시고 어둠을 밤이라 부르시니라 저녁이 되고 아침이 되니 이는 첫째 날이니라' }
  ];
  let bibleSpreadIdx = 0; // 현재 펼침 페이지 인덱스
  let bibleFontPx = 16;

  // 통독 플랜 설정 상태 (localStorage 저장)
  let biblePlanType = 'chronological';
  let biblePlanChaps = 3;
  let biblePlanDay = 1;
  try {
    biblePlanType = localStorage.getItem('somy_bible_plan_type') || 'chronological';
    biblePlanChaps = Number(localStorage.getItem('somy_bible_plan_chaps') || 3);
    biblePlanDay = Math.max(1, Number(localStorage.getItem('somy_bible_plan_day') || 1));
    bibleFontPx = Math.max(14, Math.min(22, Number(localStorage.getItem('somy_bible_font_px') || 16)));
  } catch {}

  // 현재 연속 통독 큐 (플랜에서 열었을 때 여러 장 연속 진행)
  let activePortionQueue = [];
  let activePortionIdx = 0;

  // 음성 성경통독(TTS) 상태
  let ttsPlaying = false;
  let ttsVerseIdx = 0;
  let ttsRate = 1.0;
  let ttsSessionToken = 0;

  function populateBookAndChapSelects(book, chap) {
    if (bookSel && !bookSel.options.length) {
      bookSel.innerHTML = BIBLE_BOOKS.map((b) => `<option value="${b}">${b}</option>`).join('');
    }
    if (bookSel) bookSel.value = book;
    const maxC = getBookChapterCount(book);
    const u = unitWord(book);
    if (chapSel) {
      let opts = '';
      for (let i = 1; i <= maxC; i++) {
        opts += `<option value="${i}" ${i === chap ? 'selected' : ''}>제 ${i} ${u}</option>`;
      }
      chapSel.innerHTML = opts;
    }
  }
  populateBookAndChapSelects(currentBibleBook, currentBibleChap);

  bookSel.addEventListener('change', () => {
    populateBookAndChapSelects(bookSel.value, 1);
    activePortionQueue = [];
    activePortionIdx = 0;
    loadBibleChapter(bookSel.value, 1, false, 1);
  });

  function switchBibleTab(tabName) {
    document.querySelectorAll('.bible-mtab-pane').forEach((p) => p.classList.add('hidden'));
    const pane = document.getElementById(`bmtab-${tabName}`);
    if (pane) pane.classList.remove('hidden');
    document.querySelectorAll('.bible-mtab-btn').forEach((b) => {
      const active = b.getAttribute('data-bmtab') === tabName;
      b.className = active
        ? 'bible-mtab-btn py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-400 text-slate-950 shadow cursor-pointer text-center'
        : 'bible-mtab-btn py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800/80 text-slate-200 hover:bg-slate-800 cursor-pointer text-center';
    });
    if (tabName === 'plan') updateBiblePlanPreview();
    if (tabName === 'board') renderBibleBoard();
    if (tabName === 'book') renderBibleBookPages();
  }

  document.querySelectorAll('.bible-mtab-btn').forEach((b) => {
    b.addEventListener('click', () => switchBibleTab(b.getAttribute('data-bmtab')));
  });

  function isTwoPageDesktop() {
    return window.innerWidth >= 768;
  }

  // 글자 수·줄 수 기반 스마트 페이지 분할기 ➔ 긴 절이 섞여 있어도 페이지 하단 버튼에 절대 가리지 않고 한 면에 딱 맞게 분할!
  function buildBibleSpreads() {
    const twoPage = isTwoPageDesktop();
    // 한 면(시트)당 가로 글자 수 및 최대 허용 시각적 줄 수 계산
    const charsPerLine = twoPage
      ? Math.max(14, Math.floor(370 / bibleFontPx))
      : Math.max(15, Math.floor(Math.min(window.innerWidth - 56, 520) / bibleFontPx));
    const maxLinesPerSheet = bibleFontPx >= 22 ? 6.2 : bibleFontPx >= 20 ? 7.2 : bibleFontPx >= 18 ? 8.4 : 9.8;

    const sheets = [];
    let curSheet = [];
    // 첫 번째 시트 상단에는 장 제목 배너(약 2.4줄 높이)가 들어가므로 여유 공간 선반영
    let usedLines = 2.4;

    parsedVerses.forEach((v, idx) => {
      const estLines = Math.max(1, Math.ceil((String(v.text || '').length + 3) / charsPerLine)) + 0.42;
      if (curSheet.length > 0 && usedLines + estLines > maxLinesPerSheet) {
        sheets.push(curSheet);
        curSheet = [];
        usedLines = 0;
      }
      curSheet.push({ verse: v, globalIdx: idx });
      usedLines += estLines;
    });
    if (curSheet.length > 0 || sheets.length === 0) {
      sheets.push(curSheet);
    }

    if (!twoPage) {
      return sheets.map((s) => ({ left: s, right: [] }));
    }
    const spreads = [];
    for (let i = 0; i < sheets.length; i += 2) {
      spreads.push({
        left: sheets[i] || [],
        right: sheets[i + 1] || []
      });
    }
    return spreads;
  }

  function getTotalSpreads() {
    return buildBibleSpreads().length;
  }

  function triggerFlipAnimation(dir) {
    const el = document.getElementById('holy-bible-spread');
    if (!el) return;
    el.classList.remove('page-flip-next', 'page-flip-prev');
    void el.offsetWidth;
    el.classList.add(dir >= 0 ? 'page-flip-next' : 'page-flip-prev');
    playPageFlipSound();
  }

  function renderVerseHtml(v, globalIdx) {
    const isReading = ttsPlaying && ttsVerseIdx === globalIdx;
    return `
      <div data-vidx="${globalIdx}" class="bible-verse-item ${isReading ? 'verse-reading-active' : ''}" style="font-size:${bibleFontPx}px; line-height:1.85;">
        <span class="font-extrabold text-[#991b1b] mr-1.5" style="font-size:${Math.max(12, bibleFontPx - 2)}px;">${v.num}</span><span>${v.text}</span>
      </div>
    `;
  }

  function renderBibleBookPages() {
    const leftEl = document.getElementById('bible-left-page');
    const rightEl = document.getElementById('bible-right-page');
    const titleEl = document.getElementById('bible-passage-title');
    const pageInd = document.getElementById('bible-page-indicator');
    const progEl = document.getElementById('bible-portion-progress');
    if (!leftEl || !rightEl) return;

    const u = unitWord(currentBibleBook);
    titleEl.textContent = `${currentBibleBook} 제 ${currentBibleChap} ${u}`;

    if (activePortionQueue.length > 1) {
      progEl.textContent = `📌 오늘 분량 ${activePortionIdx + 1} / ${activePortionQueue.length}장`;
    } else {
      progEl.textContent = '';
    }

    const twoPage = isTwoPageDesktop();
    const spreads = buildBibleSpreads();
    const totalSpreads = spreads.length;
    bibleSpreadIdx = Math.max(0, Math.min(totalSpreads - 1, bibleSpreadIdx));
    const currentSpread = spreads[bibleSpreadIdx] || { left: [], right: [] };

    const chapterBanner = bibleSpreadIdx === 0
      ? `<div class="pb-2 mb-2 border-b-2 border-[#d4b88c] text-center">
           <div class="text-[11px] font-bold tracking-widest text-[#8c5a2b]">개역개정 성경전서</div>
           <div class="text-base sm:text-lg font-extrabold text-[#4a2511] mt-0.5">${currentBibleBook} 제 ${currentBibleChap} ${u}</div>
         </div>`
      : '';

    leftEl.innerHTML = chapterBanner + currentSpread.left.map((item) => renderVerseHtml(item.verse, item.globalIdx)).join('');
    leftEl.scrollTop = 0;

    if (twoPage) {
      rightEl.innerHTML = currentSpread.right.length
        ? currentSpread.right.map((item) => renderVerseHtml(item.verse, item.globalIdx)).join('')
        : `<div class="h-full flex flex-col items-center justify-center text-center text-[#8c7355] py-10 space-y-2">
             <div class="text-lg">✦</div>
             <div class="text-xs font-bold">${currentBibleBook} ${currentBibleChap}${u}의 마지막 면입니다</div>
             <div class="text-[11px]">[다음 책장 넘기기 ▶]를 누르면 다음 장으로 이어집니다</div>
           </div>`;
      rightEl.scrollTop = 0;
      pageInd.textContent = `${bibleSpreadIdx * 2 + 1}–${bibleSpreadIdx * 2 + 2} / ${totalSpreads * 2} 쪽`;
    } else {
      rightEl.innerHTML = '';
      pageInd.textContent = `${bibleSpreadIdx + 1} / ${totalSpreads} 페이지`;
    }

    // 절 클릭 시 해당 절부터 음성 통독 즉시 재생
    document.querySelectorAll('#bible-spread-grid .bible-verse-item').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = Number(row.getAttribute('data-vidx') || 0);
        startBibleTtsFrom(idx);
      });
    });

    // 활성 낭독 절이 화면 안에 보이도록 부드럽게 스크롤
    if (ttsPlaying) {
      const activeNode = document.querySelector('#bible-spread-grid .verse-reading-active');
      if (activeNode) activeNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function parseRawPassageToVerses(raw) {
    const lines = String(raw || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const out = [];
    lines.forEach((line, idx) => {
      const m = line.match(/^(\d+)\.\s*(.+)$/) || line.match(/^(\d+)\s+(.+)$/);
      if (m) out.push({ num: m[1], text: m[2].trim() });
      else out.push({ num: String(idx + 1), text: line });
    });
    return out;
  }

  async function loadBibleChapter(book, chap, autoStartAudio = false, flipDir = 1) {
    stopBibleTts();
    currentBibleBook = book;
    currentBibleChap = Math.max(1, Math.min(getBookChapterCount(book), Number(chap) || 1));
    populateBookAndChapSelects(currentBibleBook, currentBibleChap);

    const cacheKey = `${currentBibleBook}:${currentBibleChap}`;
    const leftEl = document.getElementById('bible-left-page');
    if (leftEl && !bibleChapterCache.has(cacheKey)) {
      leftEl.innerHTML = `<div class="py-12 text-center text-sm font-bold text-[#7c2d12]">📖 ${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)} 말씀을 펼치는 중입니다...</div>`;
    }

    let verses = bibleChapterCache.get(cacheKey);
    if (!verses) {
      try {
        const u = unitWord(currentBibleBook);
        const res = await fetch('/api/bible', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: `${currentBibleBook} ${currentBibleChap}${u}`,
            fullChapter: true
          })
        }).then((r) => r.json());
        if (res && res.passage) {
          verses = parseRawPassageToVerses(res.passage);
          bibleChapterCache.set(cacheKey, verses);
        }
      } catch {}
    }

    if (verses && verses.length) {
      parsedVerses = verses;
    } else {
      parsedVerses = [
        { num: '!', text: `${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)} 본문을 불러오지 못했습니다. 잠시 후 [펼치기]를 다시 눌러주세요.` }
      ];
    }
    bibleSpreadIdx = 0;
    if (flipDir !== 0) triggerFlipAnimation(flipDir);
    renderBibleBookPages();

    // 예스통독 인증 입력칸 기본값 동기화
    syncYesTongdokFormDefaults();

    if (autoStartAudio) {
      startBibleTtsFrom(0);
    }
  }

  async function stepBiblePage(dir) {
    const totalSpreads = getTotalSpreads();
    if (dir > 0) {
      if (bibleSpreadIdx < totalSpreads - 1) {
        bibleSpreadIdx++;
        triggerFlipAnimation(1);
        renderBibleBookPages();
      } else {
        await stepToAdjacentChapter(1, false);
      }
    } else {
      if (bibleSpreadIdx > 0) {
        bibleSpreadIdx--;
        triggerFlipAnimation(-1);
        renderBibleBookPages();
      } else {
        await stepToAdjacentChapter(-1, false);
      }
    }
  }

  async function stepToAdjacentChapter(dir, keepAudioRunning = false) {
    // 플랜 큐가 활성화되어 있는 경우 큐 순서 우선
    if (activePortionQueue.length > 0) {
      const nextQ = activePortionIdx + dir;
      if (nextQ >= 0 && nextQ < activePortionQueue.length) {
        activePortionIdx = nextQ;
        const target = activePortionQueue[activePortionIdx];
        await loadBibleChapter(target.book, target.chap, keepAudioRunning, dir);
        return true;
      } else if (dir > 0 && nextQ >= activePortionQueue.length) {
        stopBibleTts();
        toast('🎉 오늘 설정한 통독 분량을 모두 읽으셨습니다! [예스통독]을 기록해보세요!');
        return false;
      }
    }

    // 일반 성경 66권 이전/다음 장 이동
    let bIdx = BIBLE_BOOKS.indexOf(currentBibleBook);
    let nextC = currentBibleChap + dir;
    if (nextC > BIBLE_CHAPTER_COUNTS[bIdx]) {
      bIdx = (bIdx + 1) % BIBLE_BOOKS.length;
      nextC = 1;
    } else if (nextC < 1) {
      bIdx = (bIdx - 1 + BIBLE_BOOKS.length) % BIBLE_BOOKS.length;
      nextC = BIBLE_CHAPTER_COUNTS[bIdx];
    }
    await loadBibleChapter(BIBLE_BOOKS[bIdx], nextC, keepAudioRunning, dir);
    return true;
  }

  document.getElementById('btn-fetch-bible').addEventListener('click', () => {
    activePortionQueue = [];
    activePortionIdx = 0;
    loadBibleChapter(bookSel.value, Number(chapSel.value || 1), false, 1);
  });
  chapSel.addEventListener('change', () => {
    activePortionQueue = [];
    activePortionIdx = 0;
    loadBibleChapter(bookSel.value, Number(chapSel.value || 1), false, 1);
  });
  document.getElementById('btn-prev-chap').addEventListener('click', () => stepToAdjacentChapter(-1, false));
  document.getElementById('btn-next-chap').addEventListener('click', () => stepToAdjacentChapter(1, false));
  document.getElementById('btn-bible-page-prev').addEventListener('click', () => stepBiblePage(-1));
  document.getElementById('btn-bible-page-next').addEventListener('click', () => stepBiblePage(1));

  // 모바일 성경책 좌우 스와이프 책장 넘김 지원
  const spreadBox = document.getElementById('holy-bible-spread');
  let touchStartX = null;
  let touchStartY = null;
  spreadBox.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });
  spreadBox.addEventListener('touchend', (e) => {
    if (touchStartX === null || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = null;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      stepBiblePage(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  // 글자 크기 조절 (모바일 가독성 최적화)
  document.getElementById('btn-bible-font-down').addEventListener('click', () => {
    bibleFontPx = Math.max(14, bibleFontPx - 2);
    try { localStorage.setItem('somy_bible_font_px', String(bibleFontPx)); } catch {}
    renderBibleBookPages();
  });
  document.getElementById('btn-bible-font-up').addEventListener('click', () => {
    bibleFontPx = Math.min(22, bibleFontPx + 2);
    try { localStorage.setItem('somy_bible_font_px', String(bibleFontPx)); } catch {}
    renderBibleBookPages();
  });

  window.addEventListener('resize', () => {
    if (!document.getElementById('bible-modal').classList.contains('hidden')) {
      renderBibleBookPages();
    }
  });

  // -------------------------------------------------------------------------
  // 🔊 아나운서급 한국어 AI 신경망 HD 음성 성경통독 엔진
  //    (/api/bible-tts 스튜디오 성우 MP3 + 다음 절 선로딩 무끊김 재생 + 음정 유지 배속 조절)
  // -------------------------------------------------------------------------
  const bibleTtsAudio = document.getElementById('bibleTtsAudio');
  const ttsVoiceSelect = document.getElementById('tts-voice-select');
  const ttsBlobCache = new Map(); // `${voice}::${text}` -> Promise<string(blobUrl)>
  let ttsVoice = 'nova';
  try {
    ttsVoice = localStorage.getItem('somy_bible_tts_voice') || 'nova';
  } catch {}
  if (ttsVoiceSelect) {
    ttsVoiceSelect.value = ttsVoice;
    ttsVoiceSelect.addEventListener('change', () => {
      ttsVoice = ttsVoiceSelect.value || 'nova';
      try { localStorage.setItem('somy_bible_tts_voice', ttsVoice); } catch {}
      if (ttsPlaying) {
        startBibleTtsFrom(ttsVerseIdx);
      } else {
        toast('🎙️ 성경 낭독 성우 목소리가 변경되었습니다');
      }
    });
  }

  function applyAudioPlaybackSpeed() {
    if (!bibleTtsAudio) return;
    bibleTtsAudio.playbackRate = ttsRate;
    if ('preservesPitch' in bibleTtsAudio) bibleTtsAudio.preservesPitch = true;
    if ('webkitPreservesPitch' in bibleTtsAudio) bibleTtsAudio.webkitPreservesPitch = true;
  }

  function getSpokenTextForVerse(idx) {
    const v = parsedVerses[idx];
    if (!v) return '';
    return idx === 0
      ? `${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)}. ${v.text}`
      : v.text;
  }

  function fetchVerseAudioUrl(spokenText, voice) {
    const key = `${voice}::${spokenText}`;
    if (ttsBlobCache.has(key)) return ttsBlobCache.get(key);

    const promise = fetch('/api/bible-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: spokenText, voice })
    })
      .then((res) => {
        if (!res.ok) throw new Error('TTS HTTP ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        if (!blob || blob.size < 200) throw new Error('Empty audio');
        return URL.createObjectURL(blob);
      })
      .catch((err) => {
        ttsBlobCache.delete(key);
        throw err;
      });

    ttsBlobCache.set(key, promise);
    return promise;
  }

  function prefetchUpcomingVerses(fromIdx) {
    for (let offset = 1; offset <= 2; offset++) {
      const nextIdx = fromIdx + offset;
      if (nextIdx < parsedVerses.length) {
        const txt = getSpokenTextForVerse(nextIdx);
        if (txt) fetchVerseAudioUrl(txt, ttsVoice).catch(() => {});
      }
    }
  }

  function pickKoreanVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko') && /yuna|sunhi|google|natural|siri/i.test(v.name)) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ko')) ||
      null
    );
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => pickKoreanVoice();
  }

  function updateTtsUi(isLoading = false) {
    const btn = document.getElementById('btn-tts-toggle');
    const lbl = document.getElementById('tts-status-label');
    if (!btn || !lbl) return;
    if (ttsPlaying) {
      btn.textContent = '⏸️ 일시정지';
      const v = parsedVerses[ttsVerseIdx];
      if (isLoading) {
        lbl.textContent = `🎙️ 아나운서 성우 음성 준비 중...`;
      } else {
        lbl.textContent = v
          ? `🔊 ${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)} ${v.num}절 아나운서 낭독 중 (${ttsRate}x)`
          : '🔊 음성 통독 중...';
      }
    } else {
      btn.textContent = '🔊 음성 통독 시작';
      lbl.textContent = '아나운서 HD 성우로 또렷하게 낭독합니다';
    }
  }

  function stopBibleTts() {
    ttsSessionToken++;
    ttsPlaying = false;
    if (bibleTtsAudio) {
      bibleTtsAudio.onended = null;
      bibleTtsAudio.onerror = null;
      try { bibleTtsAudio.pause(); } catch {}
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    updateTtsUi();
    renderBibleBookPages();
  }

  function ensureVerseVisibleOnSpread(vIdx) {
    const spreads = buildBibleSpreads();
    let targetSpread = 0;
    for (let s = 0; s < spreads.length; s++) {
      const inLeft = spreads[s].left.some((it) => it.globalIdx === vIdx);
      const inRight = spreads[s].right.some((it) => it.globalIdx === vIdx);
      if (inLeft || inRight) {
        targetSpread = s;
        break;
      }
    }
    if (targetSpread !== bibleSpreadIdx) {
      const dir = targetSpread > bibleSpreadIdx ? 1 : -1;
      bibleSpreadIdx = targetSpread;
      triggerFlipAnimation(dir);
    }
    renderBibleBookPages();
  }

  function startBibleTtsFrom(index) {
    ttsSessionToken++;
    const myToken = ttsSessionToken;
    if (bibleTtsAudio) {
      bibleTtsAudio.onended = null;
      bibleTtsAudio.onerror = null;
      try { bibleTtsAudio.pause(); } catch {}
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

    ttsVerseIdx = Math.max(0, Math.min(parsedVerses.length - 1, index));
    ttsPlaying = true;
    ensureVerseVisibleOnSpread(ttsVerseIdx);
    updateTtsUi(true);

    const advanceToNextVerse = () => {
      if (myToken !== ttsSessionToken || !ttsPlaying) return;
      ttsVerseIdx++;
      if (ttsVerseIdx < parsedVerses.length) {
        speakCurrent();
      } else {
        stepToAdjacentChapter(1, true);
      }
    };

    const fallbackBrowserSpeak = (spokenText) => {
      if (!window.speechSynthesis) {
        ttsPlaying = false;
        updateTtsUi();
        return;
      }
      updateTtsUi(false);
      const utter = new SpeechSynthesisUtterance(spokenText);
      utter.lang = 'ko-KR';
      utter.rate = ttsRate;
      utter.pitch = 1.0;
      const koVoice = pickKoreanVoice();
      if (koVoice) utter.voice = koVoice;
      utter.onend = advanceToNextVerse;
      utter.onerror = () => {
        if (myToken !== ttsSessionToken) return;
        ttsPlaying = false;
        updateTtsUi();
      };
      window.speechSynthesis.speak(utter);
    };

    const speakCurrent = async () => {
      if (myToken !== ttsSessionToken || !ttsPlaying) return;
      const v = parsedVerses[ttsVerseIdx];
      if (!v) {
        stepToAdjacentChapter(1, true);
        return;
      }

      ensureVerseVisibleOnSpread(ttsVerseIdx);
      const spokenText = getSpokenTextForVerse(ttsVerseIdx);
      // 다음 2개 절을 백그라운드로 미리 합성해 구절 간 끊김 0초 달성!
      prefetchUpcomingVerses(ttsVerseIdx);

      try {
        updateTtsUi(true);
        const audioUrl = await fetchVerseAudioUrl(spokenText, ttsVoice);
        if (myToken !== ttsSessionToken || !ttsPlaying) return;

        bibleTtsAudio.src = audioUrl;
        applyAudioPlaybackSpeed();
        updateTtsUi(false);

        bibleTtsAudio.onended = advanceToNextVerse;
        bibleTtsAudio.onerror = () => fallbackBrowserSpeak(spokenText);
        await bibleTtsAudio.play();
        applyAudioPlaybackSpeed();
      } catch {
        if (myToken !== ttsSessionToken || !ttsPlaying) return;
        fallbackBrowserSpeak(spokenText);
      }
    };

    speakCurrent();
  }

  document.getElementById('btn-tts-toggle').addEventListener('click', () => {
    if (ttsPlaying) {
      stopBibleTts();
    } else {
      startBibleTtsFrom(ttsVerseIdx >= parsedVerses.length ? 0 : ttsVerseIdx);
    }
  });
  document.getElementById('btn-tts-stop').addEventListener('click', () => {
    ttsVerseIdx = 0;
    stopBibleTts();
  });
  document.getElementById('btn-tts-prev').addEventListener('click', () => {
    startBibleTtsFrom(Math.max(0, ttsVerseIdx - 1));
  });
  document.getElementById('btn-tts-next').addEventListener('click', () => {
    if (ttsVerseIdx + 1 < parsedVerses.length) startBibleTtsFrom(ttsVerseIdx + 1);
    else stepToAdjacentChapter(1, ttsPlaying);
  });

  document.querySelectorAll('.tts-rate-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ttsRate = Number(btn.getAttribute('data-rate') || 1.0);
      document.querySelectorAll('.tts-rate-btn').forEach((b) => {
        b.className = 'tts-rate-btn px-2 py-0.5 rounded-md bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer';
      });
      btn.className = 'tts-rate-btn px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[11px] font-extrabold cursor-pointer';
      if (ttsPlaying && bibleTtsAudio && !bibleTtsAudio.paused) {
        // 재생 중인 HD 오디오는 끊김 없이 즉시 속도만 부드럽게 변경!
        applyAudioPlaybackSpeed();
        updateTtsUi(false);
      } else if (ttsPlaying) {
        startBibleTtsFrom(ttsVerseIdx);
      } else {
        toast(`🔊 통독 음성 속도가 ${ttsRate}배속으로 설정되었습니다`);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 📅 통독 분량 & 읽기 방식(연대기순 등) 설정
  // -------------------------------------------------------------------------
  function getPlanPortionForDay(planKey, chapsPerDay, dayNum) {
    const seq = buildReadingSequence(planKey);
    const totalDays = Math.max(1, Math.ceil(seq.length / chapsPerDay));
    const safeDay = ((dayNum - 1) % totalDays + totalDays) % totalDays + 1;
    const start = (safeDay - 1) * chapsPerDay;
    const items = seq.slice(start, start + chapsPerDay);
    return { items, safeDay, totalDays };
  }

  function updateBiblePlanPreview() {
    const { items, safeDay, totalDays } = getPlanPortionForDay(biblePlanType, biblePlanChaps, biblePlanDay);
    biblePlanDay = safeDay;
    try {
      localStorage.setItem('somy_bible_plan_type', biblePlanType);
      localStorage.setItem('somy_bible_plan_chaps', String(biblePlanChaps));
      localStorage.setItem('somy_bible_plan_day', String(biblePlanDay));
    } catch {}

    const planTitle = PLAN_NAMES[biblePlanType] || '⏳ 연대기순 통독';
    const rangeLabel = formatChapterQueueLabel(items);

    const chip = document.getElementById('bible-active-plan-chip');
    if (chip) chip.textContent = `${planTitle} · Day ${safeDay}`;
    document.getElementById('plan-preview-badge').textContent = `${planTitle} · 전체 ${totalDays}일 과정 중 Day ${safeDay}`;
    document.getElementById('plan-preview-range').textContent = `${rangeLabel} (총 ${items.length}장)`;
    document.getElementById('plan-day-indicator').textContent = `Day ${safeDay} / ${totalDays}`;

    document.querySelectorAll('.plan-type-btn').forEach((b) => {
      const act = b.getAttribute('data-plan') === biblePlanType;
      b.className = act
        ? 'plan-type-btn text-left p-3.5 rounded-xl border-2 border-amber-500 bg-amber-50 shadow-sm cursor-pointer'
        : 'plan-type-btn text-left p-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 cursor-pointer';
    });
    document.querySelectorAll('.plan-chaps-btn').forEach((b) => {
      const act = Number(b.getAttribute('data-chaps')) === biblePlanChaps;
      b.className = act
        ? 'plan-chaps-btn px-4 py-2 rounded-xl bg-amber-400 border-2 border-amber-600 text-slate-950 text-xs font-extrabold cursor-pointer shadow-sm'
        : 'plan-chaps-btn px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 hover:bg-slate-200 text-xs font-bold cursor-pointer';
    });
  }

  document.querySelectorAll('.plan-type-btn').forEach((b) => {
    b.addEventListener('click', () => {
      biblePlanType = b.getAttribute('data-plan') || 'chronological';
      biblePlanDay = 1;
      updateBiblePlanPreview();
    });
  });

  document.querySelectorAll('.plan-chaps-btn').forEach((b) => {
    b.addEventListener('click', () => {
      biblePlanChaps = Number(b.getAttribute('data-chaps') || 3);
      updateBiblePlanPreview();
    });
  });

  document.getElementById('btn-plan-day-prev').addEventListener('click', () => {
    biblePlanDay = Math.max(1, biblePlanDay - 1);
    updateBiblePlanPreview();
  });
  document.getElementById('btn-plan-day-next').addEventListener('click', () => {
    biblePlanDay++;
    updateBiblePlanPreview();
  });

  async function launchPlanPortion(autoAudio) {
    const { items } = getPlanPortionForDay(biblePlanType, biblePlanChaps, biblePlanDay);
    if (!items.length) return;
    activePortionQueue = items;
    activePortionIdx = 0;
    switchBibleTab('book');
    await loadBibleChapter(items[0].book, items[0].chap, autoAudio, 1);
    toast(`📖 [${formatChapterQueueLabel(items)}] 통독을 시작합니다!`);
  }

  document.getElementById('btn-start-plan-reading').addEventListener('click', () => launchPlanPortion(false));
  document.getElementById('btn-start-plan-audio').addEventListener('click', () => launchPlanPortion(true));

  // -------------------------------------------------------------------------
  // 🙌 분류형 고가시성 '예스통독' 인증 게시판 & 참여 성도 한눈에 보기
  // -------------------------------------------------------------------------
  let currentBibleBoardCat = 'all';
  let currentBibleReaderFilter = '';

  function syncYesTongdokFormDefaults() {
    const planInp = document.getElementById('yes-plan-input');
    const rangeInp = document.getElementById('yes-range-input');
    const cntInp = document.getElementById('yes-count-input');
    if (!planInp || !rangeInp || !cntInp) return;

    const mapByPlan = {
      chronological: '연대기순 통독',
      canonical: '성경 순서 정독',
      balanced: '구약+신약 균형',
      nt_psalms: '신약·시편 집중'
    };
    planInp.value = mapByPlan[biblePlanType] || '연대기순 통독';
    if (activePortionQueue.length > 0) {
      rangeInp.value = formatChapterQueueLabel(activePortionQueue);
      cntInp.value = String(activePortionQueue.length);
    } else {
      rangeInp.value = `${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)}`;
      cntInp.value = '1';
    }
  }

  function getPlanBadgeTheme(planName) {
    const s = String(planName || '');
    if (s.includes('연대기')) return { border: 'border-l-amber-500', pill: 'bg-amber-100 text-amber-900 border-amber-300', icon: '⏳' };
    if (s.includes('순서')) return { border: 'border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: '📖' };
    if (s.includes('균형')) return { border: 'border-l-sky-500', pill: 'bg-sky-100 text-sky-900 border-sky-300', icon: '⚖️' };
    if (s.includes('신약')) return { border: 'border-l-rose-500', pill: 'bg-rose-100 text-rose-900 border-rose-300', icon: '🌱' };
    return { border: 'border-l-indigo-500', pill: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: '✨' };
  }

  function renderBibleBoard() {
    const logs = Array.isArray(worldState.bibleLogs) ? worldState.bibleLogs : [];
    const partGrid = document.getElementById('bible-participants-grid');
    const listEl = document.getElementById('bible-logs-list');
    const headingEl = document.getElementById('bible-board-list-heading');
    const countBadge = document.getElementById('bible-board-count-badge');
    if (!partGrid || !listEl) return;

    const todayStr = getTodayKstStr();
    const byReader = new Map();
    let totalChaps = 0;

    logs.forEach((l) => {
      const ch = Number(l.chaptersCount) || 1;
      totalChaps += ch;
      const prev = byReader.get(l.reader) || {
        reader: l.reader,
        totalChaps: 0,
        count: 0,
        lastRange: l.rangeLabel,
        lastPlan: l.planName,
        doneToday: false
      };
      prev.totalChaps += ch;
      prev.count += 1;
      if (l.dateKey === todayStr || String(l.createdAt || '').includes('오늘')) prev.doneToday = true;
      byReader.set(l.reader, prev);
    });

    const participants = Array.from(byReader.values()).sort((a, b) => b.totalChaps - a.totalChaps);
    const todayDoneCount = participants.filter((p) => p.doneToday).length;

    const kpiReaders = document.getElementById('kpi-readers-count');
    const kpiChaps = document.getElementById('kpi-total-chaps');
    const kpiToday = document.getElementById('kpi-today-done');
    if (kpiReaders) kpiReaders.textContent = `${participants.length}명`;
    if (kpiChaps) kpiChaps.textContent = `${totalChaps}장`;
    if (kpiToday) kpiToday.textContent = `${todayDoneCount}명`;

    // 좌측: 참여 성도별 누적 현황표 (클릭 시 해당 성도의 인증 기록만 필터링!)
    partGrid.innerHTML = participants.map((p, idx) => {
      const isSelected = currentBibleReaderFilter === p.reader;
      const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📖';
      return `
        <button type="button" data-reader="${p.reader}" class="reader-filter-row w-full text-left px-3 py-2 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
          isSelected
            ? 'bg-amber-100 border-amber-500 shadow-sm'
            : p.doneToday
              ? 'bg-white hover:bg-amber-50/70 border-amber-200'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
        }">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">${rankIcon}</span>
              <span class="text-xs sm:text-sm font-black text-slate-900 truncate">${p.reader}</span>
              ${p.doneToday ? '<span class="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-extrabold">오늘 완료</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-600 truncate mt-0.5">최근: <b>${p.lastRange}</b></div>
          </div>
          <div class="shrink-0 text-right">
            <div class="text-xs sm:text-sm font-black text-amber-800">${p.totalChaps}장</div>
            <div class="text-[10px] font-bold text-slate-500">${p.count}회 인증</div>
          </div>
        </button>
      `;
    }).join('');

    partGrid.querySelectorAll('.reader-filter-row').forEach((row) => {
      row.addEventListener('click', () => {
        const rName = row.getAttribute('data-reader') || '';
        currentBibleReaderFilter = currentBibleReaderFilter === rName ? '' : rName;
        renderBibleBoard();
      });
    });

    // 카테고리 탭 스타일 업데이트
    document.querySelectorAll('.bible-cat-btn').forEach((b) => {
      const cat = b.getAttribute('data-bcat');
      const active = !currentBibleReaderFilter && cat === currentBibleBoardCat;
      if (active) {
        b.className = 'bible-cat-btn px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs font-extrabold cursor-pointer shadow';
      } else {
        b.className = 'bible-cat-btn px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer';
      }
    });

    // 분류 필터 적용
    const filtered = logs.filter((l) => {
      if (currentBibleReaderFilter) return l.reader === currentBibleReaderFilter;
      if (currentBibleBoardCat === 'all') return true;
      if (currentBibleBoardCat === 'today') return l.dateKey === todayStr || String(l.createdAt || '').includes('오늘');
      if (currentBibleBoardCat === 'mine') return l.reader === myName;
      return String(l.planName || '').includes(currentBibleBoardCat);
    });

    if (headingEl) {
      headingEl.textContent = currentBibleReaderFilter
        ? `👤 '${currentBibleReaderFilter}' 성도님의 예스통독 기록 (다시 누르면 전체 해제)`
        : `🗂️ 분류별 '예스통독' 인증 게시판`;
    }
    if (countBadge) countBadge.textContent = `${filtered.length}건`;

    if (!filtered.length) {
      listEl.innerHTML = `<div class="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs font-bold text-slate-500">선택하신 분류에 아직 등록된 예스통독 인증이 없습니다. 첫 인증의 주인공이 되어보세요! 🙌</div>`;
      return;
    }

    listEl.innerHTML = filtered.map((l) => {
      const th = getPlanBadgeTheme(l.planName);
      return `
        <div class="p-3 rounded-xl bg-white border border-slate-200 border-l-4 ${th.border} shadow-sm flex items-start justify-between gap-2.5">
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[11px] font-black">예스통독 🙌</span>
              <span class="text-xs sm:text-sm font-black text-slate-900">${l.reader}</span>
              <span class="px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${th.pill}">${th.icon} ${l.planName}</span>
              <span class="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[11px] font-extrabold">📖 ${l.rangeLabel} · ${l.chaptersCount || 1}장</span>
              <span class="text-[11px] font-semibold text-slate-400 ml-auto">${l.createdAt || ''}</span>
            </div>
            <div class="text-xs sm:text-[13px] font-semibold text-slate-800 leading-relaxed break-keep">${String(l.comment || '').replace(/</g, '&lt;')}</div>
          </div>
          <button data-blid="${l.id}" class="bible-log-amen-btn shrink-0 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-black cursor-pointer">
            🙏 ${l.amens || 1}
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.bible-log-amen-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-blid');
        const res = await postChapelApi('amen_bible_log', { id });
        if (res && res.state) {
          worldState = res.state;
          renderBibleBoard();
          broadcastEvent('bible_log_sync', { bibleLogs: worldState.bibleLogs });
        }
      });
    });
  }

  document.querySelectorAll('.bible-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentBibleReaderFilter = '';
      currentBibleBoardCat = btn.getAttribute('data-bcat') || 'all';
      renderBibleBoard();
    });
  });

  document.querySelectorAll('.yes-preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('yes-comment-input').value = chip.getAttribute('data-yesmsg') || '예스통독!';
    });
  });

  document.getElementById('btn-send-bible-board').addEventListener('click', async () => {
    const refLabel = `${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)}`;
    const shortLines = parsedVerses.slice(0, 4).map((v) => `${v.num}. ${v.text}`).join('\n');
    boardState.mode = 'slide';
    boardState.badge = `📖 성경통독 · ${refLabel}`;
    boardState.body = shortLines;
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'slide', badge: boardState.badge, body: boardState.body });
    await saveRoomBoardToServer();
    closeModal('bible-modal');
    toast(`📖 '${refLabel}' 본문이 통독방 칠판에 게시되었습니다!`);
  });

  document.getElementById('btn-complete-bible').addEventListener('click', () => {
    stopBibleTts();
    syncYesTongdokFormDefaults();
    switchBibleTab('board');
  });

  document.getElementById('btn-yes-tongdok-quick').addEventListener('click', () => {
    syncYesTongdokFormDefaults();
    switchBibleTab('board');
    openModal('bible-modal');
  });

  document.getElementById('btn-submit-yestongdok').addEventListener('click', async () => {
    const planName = document.getElementById('yes-plan-input').value.trim() || '성경통독';
    const rangeLabel = document.getElementById('yes-range-input').value.trim() || `${currentBibleBook} ${currentBibleChap}${unitWord(currentBibleBook)}`;
    const chaptersCount = Math.max(1, Number(document.getElementById('yes-count-input').value) || 1);
    let comment = document.getElementById('yes-comment-input').value.trim() || '예스통독!';
    if (!comment.includes('예스통독')) comment = `예스통독! ${comment}`;

    const res = await postChapelApi('add_bible_log', {
      reader: myName,
      planName,
      rangeLabel,
      chaptersCount,
      comment
    });

    if (res && res.state) {
      worldState = res.state;
      if (activePortionQueue.length > 0) {
        biblePlanDay++;
        try { localStorage.setItem('somy_bible_plan_day', String(biblePlanDay)); } catch {}
      }
      renderBibleBoard();
      broadcastEvent('bible_log_sync', {
        bibleLogs: worldState.bibleLogs,
        reader: myName,
        rangeLabel
      });
      sendChatMessage(`🙌 [예스통독 · ${rangeLabel}] ${comment}`);
      toast(`🙌 '${rangeLabel}' 예스통독 인증이 게시판에 기록되었습니다!`);
    }
  });

  // -------------------------------------------------------------------------
  // ✏️ 큐티방 — 오늘의 소미 큐티 본문(완전 표시) + 기초반 강의안 + 실시간 나눔
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

    const res = await postChapelApi('save_qt_lecture', { week, title, content });

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

  function populateRecentSomyQtDates() {
    const sel = document.getElementById('qt-recent-select');
    if (!sel) return;
    sel.innerHTML = `<option value="">최근 등록된 소미 큐티 선택 (${recentSomyQtDates.length}건)</option>` +
      recentSomyQtDates.map((d) => `<option value="${d.date}">${d.date} · ${d.reference || ''}</option>`).join('');
  }

  function renderSomyQtBox(qt) {
    const box = document.getElementById('today-qt-box');
    const picker = document.getElementById('qt-date-picker');
    if (!box) return;

    if (!qt || !qt.reference) {
      box.innerHTML = `<div class="text-xs text-slate-600">선택하신 날짜의 큐티 본문을 불러오지 못했습니다. 위 날짜 선택기에서 다른 날짜를 조회해보세요.</div>`;
      return;
    }

    currentSomyQt = qt;
    if (picker && qt.date) picker.value = qt.date;

    const [biblePart, interpPart] = String(qt.passage || '').split('|||');
    const formattedVerses = String(biblePart || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(\d+)\.\s*(.+)$/);
        return m
          ? `<div class="py-0.5 leading-relaxed"><span class="font-extrabold text-[#991b1b] mr-1.5">${m[1]}</span><span>${m[2]}</span></div>`
          : `<div class="py-0.5 leading-relaxed">${line}</div>`;
      })
      .join('');

    const questions = [qt.question1, qt.question2, qt.question3].filter(Boolean);

    box.innerHTML = `
      <div class="pb-2.5 border-b border-amber-300 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="inline-block px-2 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-extrabold">🌅 소미 큐티 · ${qt.date || '오늘'}</span>
          <div class="text-base sm:text-lg font-extrabold text-[#4a2511] mt-1">📖 ${qt.reference}</div>
        </div>
      </div>

      <div class="text-xs sm:text-sm text-slate-900 space-y-1 font-serif">${formattedVerses}</div>

      ${interpPart ? `
        <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
          <div class="text-xs font-extrabold text-amber-900">💡 말씀 해설 & 묵상 길잡이</div>
          <div class="text-xs text-slate-700 whitespace-pre-line leading-relaxed">${interpPart.trim()}</div>
        </div>
      ` : ''}

      ${questions.length ? `
        <div class="p-3.5 rounded-xl bg-white border border-amber-200 space-y-1.5">
          <div class="text-xs font-extrabold text-emerald-800">❓ 묵상과 적용 질문</div>
          ${questions.map((q, idx) => `<div class="text-xs text-slate-800 leading-relaxed"><b>${idx + 1}.</b> ${q}</div>`).join('')}
        </div>
      ` : ''}

      ${qt.prayer ? `
        <div class="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 italic leading-relaxed">
          🙏 <b>오늘의 기도:</b> ${qt.prayer}
        </div>
      ` : ''}
    `;
  }

  async function loadTodaySomyQt(targetDate) {
    const box = document.getElementById('today-qt-box');
    if (!targetDate && currentSomyQt) {
      renderSomyQtBox(currentSomyQt);
      return;
    }
    if (box) {
      box.innerHTML = `<div class="py-6 text-center text-xs font-bold text-amber-900">🌅 소미 큐티 본문을 불러오는 중입니다...</div>`;
    }
    try {
      const q = targetDate ? `&qt_date=${encodeURIComponent(targetDate)}` : '';
      const res = await fetch(`/api/chapel-world?qt_only=true${q}`).then((r) => r.json());
      if (res && Array.isArray(res.recentDates) && res.recentDates.length) {
        recentSomyQtDates = res.recentDates;
        populateRecentSomyQtDates();
      }
      if (res && res.qt) {
        renderSomyQtBox(res.qt);
        return;
      }
      // 보조 폴백: /api/qt 직접 조회 (res.qt 내부 참조)
      const fallbackRes = await fetch(`/api/qt${targetDate ? `?date=${encodeURIComponent(targetDate)}` : ''}`).then((r) => r.json());
      if (fallbackRes && fallbackRes.qt) {
        renderSomyQtBox(fallbackRes.qt);
        return;
      }
      renderSomyQtBox(null);
    } catch {
      renderSomyQtBox(currentSomyQt);
    }
  }

  document.getElementById('btn-reload-qt').addEventListener('click', () => {
    const d = document.getElementById('qt-date-picker').value;
    loadTodaySomyQt(d || undefined);
  });

  document.getElementById('qt-recent-select').addEventListener('change', (e) => {
    const d = e.target.value;
    if (d) loadTodaySomyQt(d);
  });

  document.getElementById('btn-project-today-qt').addEventListener('click', async () => {
    if (!currentSomyQt) return;
    const [biblePart] = String(currentSomyQt.passage || '').split('|||');
    const shortLines = String(biblePart || '').split('\n').filter(Boolean).slice(0, 4).join('\n');
    boardState.mode = 'slide';
    boardState.badge = `🌅 오늘의 소미 큐티 · ${currentSomyQt.reference}`;
    boardState.body = shortLines;
    renderBoardSurface();
    broadcastEvent('board_sync', { mode: 'slide', badge: boardState.badge, body: boardState.body });
    await saveRoomBoardToServer();
    closeModal('qt-modal');
    toast(`🖥️ '${currentSomyQt.reference}' 큐티 본문이 칠판에 게시되었습니다!`);
  });

  document.getElementById('btn-write-share-from-qt').addEventListener('click', () => {
    if (currentSomyQt && currentSomyQt.reference) {
      document.getElementById('qt-share-passage').value = currentSomyQt.reference;
    }
    switchQtTab('share');
    document.getElementById('qt-share-input').focus();
  });

  function renderQtShares() {
    const box = document.getElementById('qt-shares-list');
    if (!box) return;
    box.innerHTML = (worldState.qtShares || []).map((s) => `
      <div class="p-3 rounded-xl bg-slate-900 border ${s.fromSomyApp ? 'border-amber-400/40' : 'border-slate-700'} space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 truncate">
            <span class="text-xs font-extrabold text-amber-300">✍️ ${s.author}</span>
            <span class="text-xs text-slate-400 font-normal"> · ${s.passage}</span>
            ${s.fromSomyApp ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">소미앱 연동</span>' : ''}
          </div>
          <button data-qsid="${s.id}" class="qt-amen-btn shrink-0 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-extrabold cursor-pointer">🙏 아멘 ${s.amens || 1}</button>
        </div>
        <div class="text-xs text-slate-200 leading-relaxed whitespace-pre-line break-keep">${s.content}</div>
      </div>
    `).join('');

    box.querySelectorAll('.qt-amen-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-qsid');
        const res = await postChapelApi('amen_qt_share', { id, userId: somyUserId, clientId: myClientId });
        if (res && res.state) {
          worldState = res.state;
          renderQtShares();
          broadcastEvent('qt_share_sync', { qtShares: worldState.qtShares });
        }
      });
    });
  }

  document.getElementById('btn-submit-qt-share').addEventListener('click', async () => {
    const passage = document.getElementById('qt-share-passage').value.trim() || (currentSomyQt && currentSomyQt.reference) || '오늘의 큐티';
    const contentEl = document.getElementById('qt-share-input');
    const content = contentEl.value.trim();
    if (!content) return;

    const res = await postChapelApi('add_qt_share', {
      author: myName,
      passage,
      content,
      userId: somyUserId,
      avatarUrl: somyAvatarUrl
    });

    if (res && res.state) {
      worldState = res.state;
      contentEl.value = '';
      renderQtShares();
      broadcastEvent('qt_share_sync', { qtShares: worldState.qtShares });
      sendChatMessage(`✏️ [큐티 나눔 · ${passage}] ${content.slice(0, 36)}${content.length > 36 ? '...' : ''}`);

      if (res.syncedToSomy && window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'SOMY_CHAPEL_QT_SHARED', post: res.somyPost || null }, '*');
        } catch {}
      }

      toast(
        res.syncedToSomy
          ? '✨ 큐티 나눔이 소미 앱 은혜나눔 게시판 & 오늘의 묵상완료에 반영되었습니다!'
          : '🙏 큐티 묵상 나눔이 등록되었습니다!'
      );
    }
  });

  function switchQtTab(t) {
    document.querySelectorAll('.qt-tab-pane').forEach((p) => p.classList.add('hidden'));
    const pane = document.getElementById(`qtab-${t}`);
    if (pane) pane.classList.remove('hidden');
    document.querySelectorAll('.qt-tab-btn').forEach((b) => {
      const act = b.getAttribute('data-qtab') === t;
      b.className = act
        ? 'qt-tab-btn py-2 px-2 rounded-xl text-xs sm:text-sm font-extrabold bg-amber-400 text-slate-950 cursor-pointer text-center shadow'
        : 'qt-tab-btn py-2 px-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer text-center';
    });
    if (t === 'today') loadTodaySomyQt();
    if (t === 'lectures') renderQtLectures();
    if (t === 'share') renderQtShares();
  }

  document.querySelectorAll('.qt-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchQtTab(btn.getAttribute('data-qtab')));
  });

  // -------------------------------------------------------------------------
  // 🕯️ 기도 등불 봉헌 & 실시간 채팅
  // -------------------------------------------------------------------------
  function renderCandlesList() {
    const box = document.getElementById('candles-list-box');
    if (!box) return;
    const candles = worldState.candles || [];
    if (!candles.length) {
      box.innerHTML = `<div class="p-6 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center text-xs text-slate-400">아직 등록된 기도 등불이 없습니다.<br/>위 입력창에 기도 제목을 적고 첫 등불을 밝혀보세요! 🕯️</div>`;
      return;
    }
    box.innerHTML = candles.map((c) => `
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
        const res = await postChapelApi('amen_candle', { id });
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
    const res = await postChapelApi('add_candle', { name: myName, text });
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
  // 🎵 기도음악 & 🎙️ 마이크 & 📹 카메라
  // -------------------------------------------------------------------------
  function stopAllBgm(notifyBroadcast = true) {
    bgmType = 'none';
    if (synthTimer) { clearInterval(synthTimer); synthTimer = null; }
    customBgmAudio.pause();
    customBgmAudio.src = '';
    bgmYtIframe.src = '';
    document.getElementById('bgm-mini-bar').classList.add('hidden');
    const listenerStatus = document.getElementById('bgm-listener-status');
    if (listenerStatus) listenerStatus.textContent = '현재 배경 음악이 멈춰 있습니다.';
    if (notifyBroadcast && isUserLeaderOrAdmin()) {
      broadcastEvent('bgm_sync', { action: 'stop' });
    }
  }

  function playGraceSynthChords() {
    stopAllBgm(false);
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
    const listenerStatus = document.getElementById('bgm-listener-status');
    if (listenerStatus) listenerStatus.textContent = '▶️ 기본 은혜 패드 기도반주가 실시간 재생 중입니다.';
  }

  document.getElementById('btn-start-yt-bgm').addEventListener('click', () => {
    if (!isUserLeaderOrAdmin()) {
      toast('🔒 배경 기도음악 설정 및 송출은 관리자/인도자만 가능합니다');
      return;
    }
    const raw = document.getElementById('bgm-yt-input').value.trim();
    const m = raw.match(/(?:v=|youtu\.be\/|embed\/|live\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    const vid = m ? m[1] : raw;
    if (!vid) return;
    stopAllBgm(false);
    bgmType = 'youtube';
    bgmYtIframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1&loop=1&playlist=${vid}&playsinline=1&rel=0`;
    document.getElementById('bgm-mini-label').textContent = '🎵 유튜브 기도음악 재생 중';
    document.getElementById('bgm-yt-wrap').classList.remove('hidden');
    document.getElementById('bgm-mini-bar').classList.remove('hidden');
    // 모든 접속 성도에게 실시간 동기화 송출
    broadcastEvent('bgm_sync', {
      action: 'play_youtube',
      youtubeId: vid,
      senderName: myName
    });
    closeModal('bgm-modal');
    toast('🎵 모든 접속 성도들에게 유튜브 기도음악이 동시 재생됩니다!');
  });

  document.getElementById('bgm-file-input').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    stopAllBgm(false);
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
    playGraceSynthChords();
    if (isUserLeaderOrAdmin()) {
      broadcastEvent('bgm_sync', { action: 'play_synth', senderName: myName });
    }
    closeModal('bgm-modal');
  });

  document.getElementById('btn-stop-bgm').addEventListener('click', () => stopAllBgm(true));
  document.getElementById('btn-stop-bgm-mini').addEventListener('click', () => stopAllBgm(true));

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
  // 모바일 가상 조이스틱 & 모달/상단 UI 바인딩
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

  // 4대 통합 게시판 & 캠퍼스 전체 메뉴 한눈에 보기 허브 렌더링
  function renderCampusHubModal() {
    const logs = Array.isArray(worldState.bibleLogs) ? worldState.bibleLogs : [];
    const totalChaps = logs.reduce((acc, l) => acc + (Number(l.chaptersCount) || 1), 0);
    const readersSet = new Set(logs.map((l) => l.reader));

    document.getElementById('hub-bible-stat').textContent = `${readersSet.size}명 · 누적 ${totalChaps}장`;
    document.getElementById('hub-bible-preview').innerHTML = logs.slice(0, 3).map((l) => `
      <div class="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2">
        <div class="truncate"><span class="font-extrabold text-emerald-950">${l.reader}</span> · <span class="font-bold text-slate-700">${l.rangeLabel}</span></div>
        <span class="shrink-0 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">예스통독</span>
      </div>
    `).join('');

    const qtRef = (currentSomyQt && currentSomyQt.reference) || '오늘의 큐티 말씀';
    const qtShares = Array.isArray(worldState.qtShares) ? worldState.qtShares : [];
    document.getElementById('hub-qt-stat').textContent = `나눔 ${qtShares.length}건`;
    document.getElementById('hub-qt-preview').innerHTML = `
      <div class="p-2 rounded-lg bg-amber-100 border border-amber-300 font-extrabold text-amber-950">📖 오늘 본문: ${qtRef}</div>
      ${qtShares.slice(0, 2).map((s) => `
        <div class="p-2 rounded-lg bg-white border border-slate-200 truncate"><span class="font-extrabold text-slate-900">${s.author}:</span> <span class="text-slate-600">${s.content}</span></div>
      `).join('')}
    `;

    const candles = Array.isArray(worldState.candles) ? worldState.candles : [];
    document.getElementById('hub-candle-stat').textContent = `등불 ${candles.length}개 점등`;
    document.getElementById('hub-candle-preview').innerHTML = candles.slice(0, 3).map((c) => `
      <div class="p-2 rounded-lg bg-rose-50/70 border border-rose-200 truncate">
        <span class="font-extrabold text-rose-950">🕯️ ${c.name}:</span> <span class="text-slate-700">${c.text}</span>
      </div>
    `).join('');

    const rooms = Array.isArray(worldState.sarangbangs) ? worldState.sarangbangs : [];
    document.getElementById('hub-sarang-stat').textContent = `${rooms.length}개 사랑방 운영 중`;
    document.getElementById('hub-sarang-preview').innerHTML = rooms.slice(0, 3).map((r) => `
      <div class="p-2 rounded-lg bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-2">
        <div class="truncate"><span class="font-extrabold text-sky-950">🏠 ${r.name}</span> <span class="text-slate-600">· ${r.leader}</span></div>
      </div>
    `).join('');
  }

  function openModal(id) {
    if (id === 'hub-modal') renderCampusHubModal();
    if (id === 'sarang-modal') renderSarangList();
    if (id === 'bible-modal') {
      updateBiblePlanPreview();
      syncYesTongdokFormDefaults();
      if (!bibleChapterCache.has(`${currentBibleBook}:${currentBibleChap}`)) {
        loadBibleChapter(currentBibleBook, currentBibleChap, false, 0);
      } else {
        renderBibleBookPages();
      }
      renderBibleBoard();
    }
    if (id === 'qt-modal') {
      loadTodaySomyQt();
      renderQtLectures();
      renderQtShares();
    }
    if (id === 'candle-modal') renderCandlesList();
    if (id === 'board-modal') {
      const isLeader = isUserLeaderOrAdmin();
      const leaderBadge = document.getElementById('board-leader-badge');
      if (leaderBadge) leaderBadge.classList.toggle('hidden', !isLeader);
      const permNotice = document.getElementById('board-permission-notice');
      if (permNotice) permNotice.classList.toggle('hidden', isLeader);

      // 일반 성도의 경우 등록/공유 버튼을 비활성화하고 시각적으로 보호
      const applyBtns = ['btn-wb-apply', 'btn-apply-embed', 'btn-apply-slide-text', 'btn-apply-yt-board', 'btn-start-screenshare'];
      applyBtns.forEach((bId) => {
        const b = document.getElementById(bId);
        if (b) {
          b.disabled = !isLeader;
          b.classList.toggle('opacity-50', !isLeader);
          b.classList.toggle('cursor-not-allowed', !isLeader);
        }
      });

      document.getElementById('slide-badge-input').value = boardState.badge || '';
      document.getElementById('slide-body-input').value = boardState.body || '';
      updatePptPageUi();
      renderBoardSurface();
    }
    if (id === 'bgm-modal') {
      const isLeader = isUserLeaderOrAdmin();
      const adminCtrls = document.getElementById('bgm-admin-controls');
      if (adminCtrls) adminCtrls.classList.toggle('hidden', !isLeader);
      const listenerNotice = document.getElementById('bgm-listener-notice');
      if (listenerNotice) listenerNotice.classList.toggle('hidden', isLeader);
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
    if (id === 'bible-modal') stopBibleTts();
    document.getElementById(id).classList.add('hidden');
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
  });

  // -------------------------------------------------------------------------
  // ✨ 내 3D 아바타 스타일 스튜디오 & 실시간 360° 프리뷰 렌더러
  // -------------------------------------------------------------------------
  const EXPR_ICONS = {
    smile: '😊',
    joy: '😄',
    pray: '🙏',
    grace: '✨',
    wink: '😉',
    calm: '😌'
  };

  function updateMyExprBadge() {
    const el = document.getElementById('my-expr-badge');
    if (el && myAvatarConfig) {
      el.textContent = EXPR_ICONS[myAvatarConfig.expression] || '✨';
    }
  }

  let tempPreset = myPresetId;
  let draftAvatarCfg = { ...myAvatarConfig };
  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewAvatarPivot = null;
  let previewAnimId = null;
  let previewRotY = 0;
  let previewZoomClose = false;
  let previewDragging = false;
  let previewLastX = 0;

  function ensureAvatarPreviewStudio() {
    const pCanvas = document.getElementById('avatar-preview-canvas');
    if (!pCanvas || !window.THREE) return;
    if (!previewRenderer) {
      const THREE = window.THREE;
      previewScene = new THREE.Scene();
      previewCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      previewRenderer = new THREE.WebGLRenderer({ canvas: pCanvas, antialias: true, alpha: true });
      previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if ('outputColorSpace' in previewRenderer && THREE.SRGBColorSpace) {
        previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        previewRenderer.outputEncoding = THREE.sRGBEncoding;
      }

      // VRoid MToon 셰이더 최적 조명 밸런스 (하얗게 날아가는 과노출 원천 방지!)
      const amb = new THREE.AmbientLight(0xffffff, 0.36);
      const keyLight = new THREE.DirectionalLight(0xfffaf2, 0.72);
      keyLight.position.set(1.2, 1.8, 2.4);
      previewScene.add(amb, keyLight);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.50, 0.56, 0.06, 32),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.35, roughness: 0.4 })
      );
      pedestal.position.y = -0.03;
      const goldRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.51, 0.012, 10, 36),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.75, roughness: 0.25 })
      );
      goldRim.rotation.x = Math.PI * 0.5;
      goldRim.position.y = 0.005;
      previewScene.add(pedestal, goldRim);

      previewAvatarPivot = new THREE.Group();
      previewScene.add(previewAvatarPivot);

      pCanvas.addEventListener('pointerdown', (e) => {
        previewDragging = true;
        previewLastX = e.clientX;
        try { pCanvas.setPointerCapture(e.pointerId); } catch {}
      });
      pCanvas.addEventListener('pointermove', (e) => {
        if (!previewDragging) return;
        const dx = e.clientX - previewLastX;
        previewLastX = e.clientX;
        previewRotY += dx * 0.014;
      });
      pCanvas.addEventListener('pointerup', () => { previewDragging = false; });
      pCanvas.addEventListener('pointercancel', () => { previewDragging = false; });
    }

    const rect = pCanvas.parentElement.getBoundingClientRect();
    const w = Math.max(220, rect.width || 300);
    const h = Math.max(200, rect.height || 260);
    previewCamera.aspect = w / h;
    previewCamera.updateProjectionMatrix();
    previewRenderer.setSize(w, h, false);
  }

  let previewVrmRec = null;
  let previewLoadedModelKey = '';
  let previewLoadSeq = 0;

  async function refreshStudioPreviewVrm(forceModelReload = false) {
    ensureAvatarPreviewStudio();
    if (!previewAvatarPivot) return;
    const targetModel = (draftAvatarCfg && draftAvatarCfg.vrmModel) || 'fumiriya';

    if (!forceModelReload && previewVrmRec && previewLoadedModelKey === targetModel) {
      world3d.applyStyleToStudioVrm(previewVrmRec, tempPreset, draftAvatarCfg);
      return;
    }

    const seq = ++previewLoadSeq;
    const badge = document.getElementById('vrm-loading-badge');
    if (badge) badge.classList.remove('hidden');

    try {
      const rec = await world3d.loadVrmRecordForStudio(tempPreset, draftAvatarCfg);
      if (seq !== previewLoadSeq) return;
      while (previewAvatarPivot.children.length > 0) {
        previewAvatarPivot.remove(previewAvatarPivot.children[0]);
      }
      previewVrmRec = rec;
      window.__previewVrmRec = rec;
      previewLoadedModelKey = targetModel;
      previewAvatarPivot.add(rec.wrapper);
    } catch (e) {
      console.warn('Studio VRM load error:', e);
    } finally {
      if (seq === previewLoadSeq && badge) badge.classList.add('hidden');
    }
  }

  function updatePreviewCameraFraming() {
    if (!previewCamera) return;
    const isCute = draftAvatarCfg && draftAvatarCfg.bodyStyle === 'cute';
    // VRM 실제 눈·가슴 높이에 맞춘 포트레이트 클로즈업 & 전신 구도
    let headWorldY = isCute ? 1.40 : 1.62;
    if (previewVrmRec && previewVrmRec.headRaw) {
      const hw = new window.THREE.Vector3();
      previewVrmRec.headRaw.getWorldPosition(hw);
      if (hw.y > 0.5) headWorldY = hw.y + 0.05;
    }

    if (previewZoomClose) {
      previewCamera.position.set(0, headWorldY - 0.02, isCute ? 1.05 : 0.95);
      previewCamera.lookAt(0, headWorldY - 0.05, 0);
    } else {
      previewCamera.position.set(0, headWorldY * 0.60, isCute ? 2.50 : 2.75);
      previewCamera.lookAt(0, headWorldY * 0.52, 0);
    }
  }

  let previewLastTime = performance.now();
  function startAvatarPreviewLoop() {
    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    previewLastTime = performance.now();
    const tick = () => {
      const modal = document.getElementById('profile-modal');
      if (!modal || modal.classList.contains('hidden')) {
        previewAnimId = null;
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - previewLastTime) * 0.001);
      previewLastTime = now;

      if (previewRenderer && previewScene && previewCamera && previewAvatarPivot) {
        if (!previewDragging) {
          previewAvatarPivot.rotation.y = Math.sin(now * 0.0008) * 0.28;
        } else {
          previewAvatarPivot.rotation.y = previewRotY;
        }
        if (previewVrmRec) {
          world3d.animateStudioVrm(previewVrmRec, tempPreset, draftAvatarCfg, dt, now * 0.001);
        }
        updatePreviewCameraFraming();
        previewRenderer.render(previewScene, previewCamera);
      }
      previewAnimId = requestAnimationFrame(tick);
    };
    previewAnimId = requestAnimationFrame(tick);
  }

  function syncAvatarStudioUiHighlights() {
    document.querySelectorAll('.preset-pick-btn').forEach((b) => {
      const active = b.getAttribute('data-pid') === tempPreset;
      b.className = active
        ? 'preset-pick-btn px-2 py-2 rounded-xl border-2 border-amber-400 bg-amber-400/20 text-white text-[11px] font-extrabold cursor-pointer truncate'
        : 'preset-pick-btn px-2 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 text-[11px] font-bold cursor-pointer truncate';
    });

    document.querySelectorAll('.av-opt-btn').forEach((b) => {
      const key = b.getAttribute('data-avkey');
      const val = b.getAttribute('data-avval');
      const isActive = draftAvatarCfg && String(draftAvatarCfg[key]) === String(val);
      const isColorSwatch = (key === 'outfitColor' || key === 'bottomColor') && val !== 'original';
      if (isColorSwatch) {
        b.classList.toggle('ring-2', isActive);
        b.classList.toggle('ring-amber-300', isActive);
        b.classList.toggle('scale-110', isActive);
        b.classList.toggle('border-amber-300', isActive);
        b.classList.toggle('border-white/30', !isActive);
      } else {
        b.classList.toggle('border-amber-400', isActive);
        b.classList.toggle('bg-amber-400/20', isActive);
        b.classList.toggle('text-amber-200', isActive);
        b.classList.toggle('border-slate-700', !isActive);
        b.classList.toggle('bg-slate-900', !isActive);
        b.classList.toggle('text-slate-200', !isActive);
      }
    });

    document.querySelectorAll('.quick-expr-chip').forEach((c) => {
      const act = draftAvatarCfg && c.getAttribute('data-qexpr') === draftAvatarCfg.expression;
      c.className = act
        ? 'quick-expr-chip px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold cursor-pointer shadow'
        : 'quick-expr-chip px-2 py-0.5 rounded-full bg-black/70 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer';
    });
  }

  const presetBox = document.getElementById('avatar-preset-grid');
  presetBox.innerHTML = world3d.getPresets().map((p) => `
    <button type="button" data-pid="${p.id}" class="preset-pick-btn px-2 py-2 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 text-[11px] font-bold cursor-pointer truncate">
      ${p.label}
    </button>
  `).join('');

  presetBox.querySelectorAll('.preset-pick-btn').forEach((b) => {
    b.addEventListener('click', () => {
      tempPreset = b.getAttribute('data-pid');
      draftAvatarCfg = world3d.resolveAvatarConfig(tempPreset, null);
      syncAvatarStudioUiHighlights();
      refreshStudioPreviewVrm(false);
    });
  });

  const customVrmInput = document.getElementById('custom-vrm-input');
  if (customVrmInput) {
    customVrmInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const buf = await f.arrayBuffer();
        world3d.setCustomUserVrmBuffer(buf);
        draftAvatarCfg = { ...draftAvatarCfg, vrmModel: 'custom', hairColor: 'original', eyeColor: 'original', outfitColor: 'original', bottomColor: 'original' };
        syncAvatarStudioUiHighlights();
        await refreshStudioPreviewVrm(true);
        toast(`✨ '${f.name}' 순정만화 VRM 모델을 불러왔습니다!`);
      } catch {
        toast('⚠️ 유효한 .vrm 캐릭터 파일을 선택해 주세요');
      }
    });
  }

  document.querySelectorAll('.av-studio-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const target = tabBtn.getAttribute('data-avtab');
      document.querySelectorAll('.av-studio-pane').forEach((p) => p.classList.add('hidden'));
      const pane = document.getElementById(`avpane-${target}`);
      if (pane) pane.classList.remove('hidden');
      document.querySelectorAll('.av-studio-tab').forEach((x) => {
        const act = x === tabBtn;
        x.className = act
          ? 'av-studio-tab py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer'
          : 'av-studio-tab py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-bold cursor-pointer';
      });
      if (target === 'expr' || target === 'hair') {
        previewZoomClose = true;
        document.getElementById('btn-preview-zoom-toggle').textContent = '🧍 전신 보기';
      } else if (target === 'fashion') {
        previewZoomClose = false;
        document.getElementById('btn-preview-zoom-toggle').textContent = '🔍 얼굴 클로즈업';
      }
    });
  });

  document.querySelectorAll('.av-opt-btn').forEach((optBtn) => {
    optBtn.addEventListener('click', () => {
      const key = optBtn.getAttribute('data-avkey');
      const val = optBtn.getAttribute('data-avval');
      if (!key || !val) return;
      draftAvatarCfg = { ...draftAvatarCfg, [key]: val };
      syncAvatarStudioUiHighlights();
      refreshStudioPreviewVrm(false);
    });
  });

  document.querySelectorAll('.quick-expr-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const expr = chip.getAttribute('data-qexpr') || 'smile';
      draftAvatarCfg = { ...draftAvatarCfg, expression: expr };
      syncAvatarStudioUiHighlights();
      refreshStudioPreviewVrm(false);
    });
  });

  document.getElementById('btn-preview-zoom-toggle').addEventListener('click', (e) => {
    previewZoomClose = !previewZoomClose;
    e.currentTarget.textContent = previewZoomClose ? '🧍 전신 보기' : '🔍 얼굴 클로즈업';
  });

  document.getElementById('btn-random-avatar').addEventListener('click', () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    draftAvatarCfg = {
      vrmModel: pick(['fumiriya', 'sample_c', 'sample_b', 'sample_a', 'shino', 'vita']),
      bodyStyle: pick(['model', 'model', 'model', 'cute']),
      skinTone: pick(['porcelain', 'porcelain', 'warm']),
      eyeColor: pick(['original', 'amber', 'sapphire', 'emerald', 'amethyst', 'rose']),
      expression: pick(['smile', 'joy', 'grace', 'wink']),
      hairColor: pick(['original', 'black', 'espresso', 'chestnut', 'ash_brown', 'burgundy', 'silver']),
      outfitColor: pick(['original', 'original', '#1c1e29', '#1e3a8a', '#f1f5f9', '#b48352', '#be185d', '#881337', '#047857']),
      bottomColor: pick(['original', '#1e293b', '#18181b', '#e7e5e4']),
      accessory: pick(['horn_glasses', 'wire_glasses', 'earcuff', 'necklace', 'none', 'none'])
    };
    syncAvatarStudioUiHighlights();
    refreshStudioPreviewVrm(false);
  });

  document.getElementById('btn-open-profile').addEventListener('click', () => {
    tempPreset = myPresetId;
    draftAvatarCfg = { ...world3d.resolveAvatarConfig(myPresetId, myAvatarConfig) };
    previewRotY = 0;
    previewZoomClose = true;
    document.getElementById('btn-preview-zoom-toggle').textContent = '🧍 전신 보기';
    document.getElementById('profile-name-input').value = myName;
    openModal('profile-modal');
    setTimeout(() => {
      syncAvatarStudioUiHighlights();
      refreshStudioPreviewVrm(false);
      startAvatarPreviewLoop();
    }, 30);
  });

  document.getElementById('btn-save-profile').addEventListener('click', () => {
    const n = document.getElementById('profile-name-input').value.trim();
    if (n) myName = n.slice(0, 18);
    myPresetId = tempPreset;
    myAvatarConfig = world3d.resolveAvatarConfig(myPresetId, draftAvatarCfg);
    try {
      localStorage.setItem('somy_world_name', myName);
      localStorage.setItem('somy_world_preset_v4', myPresetId);
      if (myAvatarConfig.vrmModel !== 'custom') {
        localStorage.setItem('somy_world_avatar_v4', JSON.stringify(myAvatarConfig));
      }
    } catch {}

    // 서버 DB 영구 저장 (소미 앱 계정 연동 및 브라우저 세션 변경에도 영구 유지)
    const userKey = somyUserId || myName;
    if (userKey && myAvatarConfig.vrmModel !== 'custom') {
      postChapelApi('save_user_avatar', {
        userId: userKey,
        presetId: myPresetId,
        avatarConfig: myAvatarConfig
      });
    }

    document.getElementById('my-name-badge').textContent = myName;
    updateMyExprBadge();
    world3d.updateAvatarInfo('me', {
      name: myName,
      presetId: myPresetId,
      avatarConfig: myAvatarConfig,
      forceReloadVrm: myAvatarConfig.vrmModel === 'custom'
    });
    syncMyPresence();
    broadcastEvent('avatar_style', {
      clientId: myClientId,
      name: myName,
      presetId: myPresetId,
      avatarConfig: myAvatarConfig.vrmModel === 'custom' ? { ...myAvatarConfig, vrmModel: 'fumiriya' } : myAvatarConfig
    });
    closeModal('profile-modal');
    toast(`✨ '${myName}' 순정만화 3D 아바타 스타일이 적용 및 저장되었습니다!`);
  });

  document.getElementById('npc-toggle-chk').addEventListener('change', (e) => {
    showNpcs = e.target.checked;
    refreshNpcsForZone();
    updateOnlineCounter();
  });

  document.getElementById('proximity-btn').addEventListener('click', () => {
    if (world3d.nearestInteractable) handleInteractable(world3d.nearestInteractable);
  });

  document.getElementById('btn-sip-drink').addEventListener('click', () => {
    world3d.triggerSip('me');
    world3d.showBubble('me', myDrink === 'water' ? '💧 시원하다~ 감사히 마십니다!' : '☕ 향긋한 커피 한 모금~', 3.5);
  });

  document.getElementById('btn-campus-hub').addEventListener('click', () => openModal('hub-modal'));
  document.querySelectorAll('.hub-zone-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const z = b.getAttribute('data-hubzone');
      closeModal('hub-modal');
      if (z) enterZone(z);
    });
  });
  document.getElementById('btn-hub-go-bible').addEventListener('click', () => {
    closeModal('hub-modal');
    if (currentZone !== 'bible') enterZone('bible');
    switchBibleTab('board');
    openModal('bible-modal');
  });
  document.getElementById('btn-hub-go-qt').addEventListener('click', () => {
    closeModal('hub-modal');
    if (currentZone !== 'qt') enterZone('qt');
    switchQtTab('today');
    openModal('qt-modal');
  });
  document.getElementById('btn-hub-go-candle').addEventListener('click', () => {
    closeModal('hub-modal');
    if (currentZone !== 'sanctuary' && currentZone !== 'prayer') enterZone('sanctuary');
    openModal('candle-modal');
  });
  document.getElementById('btn-hub-go-sarang').addEventListener('click', () => {
    closeModal('hub-modal');
    openModal('sarang-modal');
  });

  document.getElementById('btn-board-studio').addEventListener('click', () => openModal('board-modal'));
  document.getElementById('btn-sarang-Menu').addEventListener('click', () => openModal('sarang-modal'));
  document.getElementById('btn-bible-reader').addEventListener('click', () => {
    switchBibleTab('book');
    openModal('bible-modal');
  });
  document.getElementById('btn-qt-academy').addEventListener('click', () => {
    switchQtTab('today');
    openModal('qt-modal');
  });
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

  // -------------------------------------------------------------------------
  // 최하단 공간 빠른 이동 시트(접기/펼치기) & 상단 도구함(접기/펼치기) 토글 바인딩
  // -------------------------------------------------------------------------
  const topToolsBtn = document.getElementById('btn-toggle-top-tools');
  const topToolsDrawer = document.getElementById('top-tools-drawer');
  const topToolsIcon = document.getElementById('top-tools-icon');
  const topToolsLabel = document.getElementById('top-tools-label');

  // 실시간 접속 현황 모달 열기 버튼 (상단 접속자 수 배지 클릭 시 오픈)
  const presenceListBtn = document.getElementById('btn-presence-list');
  if (presenceListBtn) {
    presenceListBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderPresenceModalList();
      openModal('presence-modal');
    });
  }

  if (topToolsBtn && topToolsDrawer) {
    topToolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = topToolsDrawer.classList.toggle('hidden');
      if (topToolsLabel) topToolsLabel.textContent = isHidden ? '도구' : '닫기';
      if (topToolsIcon) topToolsIcon.textContent = isHidden ? '⚙️' : '✕';
      topToolsBtn.classList.toggle('bg-amber-400', !isHidden);
      topToolsBtn.classList.toggle('text-slate-950', !isHidden);
    });
  }

  const zoneSheet = document.getElementById('bottom-zone-sheet');
  const toggleZoneBtn = document.getElementById('btn-toggle-zone-sheet');
  const closeZoneBtn = document.getElementById('btn-close-zone-sheet');

  if (toggleZoneBtn && zoneSheet) {
    toggleZoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoneSheet.classList.toggle('hidden');
    });
  }

  if (closeZoneBtn && zoneSheet) {
    closeZoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      zoneSheet.classList.add('hidden');
    });
  }

  // -------------------------------------------------------------------------
  // 최하단 7개 공간 빠른 이동 탭 (스크롤/드래그 시 3D 카메라 드래그 간섭 완벽 차단)
  // -------------------------------------------------------------------------
  const bottomNavEl = document.getElementById('bottom-zone-nav');
  if (bottomNavEl) {
    const stopNavDrag = (e) => {
      e.stopPropagation();
    };
    ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove'].forEach((evt) => {
      bottomNavEl.addEventListener(evt, stopNavDrag, { passive: false });
    });
  }

  if (zoneSheet) {
    const stopSheetDrag = (e) => {
      e.stopPropagation();
    };
    ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove'].forEach((evt) => {
      zoneSheet.addEventListener(evt, stopSheetDrag, { passive: false });
    });
  }

  document.querySelectorAll('.zone-tab-btn').forEach((btn) => {
    // 버튼 터치/클릭 시 3D 캔버스로의 포인터 전파를 막아 화면 회전/드래그 오동작 방지
    const preventCanvasDrag = (e) => {
      e.stopPropagation();
    };
    btn.addEventListener('pointerdown', preventCanvasDrag);
    btn.addEventListener('touchstart', preventCanvasDrag, { passive: true });
    btn.addEventListener('mousedown', preventCanvasDrag);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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

  // 소미 앱 홈 복귀 버튼 (미디어·마이크·카메라·음성낭독 안전 종료 후 복귀)
  const backSomyBtn = document.getElementById('btn-back-somy');
  if (backSomyBtn) {
    backSomyBtn.addEventListener('click', () => {
      try { stopBibleTts(); } catch {}
      try { stopAllBgm(); } catch {}
      try { if (myFaceCamOn) stopMyFaceCam(); } catch {}
      try {
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop());
          micStream = null;
        }
      } catch {}

      if (isEmbeddedInSomy && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'SOMY_CHAPEL_CLOSE' }, '*');
      } else {
        window.location.href = '/';
      }
    });
  }

  // -------------------------------------------------------------------------
  // 서버 상태 · 소미 큐티 본문 · Supabase Realtime 초기화 후 월드 시작
  // -------------------------------------------------------------------------
  async function boot() {
    document.getElementById('my-name-badge').textContent = myName;
    updateMyExprBadge();
    const hubTitleEl = document.getElementById('hub-church-title');
    if (hubTitleEl) {
      hubTitleEl.textContent = `📋 ${currentChurchName} 온라인 캠퍼스 — 분류별 통합 게시판 & 메뉴`;
    }
    document.getElementById('qt-date-picker').value = getTodayKstStr();
    renderBoardSurface();
    renderBibleBookPages();
    updateBiblePlanPreview();
    world3d.loadZone('garden');
    world3d.updateAvatarInfo('me', { name: myName, presetId: myPresetId, avatarConfig: myAvatarConfig });
    refreshNpcsForZone();
    world3d.start();

    try {
      const res = await fetch(`/api/chapel-world?church_id=${encodeURIComponent(currentChurchId)}`).then((r) => r.json());
      if (res && res.state) {
        worldState = res.state;
        if (worldState.sarangbangs && worldState.sarangbangs.length > 0) {
          currentSarangId = worldState.sarangbangs[0].id;
        }

        // 서버에 저장된 내 캐릭터 설정이 있다면 동기화 복원
        const userKey = somyUserId || myName;
        if (worldState.userAvatars && userKey && worldState.userAvatars[userKey]) {
          const remoteAv = worldState.userAvatars[userKey];
          if (remoteAv.presetId) myPresetId = remoteAv.presetId;
          if (remoteAv.avatarConfig) {
            myAvatarConfig = world3d.resolveAvatarConfig(myPresetId, remoteAv.avatarConfig);
            try {
              localStorage.setItem('somy_world_preset_v4', myPresetId);
              localStorage.setItem('somy_world_avatar_v4', JSON.stringify(myAvatarConfig));
            } catch {}
            world3d.updateAvatarInfo('me', {
              presetId: myPresetId,
              avatarConfig: myAvatarConfig
            });
            syncMyPresence();
          }
        }
      }
      if (res && Array.isArray(res.somyQtRecentDates)) {
        recentSomyQtDates = res.somyQtRecentDates;
        populateRecentSomyQtDates();
      }
      if (res && res.somyQt) {
        currentSomyQt = res.somyQt;
        renderSomyQtBox(currentSomyQt);
      }
      if (res && res.supabaseUrl && res.supabaseAnonKey && window.supabase) {
        supaClient = window.supabase.createClient(res.supabaseUrl, res.supabaseAnonKey, {
          realtime: { params: { eventsPerSecond: 12 } }
        });
        // 단독 URL(/chapel)로 직접 열었을 때도 동일 브라우저의 소미 앱 로그인 세션을 자동 감지
        if (!somyUserId && supaClient.auth) {
          try {
            const { data: sessionData } = await supaClient.auth.getSession();
            const sessUser = sessionData && sessionData.session && sessionData.session.user;
            if (sessUser && sessUser.id) {
              somyUserId = sessUser.id;
            }
          } catch {}
        }
        joinMultiplayerRoom();
        initCampusPresenceChannel();
      }
    } catch (e) {
      console.warn('Standalone offline fallback mode:', e);
    }
    updateOnlineCounter();
  }

  boot();
})();
