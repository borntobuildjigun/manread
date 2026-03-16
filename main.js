// State Management
let state = {
    nickname: localStorage.getItem('manread_nickname') || '',
    books: JSON.parse(localStorage.getItem('manread_books')) || [],
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
    tracker: document.getElementById('tracker-view')
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
                <button class="btn btn-outline btn-start-reading" data-index="${index}">읽기</button>
            </div>
        `;
        div.querySelector('.btn-start-reading').addEventListener('click', () => startReading(index));
        list.appendChild(div);
    });
}

document.getElementById('add-book-btn').addEventListener('click', () => {
    const title = prompt('책 제목을 입력하세요:');
    const author = prompt('저자를 입력하세요:');
    if (title && author) {
        state.books.push({ title, author, records: [] });
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

    state.currentBook.records.slice().reverse().forEach(record => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.marginBottom = '12px';
        div.innerHTML = `
            <div class="quote-box serif">${record.content}</div>
            <div style="margin-top:8px;">
                <span class="location-tag">${record.page}p</span>
                <span class="location-tag">${record.paragraph}문단</span>
                <span class="location-tag">${record.line}줄</span>
            </div>
        `;
        list.appendChild(div);
    });
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
        state.currentBook.records.push({ content, page, paragraph, line, timestamp: new Date() });
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
}

// Start the app
init();
