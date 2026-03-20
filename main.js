// State Management
let state = {
    user: null, // { uid: string, nickname: string }
    myNickname: '익명',
    myColor: '#f8f9fa',
    currentStoreOwner: null,
    currentStoreOwnerNickname: '익명',
    currentBook: null,
    editingRecordId: null,
    timer: { interval: null, seconds: 0, isRunning: false, startTime: null, persistedSeconds: 0 },
    feed: { lastDoc: null, unsubscribe: null },
    isAdmin: false,
    notifUnsubscribe: null
};

let db;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    feed: document.getElementById('feed-view'),
    people: document.getElementById('people-view'),
    bookstore: document.getElementById('bookstore-view'),
    tracker: document.getElementById('tracker-view'),
    trash: document.getElementById('trash-view'),
    admin: document.getElementById('admin-view')
};
const nav = document.getElementById('bottom-nav');
const loadingOverlay = document.getElementById('loading-overlay');
const floatingTimer = document.getElementById('floating-timer');
const floatingTimerDisplay = document.getElementById('floating-timer-display');
const floatingTimerToggle = document.getElementById('floating-timer-toggle');
const loadMoreBtn = document.getElementById('load-more-btn');
const navAdmin = document.getElementById('nav-admin');
const notifDot = document.getElementById('notif-dot');

// Initialize App
async function init() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp({ projectId: "manread-74612" });
        }
        db = firebase.firestore();
        
        const savedNickname = localStorage.getItem('manread_user_nickname');
        if (savedNickname) {
            await handleLogin(savedNickname);
            const initialView = location.hash.replace('#', '') || 'feed';
            if (views[initialView]) navigateTo(initialView, false);
        } else {
            showView('login');
            showLoading(false);
        }
        renderAnnouncements();
    } catch (e) { console.error("Init failed:", e); }
}

function showLoading(show, message = "") {
    if (!loadingOverlay) return;
    loadingOverlay.classList.toggle('hidden', !show);
    if (message) document.getElementById('loading-message').innerText = message;
}

async function handleLogin(nickname) {
    if (!nickname) return;
    nickname = nickname.trim();
    showLoading(true, "회원 정보를 확인하고 있습니다...");
    try {
        const snap = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
        if (!snap.empty) {
            const userDoc = snap.docs[0];
            const userData = userDoc.data();
            state.user = { uid: userDoc.id, nickname: userData.nickname };
            state.myNickname = userData.nickname;
            state.myColor = userData.color || '#f8f9fa';
        } else {
            const newUserRef = db.collection("users").doc();
            const userData = { uid: newUserRef.id, nickname: nickname, color: '#f8f9fa', joinedAt: firebase.firestore.FieldValue.serverTimestamp() };
            await newUserRef.set(userData);
            state.user = { uid: newUserRef.id, nickname: nickname };
            state.myNickname = nickname;
            state.myColor = '#f8f9fa';
        }
        
        localStorage.setItem('manread_user_nickname', state.myNickname);
        state.isAdmin = (nickname === 'admin');
        if (navAdmin) navAdmin.classList.toggle('hidden', !state.isAdmin);
        
        restoreTimerState();
        listenForNotifications();
        showView('feed');
        renderFeed();
        updateNavUI('feed');
    } catch (e) { console.error("Login failed:", e); logout(); } finally { showLoading(false); }
}

function listenForNotifications() {
    if (!state.user) return;
    if (state.notifUnsubscribe) state.notifUnsubscribe();
    state.notifUnsubscribe = db.collection("activities")
        .where("uid", "==", state.user.uid)
        .onSnapshot(snapshot => {
            let hasNew = false;
            snapshot.docChanges().forEach(change => { if (change.type === "modified") hasNew = true; });
            if (hasNew && notifDot) notifDot.classList.remove('hidden');
        });
}

function showView(viewName) {
    Object.keys(views).forEach(v => { if (views[v]) views[v].classList.toggle('hidden', v !== viewName); });
    if (nav) nav.classList.toggle('hidden', viewName === 'login');
    updateFloatingTimerVisibility();
    if (viewName === 'bookstore' && notifDot) notifDot.classList.add('hidden');
}

function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(btn => { btn.classList.toggle('active', btn.dataset.view === activeView); });
}

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
let selectedColor = '#f8f9fa';

document.getElementById('open-settings-btn').onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!state.user) return;
    document.getElementById('settings-nickname-input').value = state.myNickname;
    selectedColor = state.myColor;
    updateColorPaletteUI();
    settingsModal.classList.remove('hidden');
};

document.getElementById('close-settings-btn').onclick = (e) => { e.preventDefault(); settingsModal.classList.add('hidden'); };

document.querySelectorAll('.color-item').forEach(item => {
    item.onclick = (e) => { e.preventDefault(); selectedColor = item.dataset.color; updateColorPaletteUI(); };
});

function updateColorPaletteUI() {
    document.querySelectorAll('.color-item').forEach(item => {
        const isSelected = item.dataset.color === selectedColor;
        item.style.border = isSelected ? '3px solid var(--accent)' : (item.dataset.color === '#f8f9fa' ? '2px solid #eee' : '2px solid transparent');
        item.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
    });
}

document.getElementById('save-settings-btn').onclick = async (e) => {
    e.preventDefault();
    const newName = document.getElementById('settings-nickname-input').value.trim();
    if (!newName) return alert('아이디를 입력해주세요.');
    showLoading(true, "설정을 저장하고 있습니다...");
    try {
        const batch = db.batch();
        const userRef = db.collection("users").doc(state.user.uid);
        if (newName !== state.myNickname) {
            const snap = await db.collection("users").where("nickname", "==", newName).limit(1).get();
            if (!snap.empty) { alert('이미 사용 중인 아이디입니다.'); showLoading(false); return; }
            const activitiesSnap = await db.collection("activities").where("uid", "==", state.user.uid).get();
            activitiesSnap.forEach(doc => batch.update(doc.ref, { nickname: newName, color: selectedColor }));
        } else {
            const activitiesSnap = await db.collection("activities").where("uid", "==", state.user.uid).get();
            activitiesSnap.forEach(doc => batch.update(doc.ref, { color: selectedColor }));
        }
        batch.update(userRef, { nickname: newName, color: selectedColor });
        await batch.commit();
        state.myNickname = newName; state.myColor = selectedColor; state.user.nickname = newName;
        localStorage.setItem('manread_user_nickname', newName);
        alert('설정이 저장되었습니다.');
        settingsModal.classList.add('hidden');
        enterBookstore(state.user.uid);
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

// Auth Actions
document.getElementById('login-btn').onclick = (e) => {
    e.preventDefault();
    const nickname = document.getElementById('login-nickname-input').value;
    if (!nickname) return alert('아이디(닉네임)를 입력해주세요.');
    handleLogin(nickname);
};

function logout() {
    if (state.notifUnsubscribe) state.notifUnsubscribe();
    state.user = null; state.myNickname = '익명'; state.isAdmin = false;
    if (navAdmin) navAdmin.classList.add('hidden');
    localStorage.removeItem('manread_user_nickname');
    showView('login');
}

document.getElementById('logout-btn').onclick = (e) => { e.preventDefault(); if (confirm('로그아웃 하시겠습니까?')) logout(); };

async function deleteAccount() {
    if (!state.user) return;
    if (!confirm('정말 모든 기록을 삭제할까요?\n삭제된 데이터는 복구할 수 없습니다.')) return;
    showLoading(true, "모든 데이터를 삭제하고 있습니다...");
    try {
        const batch = db.batch();
        const uid = state.user.uid;
        const activitiesSnap = await db.collection("activities").where("uid", "==", uid).get();
        activitiesSnap.forEach(doc => batch.delete(doc.ref));
        const trashSnap = await db.collection("users").doc(uid).collection("trash").get();
        trashSnap.forEach(doc => batch.delete(doc.ref));
        const booksSnap = await db.collection("users").doc(uid).collection("books").get();
        for (const bookDoc of booksSnap.docs) {
            const recordsSnap = await bookDoc.ref.collection("records").get();
            recordsSnap.forEach(doc => batch.delete(doc.ref));
            const sessionsSnap = await bookDoc.ref.collection("sessions").get();
            sessionsSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(bookDoc.ref);
        }
        batch.delete(db.collection("users").doc(uid));
        await batch.commit();
        alert('모든 데이터가 삭제되었습니다.');
        logout();
    } catch (e) { alert("삭제 중 오류 발생: " + e.message); } finally { showLoading(false); }
}
document.getElementById('delete-account-btn').onclick = (e) => { e.preventDefault(); deleteAccount(); };

// Activity Feed Rendering
async function renderFeed() {
    state.feed.lastDoc = null;
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">로딩 중...</p>';
    if (state.feed.unsubscribe) state.feed.unsubscribe();

    state.feed.unsubscribe = db.collection("activities")
        .orderBy("createdAt", "desc")
        .limit(10)
        .onSnapshot((snapshot) => {
            feedList.innerHTML = '';
            if (snapshot.empty) { feedList.innerHTML = '<div class="card">활동이 없습니다.</div>'; loadMoreBtn.classList.add('hidden'); return; }
            snapshot.forEach(doc => { feedList.appendChild(createActivityCard(doc.data(), doc.id)); });
            state.feed.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            loadMoreBtn.classList.remove('hidden');
        });
}

function createActivityCard(act, id) {
    const div = document.createElement('div');
    div.className = 'card feed-item';
    const timeStr = act.createdAt ? new Date(act.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const isMe = state.user && act.uid === state.user.uid;
    const authorName = isMe ? `${act.nickname || state.myNickname} (나)` : (act.nickname || '익명');
    const userColor = act.color || '#f8f9fa';

    const reactions = act.reactions || {};
    const emojis = ['📖', '❤️', '👍', '😮', '👏'];
    const emojiTooltips = { '📖': '나도 읽고 싶어요', '❤️': '감동적이에요', '👍': '추천해요', '😮': '놀라워요', '👏': '대단해요' };

    let displayContent = '';
    let titleExtra = '';
    if (act.type === 'timer' && act.content) {
        const minMatch = act.content.match(/\d+/);
        const minutes = minMatch ? minMatch[0] : '0';
        displayContent = `<div class="reading-time">🕒 ${minutes}m <span class="blinking-dot"></span></div>`;
    } else if (act.type === 'record' && act.content) {
        displayContent = `<div id="content-${id}" class="quote-box serif feed-content" style="margin-top: 8px;">${act.content}</div>`;
    } else if (act.type === 'book') {
        titleExtra = `<span style="font-size: 0.9rem; margin-left: 4px;">📖</span>`;
    }

    div.innerHTML = `
        <div class="feed-header">
            <div class="feed-user-info">
                <span class="color-dot" style="background: ${userColor}"></span>
                <span class="feed-user" style="font-weight:700; cursor:pointer;" onclick="enterBookstore('${act.uid}')">${authorName}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); opacity: 0.7;">${timeStr}</span>
            </div>
            <div style="font-size: 1rem; opacity: 0.6;">${act.type === 'timer' ? '🕒' : (act.type === 'record' ? '✍️' : '❤️')}</div>
        </div>
        <div class="feed-body">
            <div class="book-cover-placeholder">📖</div>
            <div class="book-info-content">
                <h3 class="book-title-emphasized">${act.bookTitle}${titleExtra}</h3>
                ${act.type === 'timer' ? displayContent : ''}
            </div>
        </div>
        ${act.type === 'record' ? displayContent : ''}
        <div class="feed-footer">
            <div class="reaction-container">
                ${emojis.map(e => {
                    const isActive = act.userReactions && act.userReactions[state.user?.uid]?.includes(e);
                    return `<button class="btn-emoji ${isActive ? 'active' : ''}" onclick="handleReaction('${id}', '${e}', ${isActive})" title="${emojiTooltips[e]}"><span>${e}</span> <span style="font-weight: 600;">${reactions[e] || 0}</span></button>`;
                }).join('')}
            </div>
            <div class="comment-summary" onclick="toggleComments('${id}')"><span>💬</span> <span>댓글 ${act.commentCount || 0}개 보기</span></div>
        </div>
        <div id="comments-area-${id}" class="hidden" style="margin-top: 10px; border-top: 1px dashed #eee; padding-top: 10px;">
            <div id="comment-list-${id}" style="margin-bottom: 15px;"></div>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="comment-input-${id}" placeholder="따뜻한 댓글을 남겨주세요..." style="font-size: 0.85rem; padding: 8px; margin-bottom: 0; flex: 1; border: 1px solid #eee; border-radius: 8px;">
                <button class="btn btn-small" onclick="submitComment('${id}')" style="padding: 0 16px;">등록</button>
            </div>
        </div>
    `;
    return div;
}

window.handleReaction = async (postId, emoji, alreadyActive) => {
    if (!state.user) return alert('아이디를 먼저 설정해주세요.');
    const postRef = db.collection("activities").doc(postId);
    try {
        if (alreadyActive) {
            await postRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.increment(-1), [`userReactions.${state.user.uid}`]: firebase.firestore.FieldValue.arrayRemove(emoji) });
        } else {
            await postRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.increment(1), [`userReactions.${state.user.uid}`]: firebase.firestore.FieldValue.arrayUnion(emoji) });
        }
    } catch (e) { console.error(e); }
};

window.toggleComments = async (postId) => {
    const area = document.getElementById(`comments-area-${postId}`);
    area.classList.toggle('hidden');
    if (!area.classList.contains('hidden')) { renderComments(postId); }
};

async function renderComments(postId) {
    const list = document.getElementById(`comment-list-${postId}`);
    list.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">댓글 로딩 중...</p>';
    const snap = await db.collection("activities").doc(postId).collection("comments").orderBy("createdAt", "asc").get();
    list.innerHTML = '';
    if (snap.empty) { list.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">첫 댓글을 남겨보세요!</p>'; return; }
    snap.forEach(doc => {
        const c = doc.data(); const cid = doc.id; const div = document.createElement('div');
        div.id = `comment-node-${cid}`; div.setAttribute('style', `padding: 8px 12px; margin-bottom: 8px; font-size: 0.85rem; background: #fcfcfc; border-radius: 0 8px 8px 0; border-left: 4px solid ${c.color || '#eee'};`);
        const isMyComment = state.user && c.uid === state.user.uid;
        div.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span style="font-weight:700;">${c.nickname}</span><div style="display:flex; gap:8px; align-items:center;"><span style="font-size:0.7rem; color:var(--text-muted);">${c.createdAt ? new Date(c.createdAt.toDate()).toLocaleDateString() : ''}</span>${isMyComment ? `<button class="btn-text" onclick="startEditComment('${postId}', '${cid}', \`${c.text}\`)" style="font-size:0.7rem; color:var(--accent);">수정</button><button class="btn-text" onclick="deleteComment('${postId}', '${cid}')" style="font-size:0.7rem; color:#e74c3c;">삭제</button>` : ''}</div></div><div class="comment-text-body">${c.text}</div>`;
        list.appendChild(div);
    });
}

window.submitComment = async (postId) => {
    if (!state.user) return alert('아이디를 먼저 설정해주세요.');
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    if (!text) return;
    try {
        const postRef = db.collection("activities").doc(postId);
        await postRef.collection("comments").add({ text, uid: state.user.uid, nickname: state.myNickname, color: state.myColor, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        await postRef.update({ commentCount: firebase.firestore.FieldValue.increment(1) });
        input.value = ''; renderComments(postId);
    } catch (e) { alert(e.message); }
};

async function renderPeopleList() {
    const list = document.getElementById('people-list'); list.innerHTML = '<p style="text-align:center; grid-column: 1 / -1;">로딩 중...</p>';
    const snap = await db.collection("users").orderBy("joinedAt", "desc").get();
    list.innerHTML = '';
    snap.forEach(doc => {
        const user = doc.data(); const div = document.createElement('div'); div.className = 'card';
        const isMe = state.user && doc.id === state.user.uid;
        div.setAttribute('style', `text-align: center; cursor: pointer; border-bottom: 4px solid ${user.color || '#f8f9fa'};`);
        div.innerHTML = `<div style="font-size: 2rem;">📖</div><div style="font-weight:600;">${isMe ? user.nickname + ' (나)' : user.nickname}</div>`;
        div.onclick = (e) => { e.preventDefault(); e.stopPropagation(); enterBookstore(doc.id); };
        list.appendChild(div);
    });
}

async function enterBookstore(uid) {
    state.currentStoreOwner = uid;
    showLoading(true, "책방을 불러오고 있습니다...");
    try {
        const ownerDoc = await db.collection("users").doc(uid).get();
        const ownerData = ownerDoc.data();
        state.currentStoreOwnerNickname = ownerData ? ownerData.nickname : '익명';
        const ownerColor = ownerData ? (ownerData.color || '#f8f9fa') : '#f8f9fa';
        const isOwner = (state.user && state.user.uid === uid);
        document.getElementById('user-greeting').innerText = isOwner ? "나의 책방" : `${state.currentStoreOwnerNickname}님의 책방`;
        document.getElementById('user-greeting').style.borderBottom = `3px solid ${ownerColor}`;
        document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
        document.getElementById('open-settings-btn').classList.toggle('hidden', !isOwner);
        showView('bookstore'); await renderBooks(uid);
    } catch (e) { console.error(e); } finally { showLoading(false); }
}

async function renderBooks(ownerUid) {
    const list = document.getElementById('book-list'); list.innerHTML = '';
    const snap = await db.collection("users").doc(ownerUid).collection("books").orderBy("createdAt", "desc").get();
    snap.forEach(doc => {
        const book = doc.data(); const div = document.createElement('div'); div.className = 'card';
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><div><h3 class="serif" style="margin:0;">${book.title}</h3><p style="margin:4px 0; color:var(--text-muted);">${book.author}</p></div><button class="btn btn-outline" onclick="openTracker('${doc.id}', '${book.title.replace(/'/g, "\\'")}')">${(state.user && state.user.uid === ownerUid) ? '읽기' : '구경'}</button></div>`;
        list.appendChild(div);
    });
}

window.openTracker = async (bid, title) => {
    state.currentBook = { id: bid, title: title }; document.getElementById('current-book-title').innerText = title;
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    document.getElementById('timer-section').classList.toggle('hidden', !isOwner);
    document.getElementById('record-entry').classList.toggle('hidden', !isOwner);
    updateTimerUI(); resetRecordInputs(); showView('tracker');
    showLoading(true, "기록을 불러오고 있습니다...");
    await Promise.all([renderRecords(), renderSessions()]);
    showLoading(false);
};

document.getElementById('save-record-btn').onclick = async (e) => {
    e.preventDefault(); if (!state.user) return alert('아이디를 먼저 설정해주세요.');
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value || 0; const paragraph = document.getElementById('paragraph-input').value || 0; const line = document.getElementById('line-input').value || 0;
    if (!content) return;
    showLoading(true, "저장 중...");
    try {
        const recordsRef = db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("records");
        if (state.editingRecordId) {
            await recordsRef.doc(state.editingRecordId).update({ content, page, paragraph, line, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            const recordSnap = await recordsRef.doc(state.editingRecordId).get();
            const activityId = recordSnap.data().relatedActivityId;
            if (activityId) await db.collection("activities").doc(activityId).update({ content, nickname: state.myNickname, color: state.myColor });
            state.editingRecordId = null;
        } else {
            const activityId = await logActivity('record', content);
            await recordsRef.add({ content, page, paragraph, line, relatedActivityId: activityId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        resetRecordInputs(); await renderRecords();
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

async function renderRecords() {
    const list = document.getElementById('records-list'); list.innerHTML = '<h3>독서 기록</h3>';
    const snap = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").orderBy("createdAt", "desc").get();
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    snap.forEach(doc => {
        const rec = doc.data(); const div = document.createElement('div'); div.className = 'card';
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><div class="quote-box serif">${rec.content}</div>${isOwner ? `<div style="display:flex; gap:4px;"><button class="btn btn-outline btn-small" onclick="startEditRecord('${doc.id}', \`${rec.content}\`, ${rec.page}, ${rec.paragraph}, ${rec.line})">수정</button><button class="btn btn-danger btn-small" onclick="deleteRecord('${doc.id}')">삭제</button></div>` : ''}</div><div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">${rec.page}p ${rec.paragraph}문단 ${rec.line}줄</div>`;
        list.appendChild(div);
    });
}

async function renderSessions() {
    const list = document.getElementById('sessions-list'); list.innerHTML = '<h3>독서 세션</h3>';
    const snap = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("sessions").orderBy("createdAt", "desc").get();
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    if (snap.empty) { list.innerHTML += '<p style="color:var(--text-muted); font-size:0.9rem;">기록된 세션이 없습니다.</p>'; return; }
    snap.forEach(doc => {
        const sess = doc.data(); if (!sess.startTime) return; const div = document.createElement('div'); div.className = 'card'; div.setAttribute('style', 'position: relative;');
        div.innerHTML = `<div style="font-weight:700; color:var(--accent); margin-bottom:4px;">${sess.startTime.toDate().toLocaleDateString()}</div><div style="color:var(--text-main); font-size:0.85rem;">⏱️ ${Math.floor(sess.duration/60)}분 ${sess.duration%60}초</div>${isOwner ? `<button class="btn-icon" style="position:absolute; top:8px; right:8px; font-size:0.9rem; opacity:0.6;" onclick="deleteSession('${doc.id}', '${sess.relatedActivityId || ''}')">🗑️</button>` : ''}`;
        list.appendChild(div);
    });
}

window.deleteSession = async (sid, activityId) => {
    if (!confirm('기록을 삭제할까요?')) return;
    showLoading(true, "삭제 중...");
    try {
        const batch = db.batch(); batch.delete(db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("sessions").doc(sid));
        if (activityId) batch.delete(db.collection("activities").doc(activityId));
        await batch.commit(); await renderSessions();
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

window.startEditRecord = (id, content, page, paragraph, line) => {
    state.editingRecordId = id; document.getElementById('record-input').value = content; document.getElementById('page-input').value = page; document.getElementById('paragraph-input').value = paragraph; document.getElementById('line-input').value = line;
    document.getElementById('save-record-btn').innerText = "수정 완료"; document.getElementById('cancel-edit-btn').classList.remove('hidden'); document.getElementById('record-entry').scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('cancel-edit-btn').onclick = (e) => { e.preventDefault(); resetRecordInputs(); };
function resetRecordInputs() {
    state.editingRecordId = null; document.getElementById('record-input').value = ''; document.getElementById('page-input').value = ''; document.getElementById('paragraph-input').value = ''; document.getElementById('line-input').value = '';
    document.getElementById('save-record-btn').innerText = "기록하기"; document.getElementById('cancel-edit-btn').classList.add('hidden');
}

window.deleteRecord = async (rid) => {
    if (!confirm('삭제하시겠습니까? 휴지통으로 이동합니다.')) return;
    showLoading(true, "휴지통으로 이동 중...");
    try {
        const ref = db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("records").doc(rid);
        const snap = await ref.get(); await db.collection("users").doc(state.user.uid).collection("trash").add({ ...snap.data(), originalBookId: state.currentBook.id, deletedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await ref.delete(); await renderRecords();
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

async function logActivity(type, content) {
    if (!state.user || !state.currentBook) return null;
    const docRef = await db.collection("activities").add({ uid: state.user.uid, nickname: state.myNickname, color: state.myColor, type, bookTitle: state.currentBook.title, content, createdAt: firebase.firestore.FieldValue.serverTimestamp(), reactions: {}, commentCount: 0 });
    return docRef.id;
}

document.getElementById('add-book-btn').onclick = async (e) => {
    e.preventDefault(); const title = prompt('제목:'); const author = prompt('저자:');
    if (title && author && state.user) {
        showLoading(true, "새 책을 추가하고 있습니다...");
        try {
            await db.collection("users").doc(state.user.uid).collection("books").add({ title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            await logActivity('book', `새 책 추가`); await renderBooks(state.user.uid);
        } catch (e) { alert(e.message); } finally { showLoading(false); }
    }
};

// Timer logic
function saveTimerState() { if (!state.user || !state.currentBook) return; localStorage.setItem(`manread_timer_${state.user.uid}`, JSON.stringify({ ...state.timer, book: state.currentBook, owner: state.currentStoreOwner, uid: state.user.uid })); }
function restoreTimerState() {
    if (!state.user) return;
    const saved = localStorage.getItem(`manread_timer_${state.user.uid}`); if (!saved) return;
    const data = JSON.parse(saved); state.currentBook = data.book; state.currentStoreOwner = data.owner;
    state.timer.isRunning = data.isRunning; state.timer.startTime = data.startTime; state.timer.persistedSeconds = data.persistedSeconds;
    if (state.timer.isRunning && state.timer.startTime) {
        state.timer.interval = setInterval(() => { state.timer.seconds = Math.floor((new Date().getTime() - state.timer.startTime) / 1000) + state.timer.persistedSeconds; updateTimerDisplay(); saveTimerState(); }, 1000);
    } else { state.timer.seconds = data.seconds || 0; }
    updateTimerDisplay();
}
function clearTimerState() { if (state.user) localStorage.removeItem(`manread_timer_${state.user.uid}`); }
function updateTimerDisplay() {
    const display = [Math.floor(state.timer.seconds / 3600), Math.floor((state.timer.seconds % 3600) / 60), state.timer.seconds % 60].map(v => v.toString().padStart(2, '0')).join(':');
    if (document.getElementById('timer')) document.getElementById('timer').innerText = display;
    if (floatingTimerDisplay) floatingTimerDisplay.innerText = display;
}
function updateFloatingTimerVisibility() { if (!floatingTimer) return; floatingTimer.classList.toggle('hidden', state.timer.seconds === 0 || !views.tracker.classList.contains('hidden')); if (floatingTimerToggle) floatingTimerToggle.innerText = state.timer.isRunning ? "⏸️" : "▶️"; }
function toggleTimer() {
    if (state.timer.isRunning) { clearInterval(state.timer.interval); state.timer.isRunning = false; state.timer.persistedSeconds = state.timer.seconds; state.timer.startTime = null; }
    else { state.timer.isRunning = true; state.timer.startTime = new Date().getTime(); state.timer.interval = setInterval(() => { state.timer.seconds = Math.floor((new Date().getTime() - state.timer.startTime) / 1000) + state.timer.persistedSeconds; updateTimerDisplay(); saveTimerState(); }, 1000); }
    saveTimerState(); updateTimerUI();
}
function updateTimerUI() { const btn = document.getElementById('timer-btn'); if (btn) btn.innerText = state.timer.isRunning ? "일시 정지" : (state.timer.seconds > 0 ? "다시 시작" : "읽기 시작"); updateTimerDisplay(); updateFloatingTimerVisibility(); }
async function finishReading() {
    if (state.timer.seconds > 0) {
        let timeStr = `${Math.floor(state.timer.seconds/60)}분`;
        if (confirm(`${timeStr} 동안 읽으셨네요! 종료할까요?`)) {
            showLoading(true, "독서 세션을 저장하고 있습니다...");
            try {
                const activityId = await logActivity('timer', `${timeStr} 동안 독서함`);
                await db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("sessions").add({
                    startTime: firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() - state.timer.seconds * 1000)), endTime: firebase.firestore.FieldValue.serverTimestamp(), duration: state.timer.seconds, relatedActivityId: activityId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (state.timer.interval) clearInterval(state.timer.interval);
                state.timer = { interval: null, seconds: 0, isRunning: false, startTime: null, persistedSeconds: 0 };
                clearTimerState(); updateTimerUI(); await renderSessions();
            } catch (e) { alert(e.message); } finally { showLoading(false); }
        }
    }
}

document.getElementById('back-to-store-btn').onclick = (e) => { e.preventDefault(); enterBookstore(state.currentStoreOwner); };
document.getElementById('back-from-trash-btn').onclick = (e) => { e.preventDefault(); enterBookstore(state.user.uid); };
document.getElementById('trash-btn').onclick = (e) => { e.preventDefault(); showView('trash'); renderTrash(); };

async function renderTrash() {
    const list = document.getElementById('trash-list'); list.innerHTML = '<p style="text-align:center;">로딩 중...</p>';
    const snap = await db.collection("users").doc(state.user.uid).collection("trash").orderBy("deletedAt", "desc").get();
    if (snap.empty) { list.innerHTML = '<div class="card">비어 있음</div>'; return; }
    list.innerHTML = ''; snap.forEach(doc => {
        const rec = doc.data(); const div = document.createElement('div'); div.className = 'card';
        div.innerHTML = `<div class="quote-box serif">${rec.content}</div><div style="margin-top:12px; display:flex; gap:8px;"><button class="btn btn-small" onclick="restoreRecord('${doc.id}')">복원</button><button class="btn btn-danger btn-small" onclick="permanentlyDeleteRecord('${doc.id}')">영구 삭제</button></div>`;
        list.appendChild(div);
    });
}

window.restoreRecord = async (tid) => {
    showLoading(true, "복원 중...");
    try {
        const ref = db.collection("users").doc(state.user.uid).collection("trash").doc(tid);
        const snap = await ref.get(); const data = snap.data();
        await db.collection("users").doc(state.user.uid).collection("books").doc(data.originalBookId).collection("records").add({ ...data });
        await ref.delete(); await renderTrash();
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

window.permanentlyDeleteRecord = async (tid) => { if (confirm('영구 삭제하시겠습니까?')) { showLoading(true, "삭제 중..."); try { await db.collection("users").doc(state.user.uid).collection("trash").doc(tid).delete(); await renderTrash(); } catch (e) { alert(e.message); } finally { showLoading(false); } } };

// Admin Dashboard
async function renderAdminDashboard() {
    if (!state.isAdmin) return;
    const todayTs = firebase.firestore.Timestamp.fromDate(new Date(new Date().setHours(0,0,0,0)));
    const [uSnap, aSnap] = await Promise.all([db.collection("users").get(), db.collection("activities").where("createdAt", ">=", todayTs).get()]);
    document.getElementById('stat-new-users').innerText = uSnap.docs.filter(d => d.data().joinedAt && d.data().joinedAt.toDate() >= todayTs.toDate()).length;
    document.getElementById('stat-new-posts').innerText = aSnap.size; document.getElementById('stat-active-readers').innerText = "1+"; 
    await Promise.all([renderAdminActivities(), renderAdminUsers()]);
}

async function renderAdminActivities() {
    const list = document.getElementById('admin-activity-list'); list.innerHTML = '<h3>최신 게시물 관리</h3>';
    const snap = await db.collection("activities").orderBy("createdAt", "desc").limit(50).get();
    snap.forEach(doc => {
        const act = doc.data(); const div = document.createElement('div'); div.className = 'card'; div.style.fontSize = '0.8rem';
        div.innerHTML = `<div style="display:flex; justify-content:space-between;"><div><strong>${act.nickname}</strong>: ${act.content || act.type}</div><button class="btn btn-danger btn-small" onclick="deleteActivityAdmin('${doc.id}')">삭제</button></div>`;
        list.appendChild(div);
    });
}

window.deleteActivityAdmin = async (id) => { if (confirm('삭제하시겠습니까?')) { showLoading(true, "삭제 중..."); try { await db.collection("activities").doc(id).delete(); await renderAdminActivities(); } catch (e) { alert(e.message); } finally { showLoading(false); } } };

async function renderAdminUsers() {
    const list = document.getElementById('admin-user-list'); list.innerHTML = '';
    const snap = await db.collection("users").orderBy("joinedAt", "desc").get();
    snap.forEach(doc => {
        const user = doc.data(); const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:10px;">${user.nickname}</td><td style="padding:10px;">${user.joinedAt?user.joinedAt.toDate().toLocaleDateString():'-'}</td><td style="padding:10px; display:flex; gap:4px;"><button class="btn btn-small" onclick="editUserAdmin('${doc.id}', '${user.nickname}')">수정</button><button class="btn btn-danger btn-small" onclick="blockUserAdmin('${doc.id}')">차단</button></td>`;
        list.appendChild(tr);
    });
}

window.editUserAdmin = async (uid, oldName) => { const n = prompt('새 닉네임:', oldName); if (n && n !== oldName) { showLoading(true, "수정 중..."); try { await db.collection("users").doc(uid).update({ nickname: n }); await renderAdminUsers(); } catch (e) { alert(e.message); } finally { showLoading(false); } } };
window.blockUserAdmin = async (uid) => { if (confirm('차단하시겠습니까?')) { showLoading(true, "차단 중..."); try { await db.collection("users").doc(uid).delete(); await renderAdminUsers(); } catch (e) { alert(e.message); } finally { showLoading(false); } } };

document.getElementById('save-announcement-btn').onclick = async (e) => {
    e.preventDefault(); const c = document.getElementById('admin-announcement-input').value.trim();
    if (c) { showLoading(true, "공지 등록 중..."); try { await db.collection("announcements").add({ content: c, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); document.getElementById('admin-announcement-input').value = ''; alert('공지 등록됨'); await renderAnnouncements(); } catch (e) { alert(e.message); } finally { showLoading(false); } }
};

async function renderAnnouncements() {
    const area = document.getElementById('announcement-area'); const snap = await db.collection("announcements").orderBy("createdAt", "desc").limit(1).get();
    if (snap.empty) { if(area) area.innerHTML = ''; return; }
    if(area) area.innerHTML = `<div class="card" style="background: #fff9db; border: 1px solid #fcc419; padding: 12px; margin-bottom: 15px;"><div style="font-weight:700; color:#e67700; margin-bottom:5px;">📢 마을 공지</div><div>${snap.docs[0].data().content}</div></div>`;
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.onclick = (e) => { e.preventDefault(); const t = btn.dataset.tab; document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('btn-outline', b !== btn)); document.getElementById('admin-tab-content').classList.toggle('hidden', t !== 'content'); document.getElementById('admin-tab-users').classList.toggle('hidden', t !== 'users'); };
});

// Navigation Handling
async function navigateTo(viewName, pushState = true) {
    if (viewName === 'login' && state.user) viewName = 'feed';
    if (viewName !== 'login' && !state.user) viewName = 'login';
    showView(viewName); updateNavUI(viewName);
    if (pushState) history.pushState({ view: viewName }, '', `#${viewName}`);
    try {
        if (viewName === 'feed') await renderFeed();
        else if (viewName === 'people') { showLoading(true, "마을 사람들을 불러오고 있습니다..."); await renderPeopleList(); }
        else if (viewName === 'bookstore') { if (state.user) await enterBookstore(state.user.uid); }
        else if (viewName === 'admin') { showLoading(true, "관리자 대시보드를 불러오고 있습니다..."); await renderAdminDashboard(); }
    } catch (e) { console.error("Navigation error:", e); } finally { showLoading(false); }
}

document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); navigateTo(btn.dataset.view); });
});

window.onpopstate = (e) => { const v = (e.state && e.state.view) || location.hash.replace('#', '') || 'feed'; navigateTo(v, false); };

if (floatingTimerDisplay) floatingTimerDisplay.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (state.currentBook) openTracker(state.currentBook.id, state.currentBook.title); };
if (floatingTimerToggle) floatingTimerToggle.onclick = (e) => { e.preventDefault(); e.stopPropagation(); toggleTimer(); };
if (document.getElementById('timer-btn')) document.getElementById('timer-btn').onclick = (e) => { e.preventDefault(); toggleTimer(); };
if (document.getElementById('finish-btn')) document.getElementById('finish-btn').onclick = (e) => { e.preventDefault(); finishReading(); };

init();
