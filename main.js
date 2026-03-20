// State Management
let state = {
    user: null, // { uid: string, nickname: string }
    myNickname: '익명',
    myColor: '#f8f9fa', // 기본 색상
    currentStoreOwner: null,
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
    },
    isAdmin: false
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
        } else {
            showView('login');
            showLoading(false);
        }

        renderAnnouncements();

    } catch (e) {
        console.error("Init failed:", e);
    }
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
            const userData = {
                uid: newUserRef.id,
                nickname: nickname,
                color: '#f8f9fa',
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await newUserRef.set(userData);
            state.user = { uid: newUserRef.id, nickname: nickname };
            state.myNickname = nickname;
            state.myColor = '#f8f9fa';
        }
        
        localStorage.setItem('manread_user_nickname', state.myNickname);
        state.isAdmin = (nickname === 'admin');
        if (navAdmin) navAdmin.classList.toggle('hidden', !state.isAdmin);
        
        restoreTimerState();
        showView('feed');
        renderFeed();
        updateNavUI('feed');
    } catch (e) {
        console.error("Login failed:", e);
        logout();
    } finally {
        showLoading(false);
    }
}

function showView(viewName) {
    Object.keys(views).forEach(v => {
        if (views[v]) views[v].classList.toggle('hidden', v !== viewName);
    });
    if (nav) nav.classList.toggle('hidden', viewName === 'login');
    updateFloatingTimerVisibility();
}

function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === activeView);
    });
}

// Settings Modal Logic
const settingsModal = document.getElementById('settings-modal');
let selectedColor = '#f8f9fa';

document.getElementById('open-settings-btn').onclick = () => {
    if (!state.user) return;
    document.getElementById('settings-nickname-input').value = state.myNickname;
    selectedColor = state.myColor;
    updateColorPaletteUI();
    settingsModal.classList.remove('hidden');
};

document.getElementById('close-settings-btn').onclick = () => settingsModal.classList.add('hidden');

document.querySelectorAll('.color-item').forEach(item => {
    item.onclick = () => {
        selectedColor = item.dataset.color;
        updateColorPaletteUI();
    };
});

function updateColorPaletteUI() {
    document.querySelectorAll('.color-item').forEach(item => {
        const isSelected = item.dataset.color === selectedColor;
        item.style.border = isSelected ? '3px solid var(--accent)' : (item.dataset.color === '#f8f9fa' ? '2px solid #eee' : '2px solid transparent');
        item.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
    });
}

document.getElementById('save-settings-btn').onclick = async () => {
    const newName = document.getElementById('settings-nickname-input').value.trim();
    if (!newName) return alert('아이디를 입력해주세요.');

    showLoading(true, "설정을 저장하고 있습니다...");
    try {
        const batch = db.batch();
        const userRef = db.collection("users").doc(state.user.uid);
        
        // 닉네임 변경 시 중복 체크
        if (newName !== state.myNickname) {
            const snap = await db.collection("users").where("nickname", "==", newName).limit(1).get();
            if (!snap.empty) {
                alert('이미 사용 중인 아이디입니다.');
                showLoading(false);
                return;
            }
            
            // 기존 활동 내역 닉네임 일괄 업데이트
            const activitiesSnap = await db.collection("activities").where("uid", "==", state.user.uid).get();
            activitiesSnap.forEach(doc => {
                batch.update(doc.ref, { nickname: newName, color: selectedColor });
            });
        } else {
            // 색상만 변경 시에도 활동 내역 업데이트
            const activitiesSnap = await db.collection("activities").where("uid", "==", state.user.uid).get();
            activitiesSnap.forEach(doc => {
                batch.update(doc.ref, { color: selectedColor });
            });
        }

        batch.update(userRef, { nickname: newName, color: selectedColor });
        await batch.commit();

        state.myNickname = newName;
        state.myColor = selectedColor;
        state.user.nickname = newName;
        localStorage.setItem('manread_user_nickname', newName);
        
        alert('설정이 저장되었습니다.');
        settingsModal.classList.add('hidden');
        enterBookstore(state.user.uid); // UI 갱신
    } catch (e) {
        alert(e.message);
    } finally {
        showLoading(false);
    }
};

// Auth Actions
document.getElementById('login-btn').onclick = () => {
    const nickname = document.getElementById('login-nickname-input').value;
    if (!nickname) return alert('아이디(닉네임)를 입력해주세요.');
    handleLogin(nickname);
};

function logout() {
    state.user = null;
    state.myNickname = '익명';
    state.isAdmin = false;
    if (navAdmin) navAdmin.classList.add('hidden');
    localStorage.removeItem('manread_user_nickname');
    showView('login');
}

document.getElementById('logout-btn').onclick = () => {
    if (confirm('로그아웃 하시겠습니까?')) logout();
};

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
    } catch (e) {
        alert("삭제 중 오류 발생: " + e.message);
    } finally {
        showLoading(false);
    }
}

document.getElementById('delete-account-btn').onclick = deleteAccount;

// Navigation
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
        else if (view === 'admin') {
            if (state.isAdmin) { showView('admin'); renderAdminDashboard(); }
            else { alert('권한이 없습니다.'); showView('feed'); }
        }
    };
});

// Activity Feed
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
        });
}

async function loadMoreActivities() {
    if (!state.feed.lastDoc) return;
    loadMoreBtn.disabled = true;
    try {
        const snapshot = await db.collection("activities")
            .orderBy("createdAt", "desc")
            .startAfter(state.feed.lastDoc)
            .limit(10)
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

    const isMe = state.user && act.uid === state.user.uid;
    const authorName = isMe ? `${act.nickname || state.myNickname} (나)` : (act.nickname || '익명');
    const userColor = act.color || '#f8f9fa';
    
    // 디자인 개선: 좌측에 사용자 고유 색상 바 추가
    div.style.borderLeft = `6px solid ${userColor}`;

    div.innerHTML = `
        <div style="margin-bottom:8px;">
            <span class="feed-user" style="font-weight:700;" onclick="enterBookstore('${act.uid}')">${authorName}</span>님이 
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

// People List
async function renderPeopleList() {
    const list = document.getElementById('people-list');
    list.innerHTML = '';
    const snap = await db.collection("users").orderBy("joinedAt", "desc").get();
    snap.forEach(doc => {
        const user = doc.data();
        const div = document.createElement('div');
        div.className = 'card';
        const isMe = state.user && doc.id === state.user.uid;
        const displayName = isMe ? `${user.nickname} (나)` : (user.nickname || '익명');
        const userColor = user.color || '#f8f9fa';
        
        div.setAttribute('style', `text-align: center; cursor: pointer; border-bottom: 4px solid ${userColor};`);
        div.innerHTML = `<div style="font-size: 2rem;">📖</div><div style="font-weight:600;">${displayName}</div>`;
        div.onclick = () => enterBookstore(doc.id);
        list.appendChild(div);
    });
}

// Bookstore
async function enterBookstore(uid) {
    state.currentStoreOwner = uid;
    const ownerDoc = await db.collection("users").doc(uid).get();
    const ownerData = ownerDoc.data();
    state.currentStoreOwnerNickname = ownerData ? ownerData.nickname : '익명';
    const ownerColor = ownerData ? (ownerData.color || '#f8f9fa') : '#f8f9fa';

    const isOwner = (state.user && state.user.uid === uid);
    document.getElementById('user-greeting').innerText = isOwner ? "나의 책방" : `${state.currentStoreOwnerNickname}님의 책방`;
    document.getElementById('user-greeting').style.borderBottom = `3px solid ${ownerColor}`;
    
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    document.getElementById('open-settings-btn').classList.toggle('hidden', !isOwner);
    
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

// Tracker
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
                await db.collection("activities").doc(activityId).update({ content, nickname: state.myNickname, color: state.myColor });
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
    const isOwner = (state.user && state.currentStoreOwner === state.user.uid);
    if (snap.empty) {
        list.innerHTML += '<p style="color:var(--text-muted); font-size:0.9rem;">기록된 세션이 없습니다.</p>';
        return;
    }
    snap.forEach(doc => {
        const sess = doc.data();
        const sid = doc.id;
        if (!sess.startTime || !sess.endTime) return;
        const start = sess.startTime.toDate();
        const duration = sess.duration;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        let durStr = hours > 0 ? `${hours}시간 ` : "";
        durStr += minutes > 0 ? `${minutes}분 ` : "";
        durStr += (durStr === "" || seconds > 0) ? `${seconds}초` : "";
        const div = document.createElement('div');
        div.className = 'card'; div.style.position = 'relative';
        div.innerHTML = `
            <div style="font-weight:700; color:var(--accent); margin-bottom:4px;">${start.toLocaleDateString()}</div>
            <div style="color:var(--text-main); font-size:0.85rem;">⏱️ ${durStr}</div>
            ${isOwner ? `<button class="btn-icon" style="position:absolute; top:8px; right:8px; font-size:0.9rem; opacity:0.6;" onclick="deleteSession('${sid}', '${sess.relatedActivityId || ''}')">🗑️</button>` : ''}
        `;
        list.appendChild(div);
    });
}

window.deleteSession = async (sid, activityId) => {
    if (!confirm('기록을 삭제할까요?')) return;
    try {
        showLoading(true, "기록을 삭제 중...");
        const batch = db.batch();
        batch.delete(db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("sessions").doc(sid));
        if (activityId) batch.delete(db.collection("activities").doc(activityId));
        await batch.commit(); renderSessions();
    } catch (e) { alert(e.message); } finally { showLoading(false); }
};

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
    await ref.delete(); renderRecords();
};

async function logActivity(type, content) {
    if (!state.user || !state.currentBook) return null;
    const docRef = await db.collection("activities").add({ 
        uid: state.user.uid,
        nickname: state.myNickname,
        color: state.myColor,
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

// Timer logic
function saveTimerState() {
    if (!state.user || !state.currentBook) return;
    const timerData = { seconds: state.timer.seconds, isRunning: state.timer.isRunning, startTime: state.timer.startTime, persistedSeconds: state.timer.persistedSeconds, book: state.currentBook, owner: state.currentStoreOwner, uid: state.user.uid };
    localStorage.setItem(`manread_timer_${state.user.uid}`, JSON.stringify(timerData));
}

function restoreTimerState() {
    if (!state.user) return;
    const saved = localStorage.getItem(`manread_timer_${state.user.uid}`);
    if (!saved) return;
    const data = JSON.parse(saved);
    state.currentBook = data.book; state.currentStoreOwner = data.owner; state.timer.isRunning = data.isRunning; state.timer.startTime = data.startTime; state.timer.persistedSeconds = data.persistedSeconds;
    if (state.timer.isRunning && state.timer.startTime) {
        const now = new Date().getTime();
        state.timer.seconds = Math.floor((now - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
        state.timer.interval = setInterval(() => {
            state.timer.seconds = Math.floor((new Date().getTime() - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay(); saveTimerState();
        }, 1000);
    } else { state.timer.seconds = data.seconds; }
    updateTimerDisplay();
}

function clearTimerState() { if (state.user) localStorage.removeItem(`manread_timer_${state.user.uid}`); }
function updateTimerDisplay() {
    const hours = Math.floor(state.timer.seconds / 3600); const minutes = Math.floor((state.timer.seconds % 3600) / 60); const seconds = state.timer.seconds % 60;
    const display = [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
    if (document.getElementById('timer')) document.getElementById('timer').innerText = display;
    if (floatingTimerDisplay) floatingTimerDisplay.innerText = display;
}

function updateFloatingTimerVisibility() {
    if (!floatingTimer) return;
    const isTrackerView = views.tracker && !views.tracker.classList.contains('hidden');
    floatingTimer.classList.toggle('hidden', state.timer.seconds === 0 || isTrackerView);
    if (floatingTimerToggle) floatingTimerToggle.innerText = state.timer.isRunning ? "⏸️" : "▶️";
}

function toggleTimer() {
    if (state.timer.isRunning) {
        clearInterval(state.timer.interval); state.timer.isRunning = false; state.timer.persistedSeconds = state.timer.seconds; state.timer.startTime = null;
    } else {
        state.timer.isRunning = true; if (!state.timer.startTime) state.timer.startTime = new Date().getTime();
        state.timer.interval = setInterval(() => {
            state.timer.seconds = Math.floor((new Date().getTime() - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay(); saveTimerState();
        }, 1000);
    }
    saveTimerState(); updateTimerUI();
}

function updateTimerUI() {
    const btn = document.getElementById('timer-btn');
    if (btn) btn.innerText = state.timer.isRunning ? "일시 정지" : (state.timer.seconds > 0 ? "다시 시작" : "읽기 시작");
    updateTimerDisplay(); updateFloatingTimerVisibility();
}

async function finishReading() {
    if (state.timer.seconds > 0) {
        let timeStr = `${Math.floor(state.timer.seconds/60)}분`;
        if (confirm(`${timeStr} 동안 읽으셨네요! 종료할까요?`)) {
            const activityId = await logActivity('timer', `${timeStr} 동안 독서함`);
            await db.collection("users").doc(state.user.uid).collection("books").doc(state.currentBook.id).collection("sessions").add({
                startTime: firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() - state.timer.seconds * 1000)),
                endTime: firebase.firestore.FieldValue.serverTimestamp(),
                duration: state.timer.seconds, relatedActivityId: activityId, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (state.timer.interval) clearInterval(state.timer.interval);
            state.timer = { interval: null, seconds: 0, isRunning: false, startTime: null, persistedSeconds: 0 };
            clearTimerState(); updateTimerUI(); renderSessions();
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
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="quote-box serif">${rec.content}</div>
            <div style="margin-top:12px; display:flex; gap:8px;">
                <button class="btn btn-small" onclick="restoreRecord('${doc.id}')">복원</button>
                <button class="btn btn-danger btn-small" onclick="permanentlyDeleteRecord('${doc.id}')">영구 삭제</button>
            </div>`;
        list.appendChild(div);
    });
}

window.restoreRecord = async (tid) => {
    const ref = db.collection("users").doc(state.user.uid).collection("trash").doc(tid);
    const snap = await ref.get(); const data = snap.data();
    await db.collection("users").doc(state.user.uid).collection("books").doc(data.originalBookId).collection("records").add({ ...data });
    await ref.delete(); renderTrash();
};

window.permanentlyDeleteRecord = async (tid) => {
    if (confirm('영구 삭제하시겠습니까?')) {
        await db.collection("users").doc(state.user.uid).collection("trash").doc(tid).delete();
        renderTrash();
    }
};

// Admin Functions
async function renderAdminDashboard() {
    if (!state.isAdmin) return;
    const todayTs = firebase.firestore.Timestamp.fromDate(new Date(new Date().setHours(0,0,0,0)));
    const usersSnap = await db.collection("users").get();
    document.getElementById('stat-new-users').innerText = usersSnap.docs.filter(d => d.data().joinedAt && d.data().joinedAt.toDate() >= todayTs.toDate()).length;
    const actsSnap = await db.collection("activities").where("createdAt", ">=", todayTs).get();
    document.getElementById('stat-new-posts').innerText = actsSnap.size;
    document.getElementById('stat-active-readers').innerText = "1+"; 
    renderAdminActivities(); renderAdminUsers();
}

async function renderAdminActivities() {
    const list = document.getElementById('admin-activity-list');
    list.innerHTML = '<h3>최신 게시물 관리</h3>';
    const snap = await db.collection("activities").orderBy("createdAt", "desc").limit(50).get();
    snap.forEach(doc => {
        const act = doc.data();
        const div = document.createElement('div'); div.className = 'card'; div.style.fontSize = '0.8rem';
        div.innerHTML = `<div style="display:flex; justify-content:space-between;"><div><strong>${act.nickname}</strong>: ${act.content || act.type}</div>
            <button class="btn btn-danger btn-small" onclick="deleteActivityAdmin('${doc.id}')">삭제</button></div>`;
        list.appendChild(div);
    });
}

window.deleteActivityAdmin = async (id) => { if (confirm('삭제하시겠습니까?')) { await db.collection("activities").doc(id).delete(); renderAdminActivities(); } };

async function renderAdminUsers() {
    const list = document.getElementById('admin-user-list'); list.innerHTML = '';
    const snap = await db.collection("users").orderBy("joinedAt", "desc").get();
    snap.forEach(doc => {
        const user = doc.data(); const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:10px;">${user.nickname}</td><td style="padding:10px;">${user.joinedAt?user.joinedAt.toDate().toLocaleDateString():'-'}</td>
            <td style="padding:10px; display:flex; gap:4px;"><button class="btn btn-small" onclick="editUserAdmin('${doc.id}', '${user.nickname}')">수정</button>
            <button class="btn btn-danger btn-small" onclick="blockUserAdmin('${doc.id}')">차단</button></td>`;
        list.appendChild(tr);
    });
}

window.editUserAdmin = async (uid, oldName) => {
    const newName = prompt('새 닉네임:', oldName);
    if (newName && newName !== oldName) { await db.collection("users").doc(uid).update({ nickname: newName }); renderAdminUsers(); }
};

window.blockUserAdmin = async (uid) => { if (confirm('차단하시겠습니까?')) { await db.collection("users").doc(uid).delete(); renderAdminUsers(); } };

document.getElementById('save-announcement-btn').onclick = async () => {
    const content = document.getElementById('admin-announcement-input').value.trim();
    if (content) { await db.collection("announcements").add({ content, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); document.getElementById('admin-announcement-input').value = ''; alert('공지 등록됨'); renderAnnouncements(); }
};

async function renderAnnouncements() {
    const area = document.getElementById('announcement-area');
    const snap = await db.collection("announcements").orderBy("createdAt", "desc").limit(1).get();
    if (snap.empty) { area.innerHTML = ''; return; }
    area.innerHTML = `<div class="card" style="background: #fff9db; border: 1px solid #fcc419; padding: 12px; margin-bottom: 15px;"><div style="font-weight:700; color:#e67700; margin-bottom:5px;">📢 마을 공지</div><div>${snap.docs[0].data().content}</div></div>`;
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.onclick = () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('btn-outline', b !== btn));
        document.getElementById('admin-tab-content').classList.toggle('hidden', tab !== 'content');
        document.getElementById('admin-tab-users').classList.toggle('hidden', tab !== 'users');
    };
});

if (floatingTimerDisplay) floatingTimerDisplay.onclick = (e) => { e.stopPropagation(); if (state.currentBook) openTracker(state.currentBook.id, state.currentBook.title); };
if (floatingTimerToggle) floatingTimerToggle.onclick = (e) => { e.stopPropagation(); toggleTimer(); };
const timerBtn = document.getElementById('timer-btn'); const finishBtn = document.getElementById('finish-btn');
if (timerBtn) timerBtn.onclick = toggleTimer; if (finishBtn) finishBtn.onclick = finishReading;

init();
