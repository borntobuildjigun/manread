// State Management
let state = {
    myNickname: localStorage.getItem('manread_nickname') || '',
    currentStoreOwner: null,
    currentBook: null,
    timer: { interval: null, seconds: 0, isRunning: false }
};

let db;

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    feed: document.getElementById('feed-view'),
    people: document.getElementById('people-view'),
    bookstore: document.getElementById('bookstore-view'),
    tracker: document.getElementById('tracker-view')
};
const nav = document.getElementById('bottom-nav');

// Initialize App
function init() {
    console.log("App Initializing...");
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp({ projectId: "manread-74612" });
        }
        db = firebase.firestore();
        console.log("Firebase Connected");
        startApp();
    } catch (e) {
        console.error("Firebase init failed:", e);
        alert("연결 오류가 발생했습니다. 새로고침을 부탁드립니다.");
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
}

// Helper: UI Active State for Nav
function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === activeView);
    });
}

// 1. Login/Join
document.getElementById('login-btn').addEventListener('click', async () => {
    if (!db) return;
    const input = document.getElementById('nickname-input');
    const nickname = input.value.trim();
    if (!nickname) {
        alert("닉네임을 입력해주세요.");
        return;
    }

    try {
        await db.collection("users").doc(nickname).set({ 
            nickname, joinedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
        
        state.myNickname = nickname;
        localStorage.setItem('manread_nickname', nickname);
        showView('feed');
        updateNavUI('feed');
        renderFeed();
    } catch (e) {
        alert("참여 중 오류 발생: " + e.message);
    }
});

// 2. Navigation Control
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (!db) return;
        const view = item.dataset.view;
        updateNavUI(view);
        
        if (view === 'feed') {
            showView('feed');
            renderFeed();
        } else if (view === 'people') {
            showView('people');
            renderPeopleList();
        } else if (view === 'bookstore') {
            enterBookstore(state.myNickname);
        }
    });
});

// 3. Activity Feed
async function renderFeed() {
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">활동을 불러오는 중...</p>';
    
    try {
        const querySnapshot = await db.collection("activities").orderBy("createdAt", "desc").limit(20).get();
        feedList.innerHTML = '';
        
        if (querySnapshot.empty) {
            feedList.innerHTML = '<div class="card" style="text-align:center;">첫 독서 활동을 남겨보세요!</div>';
        }

        querySnapshot.forEach(doc => {
            const act = doc.data();
            const div = document.createElement('div');
            div.className = 'card feed-item';
            div.innerHTML = `
                <div>
                    <span class="feed-user" onclick="enterBookstore('${act.user}')">${act.user}</span>님이 
                    <strong>${act.bookTitle}</strong> 책에 
                    ${act.type === 'record' ? '기록을 남겼습니다.' : '관심을 가졌습니다.'}
                </div>
                ${act.content ? `<div class="quote-box serif">${act.content}</div>` : ''}
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">
                    ${act.createdAt ? new Date(act.createdAt.toDate()).toLocaleString() : '방금 전'}
                </div>
            `;
            feedList.appendChild(div);
        });
    } catch (e) {
        feedList.innerHTML = '<p>피드 로드 실패</p>';
    }
}

// 4. People List (마을 사람들)
document.getElementById('register-person-btn').addEventListener('click', async () => {
    if (!db) return;
    const nickname = prompt('등록할 이웃의 닉네임을 입력하세요:');
    if (!nickname) return;

    try {
        const userRef = db.collection("users").doc(nickname);
        const userSnap = await userRef.get();

        if (userSnap.exists()) {
            alert("이미 존재하는 닉네임입니다.");
            return;
        }

        await userRef.set({ 
            nickname, 
            joinedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        alert(`'${nickname}'님이 마을에 등록되었습니다.`);
        renderPeopleList();
    } catch (e) {
        alert("등록 중 오류 발생: " + e.message);
    }
});

async function renderPeopleList() {
    const list = document.getElementById('people-list');
    list.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">마을 주민을 찾는 중...</p>';

    try {
        const querySnapshot = await db.collection("users").orderBy("joinedAt", "desc").get();
        list.innerHTML = '';

        querySnapshot.forEach(doc => {
            const user = doc.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.style.textAlign = 'center';
            div.style.cursor = 'pointer';
            div.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 8px;">📖</div>
                <div style="font-weight: 700;">${user.nickname}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">주민</div>
            `;
            div.onclick = () => enterBookstore(user.nickname);
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = '<p>주민 목록을 불러오지 못했습니다.</p>';
    }
}

// 5. Bookstore Logic
async function enterBookstore(nickname) {
    if (!db) return;
    state.currentStoreOwner = nickname;
    document.getElementById('user-greeting').innerText = 
        (nickname === state.myNickname) ? "나의 책방" : `${nickname}님의 책방`;
    
    const isOwner = (nickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    
    showView('bookstore');
    if (isOwner) updateNavUI('bookstore');
    else updateNavUI('people'); // 다른 사람 방문 중엔 마을 탭 활성화

    renderBooks(nickname);
}

async function renderBooks(owner) {
    const list = document.getElementById('book-list');
    list.innerHTML = '<p style="text-align:center;">책장을 살펴보는 중...</p>';

    try {
        const querySnapshot = await db.collection("users").doc(owner).collection("books").orderBy("createdAt", "desc").get();
        list.innerHTML = '';

        if (querySnapshot.empty) {
            list.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">
                비어있는 책장입니다.
            </div>`;
        }

        querySnapshot.forEach(doc => {
            const book = doc.data();
            const bid = doc.id;
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="serif" style="margin:0;">${book.title}</h3>
                        <p style="margin:4px 0; color:var(--text-muted);">${book.author}</p>
                    </div>
                    <button class="btn btn-outline" onclick="openTracker('${bid}', '${book.title.replace(/'/g, "\\'")}')">
                        ${owner === state.myNickname ? '읽기' : '구경'}
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    } catch (e) {
        list.innerHTML = '<p>책 로드 실패</p>';
    }
}

// 6. Tracker & Activity Logging
window.openTracker = async (bid, title) => {
    state.currentBook = { id: bid, title: title };
    document.getElementById('current-book-title').innerText = title;
    
    const isOwner = (state.currentStoreOwner === state.myNickname);
    document.getElementById('timer-section').classList.toggle('hidden', !isOwner);
    document.getElementById('record-entry').classList.toggle('hidden', !isOwner);
    
    showView('tracker');
    renderRecords();
};

async function logActivity(type, content) {
    if (!db || !state.currentBook) return;
    await db.collection("activities").add({
        user: state.myNickname,
        type: type,
        bookId: state.currentBook.id,
        bookTitle: state.currentBook.title,
        content: content || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

document.getElementById('add-book-btn').onclick = async () => {
    const title = prompt('책 제목:');
    const author = prompt('저자:');
    if (title && author) {
        const bookRef = await db.collection("users").doc(state.myNickname).collection("books").add({
            title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.currentBook = { id: bookRef.id, title };
        await logActivity('book', `새로운 책을 읽기 시작했습니다.`);
        renderBooks(state.myNickname);
    }
};

document.getElementById('save-record-btn').onclick = async () => {
    const content = document.getElementById('record-input').value;
    if (!content) return;
    
    await db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records").add({
        content, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await logActivity('record', content);
    document.getElementById('record-input').value = '';
    renderRecords();
};

async function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>독서 기록</h3>';
    try {
        const querySnapshot = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").orderBy("createdAt", "desc").get();
        querySnapshot.forEach(doc => {
            const rec = doc.data();
            const div = document.createElement('div');
            div.className = 'card quote-box serif';
            div.innerText = rec.content;
            list.appendChild(div);
        });
    } catch (e) { /* ignore */ }
}

document.getElementById('back-to-store-btn').onclick = () => enterBookstore(state.currentStoreOwner);

// Global Exposure
window.enterBookstore = enterBookstore;

init();
