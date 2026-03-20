// State Management
let state = {
    myNickname: localStorage.getItem('manread_nickname') || '',
    currentStoreOwner: null,
    currentBook: null,
    editingRecordId: null,
    timer: { 
        interval: null, 
        seconds: 0, 
        isRunning: false, 
        startTime: null,
        persistedSeconds: 0 // 이전 세션까지의 누적 초
    }
};

let db;

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
const floatingTimer = document.getElementById('floating-timer');
const floatingTimerDisplay = document.getElementById('floating-timer-display');

// Initialize App
function init() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp({ projectId: "manread-74612" });
        }
        db = firebase.firestore();
        
        // 타이머 상태 복구
        restoreTimerState();
        
        startApp();
    } catch (e) {
        console.error("Init failed:", e);
    }
}

function startApp() {
    if (state.myNickname) {
        showView('feed');
        renderFeed();
    } else {
        showView('login');
    }
}

function showView(viewName) {
    Object.keys(views).forEach(v => {
        if (views[v]) views[v].classList.toggle('hidden', v !== viewName);
    });
    if (nav) nav.classList.toggle('hidden', viewName === 'login');
    
    // 뷰 이동 시 플로팅 타이머 노출 제어
    updateFloatingTimerVisibility();
}

function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === activeView);
    });
}

// 1. Login/Join
document.getElementById('login-btn').onclick = async () => {
    const input = document.getElementById('nickname-input');
    const nickname = input.value.trim();
    if (!nickname) return;
    try {
        await db.collection("users").doc(nickname).set({ nickname, joinedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        state.myNickname = nickname;
        localStorage.setItem('manread_nickname', nickname);
        showView('feed');
        updateNavUI('feed');
        renderFeed();
    } catch (e) { alert(e.message); }
};

// 2. Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        const view = item.dataset.view;
        updateNavUI(view);
        if (view === 'feed') { showView('feed'); renderFeed(); }
        else if (view === 'people') { showView('people'); renderPeopleList(); }
        else if (view === 'bookstore') { enterBookstore(state.myNickname); }
    };
});

// 3. Activity Feed
async function renderFeed() {
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">로딩 중...</p>';
    try {
        const querySnapshot = await db.collection("activities").orderBy("createdAt", "desc").limit(20).get();
        feedList.innerHTML = '';
        if (querySnapshot.empty) feedList.innerHTML = '<div class="card">활동이 없습니다.</div>';
        querySnapshot.forEach(doc => {
            const act = doc.data();
            const div = document.createElement('div');
            div.className = 'card feed-item';
            div.innerHTML = `
                <div><span class="feed-user" onclick="enterBookstore('${act.user}')">${act.user}</span>님이 <strong>${act.bookTitle}</strong> 책에 
                ${act.type === 'record' ? '기록을 남겼습니다.' : '관심을 가졌습니다.'}</div>
                ${act.content ? `<div class="quote-box serif">${act.content}</div>` : ''}
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">${act.createdAt ? new Date(act.createdAt.toDate()).toLocaleString() : ''}</div>
            `;
            feedList.appendChild(div);
        });
    } catch (e) { feedList.innerHTML = '<p>로드 실패</p>'; }
}

// 4. People List
document.getElementById('register-person-btn').onclick = async () => {
    const nickname = prompt('등록할 닉네임:');
    if (!nickname) return;
    const userRef = db.collection("users").doc(nickname);
    const snap = await userRef.get();
    if (snap.exists) { alert("이미 존재합니다."); return; }
    await userRef.set({ nickname, joinedAt: firebase.firestore.FieldValue.serverTimestamp() });
    renderPeopleList();
};

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
        div.onclick = () => enterBookstore(user.nickname);
        list.appendChild(div);
    });
}

// 5. Bookstore
async function enterBookstore(nickname) {
    state.currentStoreOwner = nickname;
    document.getElementById('user-greeting').innerText = (nickname === state.myNickname) ? "나의 책방" : `${nickname}님의 책방`;
    const isOwner = (nickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    showView('bookstore');
    if (isOwner) updateNavUI('bookstore'); else updateNavUI('people');
    renderBooks(nickname);
}

async function renderBooks(owner) {
    const list = document.getElementById('book-list');
    list.innerHTML = '';
    const snap = await db.collection("users").doc(owner).collection("books").orderBy("createdAt", "desc").get();
    snap.forEach(doc => {
        const book = doc.data();
        const bid = doc.id;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><h3 class="serif" style="margin:0;">${book.title}</h3><p style="margin:4px 0; color:var(--text-muted);">${book.author}</p></div>
                <button class="btn btn-outline" onclick="openTracker('${bid}', '${book.title.replace(/'/g, "\\'")}')">
                    ${owner === state.myNickname ? '읽기' : '구경'}
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
    const isOwner = (state.currentStoreOwner === state.myNickname);
    document.getElementById('timer-section').classList.toggle('hidden', !isOwner);
    document.getElementById('record-entry').classList.toggle('hidden', !isOwner);
    
    // 타이머 상태 UI 업데이트
    updateTimerUI();

    resetRecordInputs();
    showView('tracker');
    renderRecords();
    renderSessions();
};

document.getElementById('save-record-btn').onclick = async () => {
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value || 0;
    const paragraph = document.getElementById('paragraph-input').value || 0;
    const line = document.getElementById('line-input').value || 0;
    if (!content) return;

    try {
        const recordsRef = db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records");
        if (state.editingRecordId) {
            await recordsRef.doc(state.editingRecordId).update({ content, page, paragraph, line, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            state.editingRecordId = null;
        } else {
            await recordsRef.add({ content, page, paragraph, line, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            await logActivity('record', content);
        }
        resetRecordInputs();
        renderRecords();
    } catch (e) { alert(e.message); }
};

async function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>독서 기록</h3>';
    const isOwner = (state.currentStoreOwner === state.myNickname);
    const snap = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").orderBy("createdAt", "desc").get();
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
        div.style.padding = '12px';
        div.style.marginBottom = '8px';
        div.style.fontSize = '0.85rem';
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
    const ref = db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records").doc(rid);
    const snap = await ref.get();
    await db.collection("users").doc(state.myNickname).collection("trash").add({ ...snap.data(), originalBookId: state.currentBook.id, deletedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await ref.delete();
    renderRecords();
};

// 7. Trash
document.getElementById('trash-btn').onclick = () => { showView('trash'); renderTrash(); };
document.getElementById('back-from-trash-btn').onclick = () => enterBookstore(state.myNickname);

async function renderTrash() {
    const list = document.getElementById('trash-list');
    list.innerHTML = '';
    const snap = await db.collection("users").doc(state.myNickname).collection("trash").orderBy("deletedAt", "desc").get();
    if (snap.empty) list.innerHTML = '<div class="card">비어 있음</div>';
    snap.forEach(doc => {
        const rec = doc.data();
        const tid = doc.id;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="quote-box serif">${rec.content}</div>
            <div style="margin-top:12px; display:flex; gap:8px;">
                <button class="btn btn-small" onclick="restoreRecord('${tid}')">복원</button>
                <button class="btn btn-danger btn-small" onclick="permanentlyDeleteRecord('${tid}')">영구 삭제</button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.restoreRecord = async (tid) => {
    const ref = db.collection("users").doc(state.myNickname).collection("trash").doc(tid);
    const snap = await ref.get();
    const data = snap.data();
    await db.collection("users").doc(state.myNickname).collection("books").doc(data.originalBookId).collection("records").add({ ...data });
    await ref.delete();
    renderTrash();
    alert('복원되었습니다.');
};

window.permanentlyDeleteRecord = async (tid) => {
    if (!confirm('영구 삭제하시겠습니까?')) return;
    await db.collection("users").doc(state.myNickname).collection("trash").doc(tid).delete();
    renderTrash();
};

async function logActivity(type, content) {
    if (!state.currentBook) return;
    await db.collection("activities").add({ user: state.myNickname, type, bookTitle: state.currentBook.title, content, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}

document.getElementById('add-book-btn').onclick = async () => {
    const title = prompt('제목:'); const author = prompt('저자:');
    if (title && author) {
        await db.collection("users").doc(state.myNickname).collection("books").add({ title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        logActivity('book', `새 책 추가`); renderBooks(state.myNickname);
    }
};

document.getElementById('back-to-store-btn').onclick = () => enterBookstore(state.currentStoreOwner);
window.enterBookstore = enterBookstore;

// 8. Timer Logic
function updateTimerDisplay() {
    const hours = Math.floor(state.timer.seconds / 3600);
    const minutes = Math.floor((state.timer.seconds % 3600) / 60);
    const seconds = state.timer.seconds % 60;
    const display = [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
    
    // 메인 타이머 업데이트 (현재 뷰가 tracker일 때)
    const timerElem = document.getElementById('timer');
    if (timerElem) timerElem.innerText = display;
    
    // 플로팅 타이머 업데이트
    if (floatingTimerDisplay) floatingTimerDisplay.innerText = display;
}

function updateFloatingTimerVisibility() {
    if (!floatingTimer) return;
    // 타이머가 작동 중이고, 현재 tracker 뷰가 아닐 때만 노출
    const isTrackerView = !views.tracker.classList.contains('hidden');
    floatingTimer.classList.toggle('hidden', !state.timer.isRunning || isTrackerView);
}

function toggleTimer() {
    const btn = document.getElementById('timer-btn');
    if (state.timer.isRunning) {
        // 일시 정지
        clearInterval(state.timer.interval);
        state.timer.isRunning = false;
        state.timer.persistedSeconds = state.timer.seconds; // 현재까지 누적된 시간 저장
        state.timer.startTime = null;
        if (btn) btn.innerText = "다시 시작";
    } else {
        // 시작 / 다시 시작
        state.timer.isRunning = true;
        if (!state.timer.startTime) {
            state.timer.startTime = new Date().getTime();
        }
        if (btn) btn.innerText = "일시 정지";
        
        state.timer.interval = setInterval(() => {
            const now = new Date().getTime();
            // (현재 시간 - 시작 시간) / 1000 + 이전에 누적된 시간
            state.timer.seconds = Math.floor((now - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay();
            saveTimerState(); // 매 초마다 로컬에 저장 (안정성)
        }, 1000);
    }
    saveTimerState();
    updateFloatingTimerVisibility();
}

function updateTimerUI() {
    const btn = document.getElementById('timer-btn');
    if (!btn) return;
    
    if (state.timer.isRunning) {
        btn.innerText = "일시 정지";
    } else {
        btn.innerText = state.timer.seconds > 0 ? "다시 시작" : "읽기 시작";
    }
    updateTimerDisplay();
}

async function finishReading() {
    if (state.timer.seconds > 0) {
        const hours = Math.floor(state.timer.seconds / 3600);
        const minutes = Math.floor((state.timer.seconds % 3600) / 60);
        let timeStr = "";
        if (hours > 0) timeStr += `${hours}시간 `;
        if (minutes > 0) timeStr += `${minutes}분 `;
        if (timeStr === "") timeStr = "1분 미만";
        
        if (confirm(`${timeStr} 동안 읽으셨네요! 독서를 종료할까요?`)) {
            // Save session
            try {
                // 시작 시간 복구 (현재 시간에서 경과 시간 뺌)
                const sTime = new Date(new Date().getTime() - state.timer.seconds * 1000);
                const sessionsRef = db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("sessions");
                await sessionsRef.add({
                    startTime: firebase.firestore.Timestamp.fromDate(sTime),
                    endTime: firebase.firestore.FieldValue.serverTimestamp(),
                    duration: state.timer.seconds,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) { console.error("Session save failed:", e); }

            await logActivity('timer', `${timeStr} 동안 독서함`);
            
            // 타이머 초기화
            if (state.timer.interval) clearInterval(state.timer.interval);
            state.timer = { interval: null, seconds: 0, isRunning: false, startTime: null, persistedSeconds: 0 };
            
            clearTimerState();
            updateTimerUI();
            updateFloatingTimerVisibility();
            renderSessions();
        }
    } else {
        alert("아직 독서를 시작하지 않았습니다.");
    }
}

// 로컬 스토리지 연동
function saveTimerState() {
    if (!state.currentBook) return;
    const timerData = {
        seconds: state.timer.seconds,
        isRunning: state.timer.isRunning,
        startTime: state.timer.startTime,
        persistedSeconds: state.timer.persistedSeconds,
        book: state.currentBook,
        owner: state.currentStoreOwner,
        lastUpdated: new Date().getTime()
    };
    localStorage.setItem('manread_timer_state', JSON.stringify(timerData));
}

function restoreTimerState() {
    const saved = localStorage.getItem('manread_timer_state');
    if (!saved) return;
    
    const data = JSON.parse(saved);
    state.currentBook = data.book;
    state.currentStoreOwner = data.owner;
    state.timer.isRunning = data.isRunning;
    state.timer.startTime = data.startTime;
    state.timer.persistedSeconds = data.persistedSeconds;
    state.timer.seconds = data.seconds;

    if (state.timer.isRunning && state.timer.startTime) {
        // 브라우저 닫혀있던 시간만큼 보정
        const now = new Date().getTime();
        state.timer.seconds = Math.floor((now - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
        
        // 타이머 재시작
        state.timer.interval = setInterval(() => {
            const currentTime = new Date().getTime();
            state.timer.seconds = Math.floor((currentTime - state.timer.startTime) / 1000) + state.timer.persistedSeconds;
            updateTimerDisplay();
            saveTimerState();
        }, 1000);
        
        updateTimerDisplay();
    }
}

function clearTimerState() {
    localStorage.removeItem('manread_timer_state');
}

// 플로팅 타이머 클릭 시 해당 책의 트래커로 이동
if (floatingTimer) {
    floatingTimer.onclick = () => {
        if (state.currentBook) {
            openTracker(state.currentBook.id, state.currentBook.title);
        }
    };
}

const timerBtn = document.getElementById('timer-btn');
const finishBtn = document.getElementById('finish-btn');
if (timerBtn) timerBtn.onclick = toggleTimer;
if (finishBtn) finishBtn.onclick = finishReading;

init();
