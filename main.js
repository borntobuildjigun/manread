// State Management
let state = {
    myNickname: localStorage.getItem('manread_nickname') || '',
    currentViewOwner: null,
    books: [],
    trash: [],
    currentBook: null,
    editingRecordId: null,
    timer: { interval: null, seconds: 0, isRunning: false }
};

let db;

// DOM Elements
const views = {
    home: document.getElementById('home-view'),
    dashboard: document.getElementById('dashboard-view'),
    tracker: document.getElementById('tracker-view'),
    trash: document.getElementById('trash-view')
};

// Initialize App
function init() {
    console.log("App Initializing...");
    
    // Wait for Firebase to be initialized by the reserved script
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebase);
            db = firebase.firestore();
            console.log("Firebase initialized successfully");
            startApp();
        }
    }, 100);
}

async function startApp() {
    await renderUserList();
    showView('home');
}

function showView(viewName) {
    Object.keys(views).forEach(v => views[v].classList.toggle('hidden', v !== viewName));
    window.scrollTo(0, 0);
}

// 1. Home Logic: Render all users
async function renderUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">불러오는 중...</p>';
    
    try {
        const querySnapshot = await db.collection("users").get();
        list.innerHTML = '';
        if (querySnapshot.empty) {
            list.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">아직 참여한 사람이 없어요.</p>';
        }
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline btn-small';
            btn.innerText = `📖 ${user.nickname}`;
            if (user.nickname === state.myNickname) btn.style.borderColor = 'var(--accent)';
            btn.onclick = () => enterBookstore(user.nickname);
            list.appendChild(btn);
        });
    } catch (e) {
        console.error("Error loading users:", e);
        list.innerHTML = '<p style="color:red; grid-column: 1/-1;">연결 오류가 발생했습니다. (보안 규칙 확인 필요)</p>';
    }
}

// 2. Login/Join Logic
document.getElementById('login-btn').addEventListener('click', async () => {
    const input = document.getElementById('nickname-input');
    const nickname = input.value.trim();
    if (!nickname) {
        alert("닉네임을 입력해주세요.");
        return;
    }

    try {
        const userRef = db.collection("users").doc(nickname);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({ nickname, joinedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }

        state.myNickname = nickname;
        localStorage.setItem('manread_nickname', nickname);
        enterBookstore(nickname);
    } catch (e) {
        console.error("Join error:", e);
        alert("참여 중 오류가 발생했습니다: " + e.message);
    }
});

// 3. Enter Bookstore
async function enterBookstore(ownerNickname) {
    state.currentViewOwner = ownerNickname;
    document.getElementById('user-greeting').innerText = `${ownerNickname}님의 책방`;
    
    const isOwner = (ownerNickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    
    showView('dashboard');
    renderBooks(ownerNickname);
}

// 4. Render Books
async function renderBooks(ownerNickname) {
    const list = document.getElementById('book-list');
    list.innerHTML = '<p>책 목록을 불러오는 중...</p>';

    try {
        const querySnapshot = await db.collection("users").doc(ownerNickname).collection("books").orderBy("createdAt", "desc").get();
        
        list.innerHTML = '';
        if (querySnapshot.empty) {
            list.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">아직 등록된 책이 없어요.</div>';
        }

        querySnapshot.forEach((bookDoc) => {
            const book = bookDoc.data();
            const bookId = bookDoc.id;
            const isOwner = (ownerNickname === state.myNickname);

            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 class="serif" style="margin:0;">${book.title}</h3>
                        <p style="margin:4px 0; color:var(--text-muted);">${book.author}</p>
                    </div>
                    <div style="display:flex; gap:8px;">
                        ${isOwner ? `<button class="btn btn-outline btn-small btn-edit">수정</button>` : ''}
                        <button class="btn btn-outline btn-start-reading">${isOwner ? '읽기' : '구경하기'}</button>
                    </div>
                </div>
            `;
            if(isOwner) {
                div.querySelector('.btn-edit').onclick = () => window.editBook(bookId, book.title, book.author);
            }
            div.querySelector('.btn-start-reading').onclick = () => openTracker(bookId, book);
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Error loading books:", e);
        list.innerHTML = '<p style="color:red;">목록을 불러오지 못했습니다.</p>';
    }
}

// 5. Bookstore Actions
document.getElementById('add-book-btn').addEventListener('click', async () => {
    const title = prompt('책 제목:');
    const author = prompt('저자:');
    if (title && author) {
        await db.collection("users").doc(state.myNickname).collection("books").add({
            title, author, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        renderBooks(state.myNickname);
    }
});

window.editBook = async (id, oldTitle, oldAuthor) => {
    const title = prompt('제목 수정:', oldTitle);
    const author = prompt('저자 수정:', oldAuthor);
    if (title && author) {
        await db.collection("users").doc(state.myNickname).collection("books").doc(id).update({ title, author });
        renderBooks(state.myNickname);
    }
};

// 6. Reading Tracker & Records
async function openTracker(bookId, book) {
    state.currentBook = { id: bookId, ...book };
    document.getElementById('current-book-title').innerText = book.title;
    
    const isOwner = (state.currentViewOwner === state.myNickname);
    document.getElementById('reading-timer-section').classList.toggle('hidden', !isOwner);
    document.getElementById('record-entry-section').classList.toggle('hidden', !isOwner);
    
    showView('tracker');
    renderRecords(state.currentViewOwner, bookId);
}

async function renderRecords(ownerNickname, bookId) {
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>기록들</h3>';
    
    try {
        const querySnapshot = await db.collection("users").doc(ownerNickname).collection("books").doc(bookId).collection("records").orderBy("createdAt", "desc").get();
        
        if (querySnapshot.empty) {
            list.innerHTML += '<p style="color:var(--text-muted);">아직 기록이 없어요.</p>';
        }

        querySnapshot.forEach((recordDoc) => {
            const record = recordDoc.data();
            const rid = recordDoc.id;
            const isOwner = (ownerNickname === state.myNickname);

            const div = document.createElement('div');
            div.className = 'card';
            div.style.marginBottom = '12px';
            div.innerHTML = `
                <div class="record-header">
                    <div class="quote-box serif">${record.content}</div>
                    ${isOwner ? `
                    <div style="display:flex; gap:4px;">
                        <button class="btn btn-outline btn-small btn-edit-rec">수정</button>
                        <button class="btn btn-danger btn-small btn-del-rec">삭제</button>
                    </div>` : ''}
                </div>
                <div style="margin-top:8px;">
                    <span class="location-tag">${record.page}p ${record.paragraph}문단 ${record.line}줄</span>
                </div>
            `;
            if (isOwner) {
                div.querySelector('.btn-edit-rec').onclick = () => window.startEditRecord(rid, record.content, record.page, record.paragraph, record.line);
                div.querySelector('.btn-del-rec').onclick = () => window.deleteRecord(rid);
            }
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Error loading records:", e);
    }
}

// 7. Save Records
document.getElementById('save-record-btn').addEventListener('click', async () => {
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value || 0;
    const paragraph = document.getElementById('paragraph-input').value || 0;
    const line = document.getElementById('line-input').value || 0;

    if (!content) return;

    const recordsRef = db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records");
    
    if (state.editingRecordId) {
        await recordsRef.doc(state.editingRecordId).update({ content, page, paragraph, line, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        state.editingRecordId = null;
    } else {
        await recordsRef.add({ content, page, paragraph, line, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }

    resetRecordInputs();
    renderRecords(state.myNickname, state.currentBook.id);
});

window.startEditRecord = (id, content, page, paragraph, line) => {
    state.editingRecordId = id;
    document.getElementById('record-input').value = content;
    document.getElementById('page-input').value = page;
    document.getElementById('paragraph-input').value = paragraph;
    document.getElementById('line-input').value = line;
    const btn = document.getElementById('save-record-btn');
    btn.innerText = '수정 완료';
    btn.style.backgroundColor = '#f39c12';
    document.getElementById('record-entry-section').scrollIntoView({ behavior: 'smooth' });
};

window.deleteRecord = async (rid) => {
    if (confirm('이 기록을 삭제하시겠습니까? 휴지통으로 이동합니다.')) {
        const ref = db.collection("users").doc(state.myNickname).collection("books").doc(state.currentBook.id).collection("records").doc(rid);
        const snap = await ref.get();
        const data = snap.data();
        
        await db.collection("users").doc(state.myNickname).collection("trash").add({
            ...data,
            originalBookId: state.currentBook.id,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await ref.delete();
        renderRecords(state.myNickname, state.currentBook.id);
    }
};

// Timer Logic
document.getElementById('timer-btn').addEventListener('click', () => {
    if (!state.timer.isRunning) {
        state.timer.isRunning = true;
        document.getElementById('timer-btn').innerText = '잠시 멈춤';
        state.timer.interval = setInterval(() => {
            state.timer.seconds++;
            const hrs = Math.floor(state.timer.seconds / 3600);
            const mins = Math.floor((state.timer.seconds % 3600) / 60);
            const secs = state.timer.seconds % 60;
            document.getElementById('timer').innerText = 
                `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }, 1000);
    } else {
        state.timer.isRunning = false;
        document.getElementById('timer-btn').innerText = '다시 시작';
        clearInterval(state.timer.interval);
    }
});

document.getElementById('finish-btn').addEventListener('click', () => {
    if (confirm('오늘의 독서를 마칠까요?')) {
        state.timer.isRunning = false;
        clearInterval(state.timer.interval);
        alert(`${Math.floor(state.timer.seconds / 60)}분 동안 독서하셨네요!`);
        state.timer.seconds = 0;
        document.getElementById('timer').innerText = "00:00:00";
        document.getElementById('timer-btn').innerText = "읽기 시작";
        enterBookstore(state.myNickname);
    }
});

// Trash Logic
document.getElementById('trash-btn').addEventListener('click', () => {
    showView('trash');
    renderTrash();
});

document.getElementById('trash-back-btn').addEventListener('click', () => enterBookstore(state.myNickname));

async function renderTrash() {
    const list = document.getElementById('trash-list');
    list.innerHTML = '<p>불러오는 중...</p>';

    try {
        const querySnapshot = await db.collection("users").doc(state.myNickname).collection("trash").orderBy("deletedAt", "desc").get();
        list.innerHTML = '';
        if (querySnapshot.empty) {
            list.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">휴지통이 비어 있습니다.</div>';
        }
        querySnapshot.forEach((doc) => {
            const record = doc.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `<div class="quote-box serif">${record.content}</div>`;
            list.appendChild(div);
        });
    } catch (e) {
        console.error("Error loading trash:", e);
    }
}

// Global Nav
document.getElementById('go-home-btn').onclick = () => {
    renderUserList();
    showView('home');
};
document.getElementById('back-btn').onclick = () => enterBookstore(state.currentViewOwner);

function resetRecordInputs() {
    state.editingRecordId = null;
    document.getElementById('record-input').value = '';
    document.getElementById('page-input').value = '';
    document.getElementById('paragraph-input').value = '';
    document.getElementById('line-input').value = '';
    document.getElementById('save-record-btn').innerText = '기록하기';
    document.getElementById('save-record-btn').style.backgroundColor = '';
}

init();
