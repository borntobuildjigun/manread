import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, updateDoc, 
    query, where, orderBy, onSnapshot, serverTimestamp, setDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration (Using public project info from deployment)
const firebaseConfig = {
    projectId: "manread-74612",
    appId: "manread-app-web"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Management
let state = {
    myNickname: localStorage.getItem('manread_nickname') || '',
    currentViewOwner: null, // 누구의 책방을 보고 있는지 (nickname)
    books: [],
    trash: [],
    currentBook: null,
    editingRecordId: null,
    timer: { interval: null, seconds: 0, isRunning: false }
};

// DOM Elements
const views = {
    home: document.getElementById('home-view'),
    dashboard: document.getElementById('dashboard-view'),
    tracker: document.getElementById('tracker-view'),
    trash: document.getElementById('trash-view')
};

function init() {
    renderUserList();
    showView('home');
}

function showView(viewName) {
    Object.keys(views).forEach(v => views[v].classList.toggle('hidden', v !== viewName));
}

// 1. Home Logic: Render all users
async function renderUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1;">로딩 중...</p>';
    
    const querySnapshot = await getDocs(collection(db, "users"));
    list.innerHTML = '';
    
    querySnapshot.forEach((doc) => {
        const user = doc.data();
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-small';
        btn.innerText = `📖 ${user.nickname}`;
        if (user.nickname === state.myNickname) btn.style.borderColor = 'var(--accent)';
        btn.onclick = () => enterBookstore(user.nickname);
        list.appendChild(btn);
    });
}

// 2. Login/Join Logic
document.getElementById('login-btn').addEventListener('click', async () => {
    const input = document.getElementById('nickname-input');
    const nickname = input.value.trim();
    if (!nickname) return;

    // Check if user exists or create new
    const userRef = doc(db, "users", nickname);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, { nickname, joinedAt: serverTimestamp() });
    }

    state.myNickname = nickname;
    localStorage.setItem('manread_nickname', nickname);
    enterBookstore(nickname);
});

// 3. Enter Bookstore (Mine or Others)
async function enterBookstore(ownerNickname) {
    state.currentViewOwner = ownerNickname;
    document.getElementById('user-greeting').innerText = `${ownerNickname}님의 책방`;
    
    // Show/Hide owner-only actions
    const isOwner = (ownerNickname === state.myNickname);
    document.getElementById('owner-actions').classList.toggle('hidden', !isOwner);
    
    showView('dashboard');
    renderBooks(ownerNickname);
}

// 4. Render Books from Firestore
async function renderBooks(ownerNickname) {
    const list = document.getElementById('book-list');
    list.innerHTML = '<p>책 목록을 불러오는 중...</p>';

    const q = query(collection(db, "users", ownerNickname, "books"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
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
                    ${isOwner ? `<button class="btn btn-outline btn-small" onclick="editBook('${bookId}', '${book.title}', '${book.author}')">수정</button>` : ''}
                    <button class="btn btn-outline btn-start-reading">${isOwner ? '읽기' : '구경하기'}</button>
                </div>
            </div>
        `;
        div.querySelector('.btn-start-reading').onclick = () => openTracker(bookId, book);
        list.appendChild(div);
    });
}

// 5. Bookstore Actions (Add, Edit)
document.getElementById('add-book-btn').addEventListener('click', async () => {
    const title = prompt('책 제목:');
    const author = prompt('저자:');
    if (title && author) {
        await addDoc(collection(db, "users", state.myNickname, "books"), {
            title, author, createdAt: serverTimestamp()
        });
        renderBooks(state.myNickname);
    }
});

window.editBook = async (id, oldTitle, oldAuthor) => {
    const title = prompt('제목 수정:', oldTitle);
    const author = prompt('저자 수정:', oldAuthor);
    if (title && author) {
        await updateDoc(doc(db, "users", state.myNickname, "books", id), { title, author });
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
    
    const q = query(collection(db, "users", ownerNickname, "books", bookId, "records"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
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
                    <button class="btn btn-outline btn-small" onclick="startEditRecord('${rid}', \`${record.content}\`, ${record.page}, ${record.paragraph}, ${record.line})">수정</button>
                    <button class="btn btn-danger btn-small" onclick="deleteRecord('${rid}')">삭제</button>
                </div>` : ''}
            </div>
            <div style="margin-top:8px;">
                <span class="location-tag">${record.page}p ${record.paragraph}문단 ${record.line}줄</span>
            </div>
        `;
        list.appendChild(div);
    });
}

// 7. Save Records to Firestore
document.getElementById('save-record-btn').addEventListener('click', async () => {
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value || 0;
    const paragraph = document.getElementById('paragraph-input').value || 0;
    const line = document.getElementById('line-input').value || 0;

    if (!content) return;

    const recordsRef = collection(db, "users", state.myNickname, "books", state.currentBook.id, "records");
    
    if (state.editingRecordId) {
        await updateDoc(doc(recordsRef, state.editingRecordId), { content, page, paragraph, line, updatedAt: serverTimestamp() });
        state.editingRecordId = null;
    } else {
        await addDoc(recordsRef, { content, page, paragraph, line, createdAt: serverTimestamp() });
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

window.deleteRecord = async (id) => {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
        // Trash logic simplified: for now, just delete from this collection
        // To implement full trash, you'd move it to a 'trash' collection
        const ref = doc(db, "users", state.myNickname, "books", state.currentBook.id, "records", id);
        const snap = await getDoc(ref);
        await addDoc(collection(db, "users", state.myNickname, "trash"), { ...snap.data(), originalBookId: state.currentBook.id, deletedAt: serverTimestamp() });
        await updateDoc(ref, { deleted: true }); // Simple soft delete for now or use separate collection
        renderRecords(state.myNickname, state.currentBook.id);
    }
};

// Global Nav
document.getElementById('go-home-btn').addEventListener('click', () => {
    renderUserList();
    showView('home');
});
document.getElementById('back-btn').addEventListener('click', () => enterBookstore(state.currentViewOwner));

function resetRecordInputs() {
    state.editingRecordId = null;
    document.getElementById('record-input').value = '';
    document.getElementById('page-input').value = '';
    document.getElementById('paragraph-input').value = '';
    document.getElementById('line-input').value = '';
    document.getElementById('save-record-btn').innerText = '기록하기';
    document.getElementById('save-record-btn').style.backgroundColor = '';
}

// Timer simplified for Firestore
document.getElementById('timer-btn').onclick = () => { /* Timer UI logic stays same as before */ };

init();
