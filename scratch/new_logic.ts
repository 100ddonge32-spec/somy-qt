        const today = getKoreaDateString();
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDate = now.getDate();
        const currentHour = now.getHours();

        const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth() + 1;
        const firstOfPrevMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

        const isFirstDay = currentDate === 1;

        console.log(`[Stats API] CIDs: ${cids}, Curr: ${firstOfMonth}, Prev: ${firstOfPrevMonth}`);

        const { data: churchProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('church_id', cids);
        
        const churchUserIds = (churchProfiles || []).map(p => p.id);
        const nameMap: Record<string, string> = {};
        const avatarMap: Record<string, string | null> = {};
        (churchProfiles || []).forEach(p => {
            if (p.full_name) nameMap[p.id] = p.full_name;
            if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
        });

        // Query completions & posts starting from PREVIOUS month
        let completionsQuery = supabaseAdmin.from('qt_completions').select('*').gte('completed_date', firstOfPrevMonth);
        if (rawChurchId === 'demo') completionsQuery = completionsQuery.like('user_name', '[데모]%');
        else if (rawChurchId !== 'somy-main' && churchUserIds.length > 0) completionsQuery = completionsQuery.in('user_id', churchUserIds);
        else if (rawChurchId !== 'somy-main') completionsQuery = completionsQuery.in('user_id', ['none']);
        const { data: completions, error: dbError } = await completionsQuery;

        const { data: posts, error: postError } = await supabaseAdmin
            .from('community_posts')
            .select('user_name, avatar_url, created_at, is_qt')
            .in('church_id', cids)
            .gte('created_at', firstOfPrevMonth);

        const qtPosts = (posts || []).filter(p => (p.is_qt === true || p.is_qt === 'true' || p.is_qt === 1 || p.is_qt === '1'));
        const allCompletions = completions || [];
        const EXCLUDED_NAMES = ['최성희', '고승삼', '한결'];

        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string>; baseCount: number }> = {};
        const prevUserStats: Record<string, { name: string; avatar: string | null; dates: Set<string> }> = {};

        allCompletions.forEach(comp => {
            const uid = comp.user_id;
            const nameKey = (comp.user_name || nameMap[uid] || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            const dateStr = comp.completed_date;
            const isPrevMonth = dateStr >= firstOfPrevMonth && dateStr < firstOfMonth;

            if (isPrevMonth) {
                if (!prevUserStats[nameKey]) prevUserStats[nameKey] = { name: nameKey, avatar: comp.avatar_url, dates: new Set() };
                prevUserStats[nameKey].dates.add(dateStr);
                if (comp.avatar_url) prevUserStats[nameKey].avatar = comp.avatar_url;
            } else if (dateStr >= firstOfMonth) {
                if (!userStats[nameKey]) userStats[nameKey] = { name: nameKey, avatar: comp.avatar_url, dates: new Set(), baseCount: 0 };
                userStats[nameKey].dates.add(dateStr);
                if (comp.avatar_url) userStats[nameKey].avatar = comp.avatar_url;

                if (dateStr === today && !todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: comp.avatar_url });
                }
            }
        });

        qtPosts.forEach(post => {
            const nameKey = (post.user_name || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            const kstDate = new Date(new Date(post.created_at).getTime() + 9 * 60 * 60 * 1000);
            const dateStr = kstDate.toISOString().split('T')[0];
            const isPrevMonth = dateStr >= firstOfPrevMonth && dateStr < firstOfMonth;

            if (isPrevMonth) {
                if (!prevUserStats[nameKey]) prevUserStats[nameKey] = { name: nameKey, avatar: post.avatar_url, dates: new Set() };
                prevUserStats[nameKey].dates.add(dateStr);
                if (post.avatar_url) prevUserStats[nameKey].avatar = post.avatar_url;
            } else if (dateStr >= firstOfMonth) {
                if (!userStats[nameKey]) userStats[nameKey] = { name: nameKey, avatar: post.avatar_url, dates: new Set(), baseCount: 0 };
                userStats[nameKey].dates.add(dateStr);
                if (post.avatar_url) userStats[nameKey].avatar = post.avatar_url;

                if (dateStr === today && !todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: post.avatar_url });
                }
            }
        });

        // MARCH_BASE logic is omitted because we use dynamic stats now.
        const ranking = Object.values(userStats)
            .map(u => ({ name: u.name, avatar: u.avatar, count: Array.from(u.dates).length }))
            .sort((a, b) => b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name))
            .slice(0, 100);

        let previousMonthRanking = null;
        if (currentDate <= 7) {
            if (prevMonth === 3 && prevYear === 2026) {
                previousMonthRanking = [
                    { name: '강혜진', count: 27 }, { name: '백동희', count: 26 }, { name: '김은영', count: 24 },
                    { name: '최말례', count: 23 }, { name: '이미경', count: 22 }, { name: '박영희', count: 14 },
                    { name: '안유리', count: 9 }, { name: '백동환', count: 8 }, { name: '장경하', count: 8 },
                    { name: '최성은', count: 6 }, { name: '김혜윤', count: 1 }
                ];
            } else {
                previousMonthRanking = Object.values(prevUserStats)
                    .map(u => ({ name: u.name, avatar: u.avatar, count: Array.from(u.dates).length }))
                    .sort((a, b) => b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name))
                    .slice(0, 15);
            }
        }
