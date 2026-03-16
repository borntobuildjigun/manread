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
            db = firebase.firestore();
            console.log("Firebase Connected");
            startApp();
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
    Object.keys(views).forEach(v => views[v].classList.toggle('hidden', v !== viewName));
    nav.classList.toggle('hidden', viewName === 'login');
}

// 1. Login/Join
document.getElementById('login-btn').addEventListener('click', async () => {
    const input = document.getElementById('nickname-input');
    const nickname = input.value.trim();
    if (!nickname) return;

    try {
        await db.collection("users").doc(nickname).set({ 
            nickname, joinedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });
        
        state.myNickname = nickname;
        localStorage.setItem('manread_nickname', nickname);
        showView('feed');
        renderFeed();
    } catch (e) {
        alert("참여 중 오류 발생: " + e.message);
    }
});

// 2. Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
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
    const feedList = document.getElementById('activity-feed');
    feedList.innerHTML = '<p style="text-align:center;">활동을 불러오는 중...</p>';
    
    try {
        const querySnapshot = await db.collection("activities").orderBy("createdAt", "desc").limit(20).get();
        feedList.innerHTML = '';
        
        if (querySnapshot.empty) {
            feedList.innerHTML = '<div class="card" style="text-align:center;">아직 활동이 없습니다.</div>';
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
                    ${act.createdAt ? new Date(act.createdAt.toDate()).toLocaleString() : ''}
                </div>
            `;
            feedList.appendChild(div);
        });
    } catch (e) {
        feedList.innerHTML = '<p>피드를 불러오지 못했습니다.</p>';
    }
}

// 4. Bookstore Logic
async function enterBookstore(nickname) {
    state.currentStoreOwner = nickname;
    document.getElementById('user-greeting').innerText = 
        (nickname === state.myNickname) ? "나의 책방" : `${nickname}님의 책방`;
    
    const isOwner = (nickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    
    showView('bookstore');
    renderBooks(nickname);

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', (btn.dataset.view === 'bookstore' && isOwner));
    });
}

async function renderBooks(owner) {
    const list = document.getElementById('book-list');
    list.innerHTML = '<p>책 목록 로딩 중...</p>';

    const querySnapshot = await db.collection("users").doc(owner).collection("books").get();
    list.innerHTML = '';

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
                <button class="btn btn-outline" onclick="openTracker('${bid}', '${book.title}')">
                    ${owner === state.myNickname ? '읽기' : '구경'}
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

// 5. Tracker & Log Activity
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
    await db.collection("activities").add({
        user: state.myNickname,
        type: type,
        bookId: state.currentBook.id,
        bookTitle: state.currentBook.title,
        content: content || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Attach more event listeners as needed for Add Book, Timer, etc.
// (Simplified for briefness, focusing on your specific Hub/Bookstore request)

document.getElementById('add-book-btn').onclick = async () => {
    const title = prompt('책 제목:');
    const author = prompt('저자:');
    if (title && author) {
        await db.collection("users").doc(state.myNickname).collection("books").add({
            title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logActivity('book', `새 책 '${title}' 추가`);
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
    list.innerHTML = '<h3>기록</h3>';
    const querySnapshot = await db.collection("users").doc(state.currentStoreOwner).collection("books").doc(state.currentBook.id).collection("records").get();
    querySnapshot.forEach(doc => {
        const rec = doc.data();
        const div = document.createElement('div');
        div.className = 'card quote-box serif';
        div.innerText = rec.content;
        list.appendChild(div);
    });
}

document.getElementById('back-to-store-btn').onclick = () => enterBookstore(state.currentStoreOwner);

// Global Exposure
window.enterBookstore = enterBookstore;

init();
