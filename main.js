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
    bookstore: document.getElementById('bookstore-view'),
    tracker: document.getElementById('tracker-view')
};
const nav = document.getElementById('bottom-nav');

// Initialize App
function init() {
    console.log("App Initializing...");
    
    // Firebase Reserved SDK Check
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebase);
            try {
                db = firebase.firestore();
                console.log("Firebase Connected Successfully");
                startApp();
            } catch (e) {
                console.error("Firestore init failed:", e);
                alert("데이터베이스 초기화에 실패했습니다. (보안 규칙 또는 설정 확인 필요)");
            }
        }
    }, 100);
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

// Helper: Ensure DB is ready
function isDbReady() {
    if (!db) {
        alert("데이터베이스에 연결 중입니다. 잠시만 기다려주세요.");
        return false;
    }
    return true;
}

// 1. Login/Join
document.getElementById('login-btn').addEventListener('click', async () => {
    if (!isDbReady()) return;
    
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
        renderFeed();
    } catch (e) {
        console.error("Login error:", e);
        alert("참여 중 오류 발생: " + e.message);
    }
});

// 2. Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (!isDbReady()) return;
        
        const view = item.dataset.view;
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');
        
        if (view === 'feed') {
            showView('feed');
            renderFeed();
        } else if (view === 'bookstore') {
            enterBookstore(state.myNickname);
        }
    });
});

// 3. Activity Feed Logic
async function renderFeed() {
    if (!isDbReady()) return;
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">활동을 불러오는 중...</p>';
    
    try {
        const querySnapshot = await db.collection("activities").orderBy("createdAt", "desc").limit(20).get();
        feedList.innerHTML = '';
        
        if (querySnapshot.empty) {
            feedList.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">아직 활동이 없습니다. 첫 소식을 남겨보세요!</div>';
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
        console.error("Feed error:", e);
        feedList.innerHTML = '<p>활동 피드를 불러오지 못했습니다. 새로고침을 해주세요.</p>';
    }
}

// 4. Bookstore Logic
async function enterBookstore(nickname) {
    if (!isDbReady()) return;
    state.currentStoreOwner = nickname;
    document.getElementById('user-greeting').innerText = 
        (nickname === state.myNickname) ? "나의 책방" : `${nickname}님의 책방`;
    
    const isOwner = (nickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    
    showView('bookstore');
    renderBooks(nickname);

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        const isSelfStore = (btn.dataset.view === 'bookstore' && isOwner);
        btn.classList.toggle('active', isSelfStore);
    });
}

async function renderBooks(owner) {
    if (!isDbReady()) return;
    const list = document.getElementById('book-list');
    list.innerHTML = '<p style="text-align:center;">책 목록을 불러오는 중...</p>';

    try {
        const querySnapshot = await db.collection("users").doc(owner).collection("books").orderBy("createdAt", "desc").get();
        list.innerHTML = '';

        if (querySnapshot.empty) {
            list.innerHTML = `<div class="card" style="text-align:center; color:var(--text-muted);">
                ${owner === state.myNickname ? '아직 등록된 책이 없어요. + 새 책 버튼을 눌러보세요!' : '등록된 책이 없습니다.'}
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
        console.error("Books error:", e);
        list.innerHTML = '<p>목록 로딩 중 오류가 발생했습니다.</p>';
    }
}

// 5. Tracker & Log Activity
window.openTracker = async (bid, title) => {
    if (!isDbReady()) return;
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
    try {
        await db.collection("activities").add({
            user: state.myNickname,
            type: type,
            bookId: state.currentBook.id,
            bookTitle: state.currentBook.title,
            content: content || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Activity log error:", e);
    }
}

document.getElementById('add-book-btn').onclick = async () => {
    const title = prompt('책 제목:');
    const author = prompt('저자:');
    if (title && author) {
        try {
            const bookRef = await db.collection("users").doc(state.myNickname).collection("books").add({
                title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            state.currentBook = { id: bookRef.id, title };
            await logActivity('book', `책을 추가했습니다.`);
            renderBooks(state.myNickname);
        } catch (e) {
            alert("책 추가 실패: " + e.message);
        }
    }
};

document.getElementById('save-record-btn').onclick = async () => {
    const content = document.getElementById('record-input').value;
    if (!content) {
        alert("기록할 내용을 입력해주세요.");
        return;
    }
    
    try {
        await db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records").add({
            content, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await logActivity('record', content);
        document.getElementById('record-input').value = '';
        alert("기록이 저장되었습니다.");
        renderRecords();
    } catch (e) {
        alert("기록 저장 실패: " + e.message);
    }
};

async function renderRecords() {
    if (!isDbReady()) return;
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>독서 기록</h3>';
    
    try {
        const querySnapshot = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").orderBy("createdAt", "desc").get();
        
        if (querySnapshot.empty) {
            list.innerHTML += '<p style="color:var(--text-muted);">아직 남긴 기록이 없습니다.</p>';
        }

        querySnapshot.forEach(doc => {
            const rec = doc.data();
            const div = document.createElement('div');
            div.className = 'card quote-box serif';
            div.innerText = rec.content;
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Records error:", e);
    }
}

document.getElementById('back-to-store-btn').onclick = () => enterBookstore(state.currentStoreOwner);

// Global Exposure
window.enterBookstore = enterBookstore;

init();
