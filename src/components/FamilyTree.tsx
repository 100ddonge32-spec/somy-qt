import React, { useState, useEffect } from 'react';

interface Member {
    id: string;
    full_name: string;
    avatar_url?: string;
    church_rank?: string;
    gender?: string;
    phone?: string;
    birthdate?: string;
}

interface Relationship {
    id: string;
    relationship_type: string;
    relative: Member;
}

interface FamilyTreeProps {
    member: Member;
    memberList: Member[];
    churchId: string;
    onClose: () => void;
    onSelectMember: (member: Member) => void;
    onRefreshList?: () => void;
}

export default function FamilyTree({
    member,
    memberList,
    churchId,
    onClose,
    onSelectMember,
    onRefreshList
}: FamilyTreeProps) {
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [spouseRelationships, setSpouseRelationships] = useState<Relationship[]>([]); // ✅ 배우자의 가족 관계 로드
    const [childrenSpouses, setChildrenSpouses] = useState<Record<string, any>>({}); // ✅ 자녀들의 배우자 정보 (사위/며느리 자동 매핑용)
    const [isLoading, setIsLoading] = useState(false);
    
    // 추가/수정용 상태
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedSlotType, setSelectedSlotType] = useState<string>('spouse');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Member[]>([]);

    // 1. 가족 관계 데이터 로드
    const loadRelationships = async () => {
        setIsLoading(true);
        try {
            // 1) 기준 성도의 가족 관계 로드
            const res = await fetch(`/api/members/relationships?member_id=${member.id}&church_id=${churchId}`);
            if (res.ok) {
                const data = await res.json();
                setRelationships(data || []);
                
                // 2) 배우자 존재 시, 배우자의 직계 가족 관계도 추가 조회
                const spouseRel = (data || []).find((r: any) => r.relationship_type === 'spouse');
                if (spouseRel?.relative?.id) {
                    const spouseRes = await fetch(`/api/members/relationships?member_id=${spouseRel.relative.id}&church_id=${churchId}`);
                    if (spouseRes.ok) {
                        const spouseData = await spouseRes.json();
                        setSpouseRelationships(spouseData || []);
                    }
                } else {
                    setSpouseRelationships([]);
                }

                // 3) 자녀 존재 시, 각 자녀의 배우자 정보(사위/며느리) 병렬 추가 조회
                const childrenList = (data || []).filter((r: any) => r.relationship_type === 'child');
                const tempSpouses: Record<string, any> = {};
                
                if (childrenList.length > 0) {
                    await Promise.all(childrenList.map(async (c: any) => {
                        try {
                            const cRes = await fetch(`/api/members/relationships?member_id=${c.relative.id}&church_id=${churchId}`);
                            if (cRes.ok) {
                                const cData = await cRes.json();
                                const spouseRel = (cData || []).find((r: any) => r.relationship_type === 'spouse');
                                if (spouseRel?.relative) {
                                    const sp = spouseRel.relative;
                                    // 성별에 따른 사위/며느리 호칭 판별
                                    const label = sp.gender === '남' ? '사위 🤵' : '며느리 👰';
                                    tempSpouses[c.relative.id] = {
                                        id: sp.id,
                                        full_name: sp.full_name,
                                        avatar_url: sp.avatar_url,
                                        church_rank: sp.church_rank,
                                        gender: sp.gender,
                                        relationship_type: 'spouse',
                                        computedLabel: label,
                                        raw: sp
                                    };
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching child spouse relationships:', err);
                        }
                    }));
                }
                setChildrenSpouses(tempSpouses);
            }
        } catch (err) {
            console.error('Error fetching relationships in FamilyTree:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRelationships();
        setShowAddForm(false);
        setSearchQuery('');
        setSearchResults([]);
    }, [member.id]);

    // 2. 관계 추가 처리
    const handleAddRelationship = async (relativeId: string, relType: string) => {
        try {
            const res = await fetch('/api/members/relationships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    church_id: churchId,
                    member_id: member.id,
                    relative_id: relativeId,
                    relationship_type: relType
                })
            });

            if (res.ok) {
                alert('가족 관계가 성공적으로 연결되었습니다! ✨');
                loadRelationships();
                setShowAddForm(false);
                setSearchQuery('');
                setSearchResults([]);
                if (onRefreshList) onRefreshList();
            } else {
                alert('가족 관계 등록에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        }
    };

    // 3. 관계 삭제 처리
    const handleDeleteRelationship = async (relativeId: string, relativeName: string) => {
        if (!confirm(`${relativeName}님과의 가족 관계를 해제하시겠습니까?`)) return;
        try {
            const res = await fetch(`/api/members/relationships?member_id=${member.id}&relative_id=${relativeId}&church_id=${churchId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('가족 관계가 안전하게 해제되었습니다. ✨');
                loadRelationships();
                if (onRefreshList) onRefreshList();
            } else {
                alert('가족 관계 해제 실패');
            }
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        }
    };

    // 4. 관계 변경 처리
    const handleChangeRelType = async (relativeId: string, newType: string) => {
        try {
            const res = await fetch('/api/members/relationships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    church_id: churchId,
                    member_id: member.id,
                    relative_id: relativeId,
                    relationship_type: newType
                })
            });

            if (res.ok) {
                alert('관계 유형이 변경되었습니다. ✨');
                loadRelationships();
                if (onRefreshList) onRefreshList();
            } else {
                alert('관계 유형 수정 실패');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 5. 관계 매핑 데이터 분류
    const getRelativesByType = (types: string[]) => {
        return relationships
            .filter(r => types.includes(r.relationship_type))
            .map(r => ({
                id: r.relative.id,
                full_name: r.relative.full_name,
                avatar_url: r.relative.avatar_url,
                church_rank: r.relative.church_rank,
                gender: r.relative.gender,
                relationship_type: r.relationship_type,
                raw: r.relative
            }));
    };

    // 💡 [지능형 호칭 계산기] 배우자(spouse)의 부모 데이터를 탐색하여 처가/시댁 호칭 자동 계산
    const getSpouseParents = () => {
        return spouseRelationships
            .filter(r => ['father', 'mother'].includes(r.relationship_type))
            .map(r => {
                let computedLabel = '';
                if (member.gender === '여') {
                    computedLabel = r.relationship_type === 'father' ? '시아버지 👴' : '시어머니 👵';
                } else {
                    computedLabel = r.relationship_type === 'father' ? '장인어른 👴' : '장모님 👵';
                }
                return {
                    id: r.relative.id,
                    full_name: r.relative.full_name,
                    avatar_url: r.relative.avatar_url,
                    church_rank: r.relative.church_rank,
                    gender: r.relative.gender,
                    relationship_type: r.relationship_type,
                    computedLabel,
                    raw: r.relative
                };
            });
    };

    // 1대: 조부모
    const grandParents = getRelativesByType(['grandfather', 'grandmother']);
    // 1.5대: 친부모
    const parents = getRelativesByType(['father', 'mother']);
    // 1.5대: 시댁 / 처가 (자동 계산 결과)
    const spouseParents = getSpouseParents();
    // 2대: 배우자
    const spouses = getRelativesByType(['spouse']);
    // 2대: 형제자매
    const siblings = getRelativesByType(['sibling']);
    // 3대: 자녀
    const children = getRelativesByType(['child']);
    // 4대: 손주
    const grandChildren = getRelativesByType(['grandchild']);

    const relLabels: Record<string, string> = {
        spouse: '배우자 💍',
        father: '아버지 👨',
        mother: '어머니 👩',
        child: '자녀 👶',
        sibling: '형제자매 🤝',
        grandfather: '할아버지 👴',
        grandmother: '할머니 👵',
        grandchild: '손주 🧒'
    };

    // 카드 렌더러
    const renderNodeCard = (rel: any, isSelf = false, labelOverride = '', isSpouseParentsSide = false) => {
        const displayLabel = labelOverride || (relLabels[rel.relationship_type] || rel.relationship_type);
        
        return (
            <div 
                key={rel.id} 
                style={{
                    background: isSelf ? 'linear-gradient(135deg, #FFFDF3 0%, #FFF8D5 100%)' : (isSpouseParentsSide ? '#FAFAFA' : 'white'),
                    border: isSelf ? '2px solid #D4AF37' : (isSpouseParentsSide ? '1px dashed #DDD' : '1px solid #EAEAEA'),
                    borderRadius: '16px',
                    padding: '10px 14px',
                    width: '125px',
                    boxShadow: isSelf ? '0 8px 20px rgba(212,175,55,0.15)' : '0 4px 12px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                }}
                onClick={() => {
                    if (!isSelf) {
                        onSelectMember(rel.raw);
                    }
                }}
                title={isSelf ? '현재 선택된 성도' : `${rel.full_name} 성도의 가계도로 이동`}
            >
                {/* 사진 */}
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #EEE' }}>
                    <img 
                        alt="" 
                        src={isSelf ? (member.avatar_url || 'https://via.placeholder.com/38') : (rel.avatar_url || 'https://via.placeholder.com/38')} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                </div>
                
                {/* 이름 및 직분 */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isSelf ? member.full_name : rel.full_name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#777', marginTop: '1px' }}>
                        {isSelf ? (member.church_rank || '성도') : (rel.church_rank || '성도')}
                    </div>
                </div>

                {/* 관계 라벨 배지 */}
                <div style={{ 
                    fontSize: '9px', 
                    background: isSelf ? '#333' : (isSpouseParentsSide ? '#E3F2FD' : '#F4F4F4'), 
                    color: isSelf ? 'white' : (isSpouseParentsSide ? '#1565C0' : '#666'), 
                    padding: '2px 6px', 
                    borderRadius: '6px', 
                    fontWeight: 700 
                }}>
                    {isSelf ? '본인 ⭐' : displayLabel}
                </div>

                {/* 관리 액션 버튼 (본인 및 인척-시댁/처가/사위/며느리가 아닐 때만 노출) */}
                {!isSelf && !isSpouseParentsSide && (
                    <div 
                        style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '2px' }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <select
                            value={rel.relationship_type}
                            onChange={(e) => handleChangeRelType(rel.id, e.target.value)}
                            style={{
                                opacity: 0,
                                position: 'absolute',
                                width: '18px',
                                height: '18px',
                                right: '18px',
                                cursor: 'pointer',
                                zIndex: 5
                            }}
                        >
                            <option value="spouse">배우자</option>
                            <option value="father">아버지</option>
                            <option value="mother">어머니</option>
                            <option value="child">자녀</option>
                            <option value="sibling">형제자매</option>
                            <option value="grandfather">할아버지</option>
                            <option value="grandmother">할머니</option>
                            <option value="grandchild">손주</option>
                        </select>
                        <span style={{ fontSize: '10px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', background: '#F5F5F5', cursor: 'pointer', border: '1px solid #DDD' }} title="관계 변경">⚙️</span>
                        <span 
                            onClick={() => handleDeleteRelationship(rel.id, rel.full_name)}
                            style={{ fontSize: '10px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', background: '#FFF0F0', color: '#D32F2F', cursor: 'pointer', border: '1px solid #FFCDD2' }}
                            title="관계 해제"
                        >
                            ×
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: '#FDFCFB',
                width: '100%',
                maxWidth: '650px',
                height: '90vh',
                borderRadius: '30px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                animation: 'modal-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* 1. Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'white',
                    borderBottom: '1px solid #F0F0F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📊</span> {member.full_name} 성도의 가족 가계도
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#888' }}>
                            인척(시댁/처가/사위/며느리) 관계는 배우자의 직계 분석을 통해 마법처럼 **자동으로 표기**됩니다.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={() => {
                                setSelectedSlotType('spouse');
                                setShowAddForm(true);
                            }}
                            style={{ padding: '6px 12px', background: '#FFF9E6', color: '#B08C3E', border: '1px solid #D4AF37', borderRadius: '10px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                        >
                            ➕ 가족 연결하기
                        </button>
                        <button 
                            onClick={onClose} 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F5F5F5', fontSize: '14px', fontWeight: 900, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* 2. 가계도 렌더링 Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', background: '#FAF9F6' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#999' }}>
                            가족 관계 데이터 교차 분석 중... ⏳
                        </div>
                    ) : (
                        <>
                            {/* Level 1: 조부모 (있을 때만 렌더링) */}
                            {grandParents.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {grandParents.map(gp => renderNodeCard(gp))}
                                    </div>
                                    <div style={{ width: '2px', height: '14px', background: '#EAEAEA' }} />
                                </div>
                            )}

                            {/* Level 2: 부모 & 처가/시댁 (2개 단 분리) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>PARENTS & IN-LAWS</div>
                                
                                <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                                    {/* 친가 부모님 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontSize: '11px', color: '#777', fontWeight: 800 }}>친부모님 🏠</div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {parents.length === 0 ? (
                                                <div 
                                                    onClick={() => {
                                                        setSelectedSlotType('father');
                                                        setShowAddForm(true);
                                                    }}
                                                    style={{ width: '125px', height: '78px', border: '1px dashed #CCC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#AAA', cursor: 'pointer', background: 'white' }}
                                                >
                                                    👨‍👩‍👦 부모 연결
                                                </div>
                                            ) : (
                                                parents.map(p => renderNodeCard(p))
                                            )}
                                        </div>
                                    </div>

                                    {/* 시댁 / 처가 (배우자 부모 자동 계산 렌더링) */}
                                    {spouses.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ fontSize: '11px', color: '#1565C0', fontWeight: 800 }}>
                                                {member.gender === '여' ? '시댁 식구 💒' : '처가 식구 💒'}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {spouseParents.length === 0 ? (
                                                    <div style={{ width: '125px', height: '78px', border: '1px dashed #E3F2FD', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#90CAF9', background: '#FAFDFE', textAlign: 'center', padding: '10px' }}>
                                                        배우자 상세 페이지에서 부모를 연결하면 여기에 자동 표기됩니다!
                                                    </div>
                                                ) : (
                                                    spouseParents.map(sp => renderNodeCard(sp, false, sp.computedLabel, true))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ width: '2px', height: '16px', background: '#B8924A', opacity: 0.5, marginTop: '8px' }} />
                            </div>

                            {/* Level 3: 본인 및 배우자, 형제자매 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: 'rgba(212,175,55,0.02)', padding: '16px', borderRadius: '24px', border: '1px solid rgba(212,175,55,0.08)' }}>
                                <div style={{ fontSize: '10px', color: '#B8924A', fontWeight: 800, letterSpacing: '1px' }}>CORE FAMILY</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    
                                    {/* 1) 형제자매 (왼쪽) */}
                                    {siblings.length > 0 && (
                                        <div style={{ display: 'flex', gap: '10px', marginRight: '6px' }}>
                                            {siblings.map(sib => renderNodeCard(sib))}
                                        </div>
                                    )}

                                    {/* 2) 본인 (가운데) */}
                                    {renderNodeCard(member as any, true)}

                                    {/* 연결선 (가운데) */}
                                    <div style={{ width: '24px', height: '2px', background: spouses.length > 0 ? '#D4AF37' : '#DDD' }} />

                                    {/* 3) 배우자 (오른쪽) */}
                                    {spouses.length === 0 ? (
                                        <div 
                                            onClick={() => {
                                                setSelectedSlotType('spouse');
                                                setShowAddForm(true);
                                            }}
                                            style={{ width: '125px', height: '78px', border: '1px dashed #D4AF37', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#B8924A', cursor: 'pointer', background: 'white' }}
                                        >
                                            💍 배우자 연결
                                        </div>
                                    ) : (
                                        spouses.map(sp => renderNodeCard(sp))
                                    )}
                                </div>
                            </div>

                            {/* Level 4: 자녀 & 사위/며느리 (커플 노드 병렬 렌더링) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '2px', height: '16px', background: '#B8924A', opacity: 0.5 }} />
                                <div style={{ fontSize: '10px', color: '#AAA', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>CHILDREN & SPOUSES</div>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {children.length === 0 ? (
                                        <div 
                                            onClick={() => {
                                                setSelectedSlotType('child');
                                                setShowAddForm(true);
                                            }}
                                            style={{ width: '125px', height: '78px', border: '1px dashed #CCC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#AAA', cursor: 'pointer', background: 'white' }}
                                        >
                                            👶 자녀 연결
                                        </div>
                                    ) : (
                                        children.map(c => {
                                            const childSpouse = childrenSpouses[c.id];
                                            return (
                                                <div 
                                                    key={c.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px', 
                                                        background: childSpouse ? 'rgba(212,175,55,0.02)' : 'transparent', 
                                                        padding: childSpouse ? '10px' : '0', 
                                                        borderRadius: childSpouse ? '24px' : '0', 
                                                        border: childSpouse ? '1px dotted rgba(212,175,55,0.2)' : 'none' 
                                                    }}
                                                >
                                                    {/* 자녀 카드 */}
                                                    {renderNodeCard(c)}
                                                    
                                                    {/* 사위 / 며느리 자동 완성 카드 */}
                                                    {childSpouse && (
                                                        <>
                                                            <div style={{ width: '14px', height: '2px', background: '#D4AF37', opacity: 0.6 }} />
                                                            {renderNodeCard(childSpouse, false, childSpouse.computedLabel, true)}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Level 5: 손주 (있을 때만 렌더링) */}
                            {grandChildren.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '2px', height: '14px', background: '#EAEAEA' }} />
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {grandChildren.map(gc => renderNodeCard(gc))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 3. 가족 관계 실시간 추가 오버레이 */}
                {showAddForm && (
                    <div style={{
                        padding: '20px 24px',
                        background: 'white',
                        borderTop: '1px solid #F0F0F0',
                        boxShadow: '0 -8px 24px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 900, color: '#B8924A' }}>🔗 새로운 가족 관계 연결</span>
                            <button 
                                onClick={() => setShowAddForm(false)} 
                                style={{ border: 'none', background: 'none', color: '#999', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
                            >
                                닫기 [×]
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={selectedSlotType}
                                onChange={(e) => setSelectedSlotType(e.target.value)}
                                style={{ padding: '10px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', outline: 'none', fontWeight: 700 }}
                            >
                                <option value="spouse">배우자</option>
                                <option value="father">아버지</option>
                                <option value="mother">어머니</option>
                                <option value="child">자녀</option>
                                <option value="sibling">형제자매</option>
                                <option value="grandfather">할아버지</option>
                                <option value="grandmother">할머니</option>
                                <option value="grandchild">손주</option>
                            </select>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="성도 이름 실시간 검색..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        const query = e.target.value;
                                        setSearchQuery(query);
                                        if (query.trim().length >= 1) {
                                            const results = memberList.filter(item => 
                                                item.id !== member.id && 
                                                item.full_name?.toLowerCase().includes(query.toLowerCase())
                                            );
                                            setSearchResults(results.slice(0, 5));
                                        } else {
                                            setSearchResults([]);
                                        }
                                    }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '13px', outline: 'none' }}
                                />

                                {/* 검색 목록 드롭다운 */}
                                {searchResults.length > 0 && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'white', border: '1px solid #DDD', borderRadius: '12px', marginBottom: '8px', zIndex: 100, boxShadow: '0 -8px 24px rgba(0,0,0,0.12)', maxHeight: '160px', overflowY: 'auto' }}>
                                        {searchResults.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleAddRelationship(item.id, selectedSlotType)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F5F5F5' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                            >
                                                <img alt="" src={item.avatar_url || 'https://via.placeholder.com/28'} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#333' }}>{item.full_name}</span>
                                                    <span style={{ fontSize: '10px', color: '#888' }}>{item.church_rank || '성도'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
