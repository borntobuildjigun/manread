// State Management
let state = {
    nickname: localStorage.getItem('manread_nickname') || '',
    books: JSON.parse(localStorage.getItem('manread_books')) || [],
    trash: JSON.parse(localStorage.getItem('manread_trash')) || [],
    currentBook: null,
    timer: {
        interval: null,
        seconds: 0,
        isRunning: false
    }
};

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view'),
    tracker: document.getElementById('tracker-view'),
    trash: document.getElementById('trash-view')
};

// Initialization
function init() {
    if (state.nickname) {
        showView('dashboard');
        renderDashboard();
    } else {
        showView('login');
    }
}

function showView(viewName) {
    Object.keys(views).forEach(v => {
        views[v].classList.toggle('hidden', v !== viewName);
    });
}

// Login Logic
document.getElementById('login-btn').addEventListener('click', () => {
    const input = document.getElementById('nickname-input');
    if (input.value.trim()) {
        state.nickname = input.value.trim();
        localStorage.setItem('manread_nickname', state.nickname);
        showView('dashboard');
        renderDashboard();
    }
});

// Dashboard Logic
function renderDashboard() {
    document.getElementById('user-greeting').innerText = `안녕, ${state.nickname}님!`;
    const list = document.getElementById('book-list');
    list.innerHTML = '';

    if (state.books.length === 0) {
        list.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">아직 등록된 책이 없어요.</div>';
    }

    state.books.forEach((book, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 class="serif" style="margin:0;">${book.title}</h3>
                    <p style="margin:4px 0; color:var(--text-muted);">${book.author}</p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-outline btn-small btn-edit-book" data-index="${index}">수정</button>
                    <button class="btn btn-outline btn-start-reading" data-index="${index}">읽기</button>
                </div>
            </div>
        `;
        div.querySelector('.btn-edit-book').addEventListener('click', (e) => {
            e.stopPropagation();
            editBook(index);
        });
        div.querySelector('.btn-start-reading').addEventListener('click', () => startReading(index));
        list.appendChild(div);
    });
}

function editBook(index) {
    const book = state.books[index];
    const newTitle = prompt('수정할 책 제목을 입력하세요:', book.title);
    const newAuthor = prompt('수정할 저자를 입력하세요:', book.author);
    
    if (newTitle && newAuthor) {
        state.books[index].title = newTitle.trim();
        state.books[index].author = newAuthor.trim();
        saveBooks();
        renderDashboard();
        alert('책 정보가 수정되었습니다.');
    }
}

document.getElementById('add-book-btn').addEventListener('click', () => {
    const title = prompt('책 제목을 입력하세요:');
    const author = prompt('저자를 입력하세요:');
    if (title && author) {
        state.books.push({ id: Date.now().toString(), title, author, records: [] });
        saveBooks();
        renderDashboard();
    }
});

// Reading Tracker Logic
function startReading(index) {
    state.currentBook = state.books[index];
    document.getElementById('current-book-title').innerText = state.currentBook.title;
    renderRecords();
    showView('tracker');
}

function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '<h3>나의 기록들</h3>';
    
    if (state.currentBook.records.length === 0) {
        list.innerHTML += '<p style="color:var(--text-muted);">아직 기록이 없어요.</p>';
    }

    state.currentBook.records.forEach((record, index) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '12px';
        div.innerHTML = `
            <div class="record-header">
                <div class="quote-box serif">${record.content}</div>
                <button class="btn btn-danger btn-small btn-delete-record" data-index="${index}">삭제</button>
            </div>
            <div style="margin-top:8px;">
                <span class="location-tag">${record.page}p</span>
                <span class="location-tag">${record.paragraph}문단</span>
                <span class="location-tag">${record.line}줄</span>
            </div>
        `;
        div.querySelector('.btn-delete-record').addEventListener('click', () => deleteRecord(index));
        list.prepend(div); // 최근 기록을 위로
    });
}

function deleteRecord(index) {
    if (confirm('이 기록을 삭제하시겠습니까? 휴지통으로 이동합니다.')) {
        const record = state.currentBook.records.splice(index, 1)[0];
        // 복원을 위해 원래 책의 ID 저장
        record.originalBookId = state.currentBook.id;
        state.trash.push(record);
        saveBooks();
        renderRecords();
    }
}

// Trash Logic
document.getElementById('trash-btn').addEventListener('click', () => {
    showView('trash');
    renderTrash();
});

document.getElementById('trash-back-btn').addEventListener('click', () => showView('dashboard'));

function renderTrash() {
    const list = document.getElementById('trash-list');
    list.innerHTML = '';

    if (state.trash.length === 0) {
        list.innerHTML = '<div class="card" style="text-align:center; color:var(--text-muted);">휴지통이 비어 있습니다.</div>';
    }

    state.trash.forEach((record, index) => {
        const book = state.books.find(b => b.id === record.originalBookId);
        const bookTitle = book ? book.title : '삭제된 책';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">[ ${bookTitle} ]</div>
            <div class="quote-box serif">${record.content}</div>
            <div style="margin-top:12px; display:flex; gap:8px;">
                <button class="btn btn-small btn-restore-record" data-index="${index}">복원</button>
                <button class="btn btn-danger btn-small btn-perm-delete" data-index="${index}">영구 삭제</button>
            </div>
        `;
        div.querySelector('.btn-restore-record').addEventListener('click', () => restoreRecord(index));
        div.querySelector('.btn-perm-delete').addEventListener('click', () => permanentlyDeleteRecord(index));
        list.prepend(div);
    });
}

function restoreRecord(index) {
    const record = state.trash.splice(index, 1)[0];
    const targetBook = state.books.find(b => b.id === record.originalBookId);
    
    if (targetBook) {
        targetBook.records.push(record);
        saveBooks();
        renderTrash();
        alert('기록이 원래 책으로 복원되었습니다.');
    } else {
        alert('기록을 복원할 책을 찾을 수 없습니다.');
        state.trash.push(record); // 복원 실패 시 다시 휴지통으로
    }
}

function permanentlyDeleteRecord(index) {
    if (confirm('이 기록을 영구적으로 삭제하시겠습니까? 복구할 수 없습니다.')) {
        state.trash.splice(index, 1);
        saveBooks();
        renderTrash();
    }
}

// Timer Logic
document.getElementById('timer-btn').addEventListener('click', () => {
    if (!state.timer.isRunning) {
        state.timer.isRunning = true;
        document.getElementById('timer-btn').innerText = '잠시 멈춤';
        state.timer.interval = setInterval(() => {
            state.timer.seconds++;
            updateTimerDisplay();
        }, 1000);
    } else {
        stopTimer();
    }
});

function stopTimer() {
    state.timer.isRunning = false;
    document.getElementById('timer-btn').innerText = '다시 시작';
    clearInterval(state.timer.interval);
}

function updateTimerDisplay() {
    const hrs = Math.floor(state.timer.seconds / 3600);
    const mins = Math.floor((state.timer.seconds % 3600) / 60);
    const secs = state.timer.seconds % 60;
    document.getElementById('timer').innerText = 
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

document.getElementById('finish-btn').addEventListener('click', () => {
    if (confirm('오늘의 독서를 마칠까요?')) {
        stopTimer();
        alert(`${Math.floor(state.timer.seconds / 60)}분 동안 독서하셨네요!`);
        state.timer.seconds = 0;
        updateTimerDisplay();
        showView('dashboard');
    }
});

// Save Record Logic
document.getElementById('save-record-btn').addEventListener('click', () => {
    const content = document.getElementById('record-input').value;
    const page = document.getElementById('page-input').value;
    const paragraph = document.getElementById('paragraph-input').value;
    const line = document.getElementById('line-input').value;

    if (content) {
        state.currentBook.records.push({ 
            id: Date.now().toString(),
            content, 
            page, 
            paragraph, 
            line, 
            timestamp: new Date() 
        });
        saveBooks();
        renderRecords();
        // Reset inputs
        document.getElementById('record-input').value = '';
        document.getElementById('page-input').value = '';
        document.getElementById('paragraph-input').value = '';
        document.getElementById('line-input').value = '';
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    if (state.timer.isRunning) {
        if (!confirm('독서 타이머가 실행 중입니다. 중단하고 돌아갈까요?')) return;
        stopTimer();
    }
    showView('dashboard');
});

function saveBooks() {
    localStorage.setItem('manread_books', JSON.stringify(state.books));
    localStorage.setItem('manread_trash', JSON.stringify(state.trash));
}

// Start the app
init();
