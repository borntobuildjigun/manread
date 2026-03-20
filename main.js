// State Management
let state = {
    user: null, // Firebase Auth user object
    myNickname: '익명',
    currentStoreOwner: null, // UID of the store being viewed
    currentStoreOwnerNickname: '익명',
    currentBook: null,
    editingRecordId: null,
    timer: { 
        interval: null, 
        seconds: 0, 
        isRunning: false, 
        startTime: null,
        persistedSeconds: 0
    },
    feed: {
        lastDoc: null,
        unsubscribe: null
    }
};

let db;
let auth;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    feed: document.getElementById('feed-view'),
    people: document.getElementById('people-view'),
    bookstore: document.getElementById('bookstore-view'),
    tracker: document.getElementById('tracker-view'),
    trash: document.getElementById('trash-view')
};
const nav = document.getElementById('bottom-nav');
const loadingOverlay = document.getElementById('loading-overlay');
const floatingTimer = document.getElementById('floating-timer');
const floatingTimerDisplay = document.getElementById('floating-timer-display');
const floatingTimerToggle = document.getElementById('floating-timer-toggle');
const loadMoreBtn = document.getElementById('load-more-btn');

// Initialize App
function init() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp({ projectId: "manread-74612" });
        }
        db = firebase.firestore();
        auth = firebase.auth();
        
        // Auth Listener: 로그인 상태 감지 및 자동 이동
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                state.user = user;
                showLoading(true, "회원 정보를 확인하고 있습니다...");
                
                try {
                    await syncUserProfile(user);
                    restoreTimerState();
                    
                    // 로그인 성공 후 즉시 피드 화면으로 리다이렉션
                    showView('feed');
                    renderFeed();
                    updateNavUI('feed');
                } catch (e) {
                    console.error("Profile sync failed:", e);
                    alert("정보를 불러오지 못했습니다. 다시 로그인 해주세요.");
                    auth.signOut();
                } finally {
                    showLoading(false);
                }
            } else {
                state.user = null;
                state.myNickname = '익명';
                showView('login');
                showLoading(false);
            }
        });

    } catch (e) {
        console.error("Init failed:", e);
    }
}

// 로딩 화면 제어
function showLoading(show, message = "") {
    if (!loadingOverlay) return;
    loadingOverlay.classList.toggle('hidden', !show);
    if (message) document.getElementById('loading-message').innerText = message;
}

// 사용자 프로필 동기화 및 신규 회원 생성
async function syncUserProfile(user) {
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
        const data = doc.data();
        state.myNickname = data.nickname || '익명 이웃';
    } else {
        // 신규 사용자: Firestore에 기본 프로필 생성
        const initialName = user.displayName || '익명 이웃';
        await userRef.set({
            uid: user.uid,
            nickname: initialName,
            email: user.email,
            photoURL: user.photoURL,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.myNickname = initialName;
    }
}

function showView(viewName) {
    Object.keys(views).forEach(v => {
        if (views[v]) views[v].classList.toggle('hidden', v !== viewName);
    });
    // 네비게이션 바 노출 여부
    if (nav) nav.classList.toggle('hidden', viewName === 'login');
    updateFloatingTimerVisibility();
}

function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === activeView);
    });
}

// 1. Auth Actions
document.getElementById('google-login-btn').onclick = () => {
    showLoading(true, "구글 로그인을 진행 중입니다...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => {
        showLoading(false);
        if (e.code !== 'auth/popup-closed-by-user') {
            alert("로그인 중 오류가 발생했습니다: " + e.message);
        }
    });
};

document.getElementById('logout-btn').onclick = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
        auth.signOut();
    }
};

// 닉네임 수정 토글 및 저장
document.getElementById('edit-profile-btn').onclick = () => {
    const panel = document.getElementById('profile-settings');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        document.getElementById('nickname-edit-input').value = state.myNickname;
    }
};

document.getElementById('save-nickname-btn').onclick = async () => {
    const newName = document.getElementById('nickname-edit-input').value.trim();
    if (!newName) return;
    
    try {
        showLoading(true, "닉네임을 저장하고 있습니다...");
        await db.collection("users").doc(state.user.uid).update({ nickname: newName });
        state.myNickname = newName;
        document.getElementById('profile-settings').classList.add('hidden');
        document.getElementById('user-greeting').innerText = "나의 책방";
        alert('닉네임이 변경되었습니다.');
    } catch (e) { alert(e.message); }
    finally { showLoading(false); }
};

// 2. Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        const view = item.dataset.view;
        updateNavUI(view);
        if (view === 'feed') { showView('feed'); renderFeed(); }
        else if (view === 'people') { showView('people'); renderPeopleList(); }
        else if (view === 'bookstore') { 
            if (state.user) enterBookstore(state.user.uid); 
            else showView('login');
        }
    };
});

// 3. Activity Feed
async function renderFeed() {
    state.feed.lastDoc = null;
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">로딩 중...</p>';
    
    if (state.feed.unsubscribe) state.feed.unsubscribe();

    state.feed.unsubscribe = db.collection("activities")
        .orderBy("createdAt", "desc")
        .limit(5)
        .onSnapshot((snapshot) => {
            feedList.innerHTML = '';
            if (snapshot.empty) {
                feedList.innerHTML = '<div class="card">활동이 없습니다.</div>';
                loadMoreBtn.classList.add('hidden');
                return;
            }
            snapshot.forEach(doc => {
                const card = createActivityCard(doc.data(), doc.id);
                feedList.appendChild(card);
            });
            state.feed.lastDoc = snapshot.docs[snapshot.docs.length - 1];
            loadMoreBtn.classList.remove('hidden');
            loadMoreBtn.disabled = false;
        });
}

async function loadMoreActivities() {
    if (!state.feed.lastDoc) return;
    loadMoreBtn.disabled = true;
    try {
        const snapshot = await db.collection("activities")
            .orderBy("createdAt", "desc")
            .startAfter(state.feed.lastDoc)
            .limit(5)
            .get();
        
        if (snapshot.empty) {
            loadMoreBtn.innerText = "마지막 활동입니다.";
            return;
        }
        const feedList = document.getElementById('activity-feed');
        snapshot.forEach(doc => {
            const card = createActivityCard(doc.data(), doc.id);
            feedList.appendChild(card);
        });
        state.feed.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        loadMoreBtn.disabled = false;
    } catch (e) { loadMoreBtn.disabled = false; }
}

function createActivityCard(act, id) {
    const div = document.createElement('div');
    div.className = 'card feed-item';
    const timeStr = act.createdAt ? new Date(act.createdAt.toDate()).toLocaleString() : '';
    const hasLongContent = act.content && act.content.length > 100;

    div.innerHTML = `
        <div style="margin-bottom:8px;">
            <span class="feed-user" onclick="enterBookstore('${act.uid}')">${act.nickname || '익명'}</span>님이 
            <strong>${act.bookTitle}</strong> 책에 
            ${act.type === 'record' ? '기록을 남겼습니다.' : '관심을 가졌습니다.'}
        </div>
        ${act.content ? `
            <div id="content-${id}" class="quote-box serif feed-content">${act.content}</div>
            ${hasLongContent ? `<button class="btn-detail" onclick="toggleDetail('${id}')">상세보기</button>` : ''}
        ` : ''}
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:12px;">${timeStr}</div>
    `;
    return div;
}

window.toggleDetail = (id) => {
    const content = document.getElementById(`content-${id}`);
    const btn = content.nextElementSibling;
    const isExpanded = content.classList.toggle('expanded');
    btn.innerText = isExpanded ? '접기' : '상세보기';
};

loadMoreBtn.onclick = loadMoreActivities;

// 4. People List
async function renderPeopleList() {
    const list = document.getElementById('people-list');
    list.innerHTML = '';
    const snap = await db.collection("users").orderBy("joinedAt", "desc").get();
    snap.forEach(doc => {
        const user = doc.data();
        const div = document.createElement('div');
        div.className = 'card';
        div.style.textAlign = 'center'; div.style.cursor = 'pointer';
        div.innerHTML = `<div style="font-size: 2rem;">📖</div><div>${user.nickname}</div>`;
        div.onclick = () => enterBookstore(user.uid);
        list.appendChild(div);
    });
}

// 5. Bookstore
async function enterBookstore(uid) {
    state.currentStoreOwner = uid;
    const ownerDoc = await db.collection("users").doc(uid).get();
    const ownerData = ownerDoc.data();
    state.currentStoreOwnerNickname = ownerData ? ownerData.nickname : '익명';

    const isOwner = (state.user && state.user.uid === uid);
    document.getElementById('user-greeting').innerText = isOwner ? "나의 책방" : `${state.currentStoreOwnerNickname}님의 책방`;
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    document.getElementById('edit-profile-btn').classList.toggle('hidden', !isOwner);
    
    showView('bookstore');
    renderBooks(uid);
}

async function renderBooks(ownerUid) {
    const list = document.getElementById('book-list');
    list.innerHTML = '';
    const snap = await db.collection("users").doc(ownerUid).collection("books").orderBy("createdAt", "desc").get();
    snap.forEach(doc => {
        const book = doc.data();
        const bid = doc.id;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><h3 class="serif" style="margin:0;">${book.title}</h3><p style="margin:4px 0; color:var(--text-muted);">${book.author}</p></div>
                <button class="btn btn-outline" onclick="openTracker('${bid}', '${book.title.replace(/'/g, "\\'")}')">
                    ${(state.user && state.user.uid === ownerUid) ? '읽기' : '구경'}
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

// 6. Tracker
window.openTracker = async (bid, title) => {
    state.currentBook = { id: bid, title: title };
    document.getElementById('current-book-title').innerText = title;
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    document.getElementById('timer-section').classList.toggle('hidden', !isOwner);
    document.getElementById('record-entry').classList.toggle('hidden', !isOwner);
    
    updateTimerUI();
    resetRecordInputs();
    showView('tracker');
    renderRecords();
    renderSessions();
};

document.getElementById('save-record-btn').onclick = async () => {
    if (!state.user) return alert('로그인이 필요합니다.');
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value || 0;
    const paragraph = document.getElementById('paragraph-input').value || 0;
    const line = document.getElementById('line-input').value || 0;
    if (!content) return;

    try {
        const recordsRef = db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("records");
        
        if (state.editingRecordId) {
            await recordsRef.doc(state.editingRecordId).update({ content, page, paragraph, line, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            const recordSnap = await recordsRef.doc(state.editingRecordId).get();
            const activityId = recordSnap.data().relatedActivityId;
            if (activityId) {
                await db.collection("activities").doc(activityId).update({ content, nickname: state.myNickname });
            }
            state.editingRecordId = null;
        } else {
            const activityId = await logActivity('record', content);
            await recordsRef.add({ 
                content, page, paragraph, line, 
                relatedActivityId: activityId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() 
            });
        }
        resetRecordInputs();
        renderRecords();
    } catch (e) { alert(e.message); }
};

async function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>독서 기록</h3>';
    const snap = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").orderBy("createdAt", "desc").get();
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    
    snap.forEach(doc => {
        const rec = doc.data();
        const rid = doc.id;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div class="quote-box serif">${rec.content}</div>
                ${isOwner ? `<div style="display:flex; gap:4px;">
                    <button class="btn btn-outline btn-small" onclick="startEditRecord('${rid}', \`${rec.content}\`, ${rec.page}, ${rec.paragraph}, ${rec.line})">수정</button>
                    <button class="btn btn-danger btn-small" onclick="deleteRecord('${rid}')">삭제</button>
                </div>` : ''}
            </div>
            <div style="margin-top:8px; font-size:0.8rem; color:var(--text-muted);">${rec.page}p ${rec.paragraph}문단 ${rec.line}줄</div>
        `;
        list.appendChild(div);
    });
}

async function renderSessions() {
    const list = document.getElementById('sessions-list');
    list.innerHTML = '<h3>독서 세션</h3>';
    const snap = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("sessions").orderBy("createdAt", "desc").get();
    if (snap.empty) {
        list.innerHTML += '<p style="color:var(--text-muted); font-size:0.9rem;">기록된 세션이 없습니다.</p>';
        return;
    }
    snap.forEach(doc => {
        const sess = doc.data();
        if (!sess.startTime || !sess.endTime) return;
        const start = sess.startTime.toDate();
        const end = sess.endTime.toDate();
        const duration = sess.duration;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        let durStr = "";
        if (hours > 0) durStr += `${hours}시간 `;
        if (minutes > 0) durStr += `${minutes}분 `;
        if (durStr === "" || seconds > 0) durStr += `${seconds}초`;
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '12px'; div.style.marginBottom = '8px'; div.style.fontSize = '0.85rem';
        div.innerHTML = `
            <div style="font-weight:700; color:var(--accent); margin-bottom:4px;">${start.toLocaleDateString()}</div>
            <div style="color:var(--text-main);">${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ~ ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div style="color:var(--text-muted); margin-top:4px;">⏱️ ${durStr}</div>
        `;
        list.appendChild(div);
    });
}

window.startEditRecord = (id, content, page, paragraph, line) => {
    state.editingRecordId = id;
    document.getElementById('record-input').value = content;
    document.getElementById('page-input').value = page;
    document.getElementById('paragraph-input').value = paragraph;
    document.getElementById('line-input').value = line;
    document.getElementById('save-record-btn').innerText = "수정 완료";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
    document.getElementById('record-entry').scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('cancel-edit-btn').onclick = () => resetRecordInputs();

function resetRecordInputs() {
    state.editingRecordId = null;
    document.getElementById('record-input').value = '';
    document.getElementById('page-input').value = '';
    document.getElementById('paragraph-input').value = '';
    document.getElementById('line-input').value = '';
    document.getElementById('save-record-btn').innerText = "기록하기";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

window.deleteRecord = async (rid) => {
    if (!confirm('삭제하시겠습니까? 휴지통으로 이동합니다.')) return;
    const ref = db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("records").doc(rid);
    const snap = await ref.get();
    await db.collection("users").doc(state.user.uid).collection("trash").add({ ...snap.data(), originalBookId: state.currentBook.id, deletedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await ref.delete();
    renderRecords();
};

async function logActivity(type, content) {
    if (!state.user || !state.currentBook) return null;
    const docRef = await db.collection("activities").add({ 
        uid: state.user.uid,
        nickname: state.myNickname,
        type, 
        bookTitle: state.currentBook.title, 
        content, 
        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
    });
    return docRef.id;
}

document.getElementById('add-book-btn').onclick = async () => {
    const title = prompt('제목:'); const author = prompt('저자:');
    if (title && author && state.user) {
        await db.collection("users").doc(state.user.uid).collection("books").add({ title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        logActivity('book', `새 책 추가`); renderBooks(state.user.uid);
    }
};

// 7. Timer & State Persistence (UID-specific)
function saveTimerState() {
    if (!state.user || !state.currentBook) return;
    const timerData = {
        seconds: state.timer.seconds,
        isRunning: state.timer.isRunning,
        startTime: state.timer.startTime,
        persistedSeconds: state.timer.persistedSeconds,
        book: state.currentBook,
        owner: state.currentStoreOwner,
        uid: state.user.uid
    };
    localStorage.setItem(`manread_timer_${state.user.uid}`, JSON.stringify(timerData));
}

function restoreTimerState() {
    if (!state.user) return;
    const saved = localStorage.getItem(`manread_timer_${state.user.uid}`);
    if (!saved) return;
    const data = JSON.parse(saved);
    state.currentBook = data.book;
    state.currentStoreOwner = data.owner;
    state.timer.isRunning = data.isRunning;
    state.timer.startTime = data.startTime;
    state.timer.persistedSeconds = data.persistedSeconds;
    if (state.timer.isRunning && state.timer.startTime) {
        const now = new Date().getTime();
        state.timer.seconds = Math.floor((now - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
        state.timer.interval = setInterval(() => {
            const currentTime = new Date().getTime();
            state.timer.seconds = Math.floor((currentTime - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay();
            saveTimerState();
        }, 1000);
    } else {
        state.timer.seconds = data.seconds;
    }
    updateTimerDisplay();
}

function clearTimerState() {
    if (state.user) localStorage.removeItem(`manread_timer_${state.user.uid}`);
}

function updateTimerDisplay() {
    const hours = Math.floor(state.timer.seconds / 3600);
    const minutes = Math.floor((state.timer.seconds % 3600) / 60);
    const seconds = state.timer.seconds % 60;
    const display = [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
    const timerElem = document.getElementById('timer');
    if (timerElem) timerElem.innerText = display;
    if (floatingTimerDisplay) floatingTimerDisplay.innerText = display;
}

function updateFloatingTimerVisibility() {
    if (!floatingTimer) return;
    const isTrackerView = !views.tracker.classList.contains('hidden');
    floatingTimer.classList.toggle('hidden', state.timer.seconds === 0 || isTrackerView);
    floatingTimer.classList.toggle('paused', !state.timer.isRunning);
    if (floatingTimerToggle) floatingTimerToggle.innerText = state.timer.isRunning ? "⏸️" : "▶️";
}

function toggleTimer() {
    if (state.timer.isRunning) {
        clearInterval(state.timer.interval);
        state.timer.isRunning = false;
        state.timer.persistedSeconds = state.timer.seconds;
        state.timer.startTime = null;
    } else {
        state.timer.isRunning = true;
        if (!state.timer.startTime) state.timer.startTime = new Date().getTime();
        state.timer.interval = setInterval(() => {
            const now = new Date().getTime();
            state.timer.seconds = Math.floor((now - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay();
            saveTimerState();
        }, 1000);
    }
    saveTimerState();
    updateTimerUI();
}

function updateTimerUI() {
    const btn = document.getElementById('timer-btn');
    if (btn) btn.innerText = state.timer.isRunning ? "일시 정지" : (state.timer.seconds > 0 ? "다시 시작" : "읽기 시작");
    updateTimerDisplay();
    updateFloatingTimerVisibility();
}

async function finishReading() {
    if (state.timer.seconds > 0) {
        let timeStr = `${Math.floor(state.timer.seconds/60)}분`;
        if (confirm(`${timeStr} 동안 읽으셨네요! 종료할까요?`)) {
            const sTime = new Date(new Date().getTime() - state.timer.seconds * 1000);
            await db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("sessions").add({
                startTime: firebase.firestore.Timestamp.fromDate(sTime),
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                duration: state.timer.seconds,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await logActivity('timer', `${timeStr} 동안 독서함`);
            if (state.timer.interval) clearInterval(state.timer.interval);
            state.timer = { interval: null, seconds: 0, isRunning: false, startTime: null, persistedSeconds: 0 };
            clearTimerState();
            updateTimerUI();
            renderSessions();
        }
    }
}

document.getElementById('back-to-store-btn').onclick = () => enterBookstore(state.currentStoreOwner);
document.getElementById('back-from-trash-btn').onclick = () => enterBookstore(state.user.uid);
document.getElementById('trash-btn').onclick = () => { showView('trash'); renderTrash(); };

async function renderTrash() {
    const list = document.getElementById('trash-list');
    list.innerHTML = '';
    const snap = await db.collection("users").doc(state.user.uid).collection("trash").orderBy("deletedAt", "desc").get();
    if (snap.empty) list.innerHTML = '<div class="card">비어 있음</div>';
    snap.forEach(doc => {
        const rec = doc.data();
        const tid = doc.id;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="quote-box serif">${rec.content}</div>
            <div style="margin-top:12px; display:flex; gap:8px;">
                <button class="btn btn-small" onclick="restoreRecord('${tid}')">복원</button>
                <button class="btn btn-danger btn-small" onclick="permanentlyDeleteRecord('${tid}')">영구 삭제</button>
            </div>`;
        list.appendChild(div);
    });
}

window.restoreRecord = async (tid) => {
    const ref = db.collection("users").doc(state.user.uid).collection("trash").doc(tid);
    const snap = await ref.get();
    const data = snap.data();
    await db.collection("users").doc(state.user.uid).collection("books").doc(data.originalBookId).collection("records").add({ ...data });
    await ref.delete();
    renderTrash();
};

window.permanentlyDeleteRecord = async (tid) => {
    if (confirm('영구 삭제하시겠습니까?')) {
        await db.collection("users").doc(state.user.uid).collection("trash").doc(tid).delete();
        renderTrash();
    }
};

if (floatingTimerDisplay) floatingTimerDisplay.onclick = (e) => { e.stopPropagation(); if (state.currentBook) openTracker(state.currentBook.id, state.currentBook.title); };
if (floatingTimerToggle) floatingTimerToggle.onclick = (e) => { e.stopPropagation(); toggleTimer(); };

const timerBtn = document.getElementById('timer-btn');
const finishBtn = document.getElementById('finish-btn');
if (timerBtn) timerBtn.onclick = toggleTimer;
if (finishBtn) finishBtn.onclick = finishReading;

init();
