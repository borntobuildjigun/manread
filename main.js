// main.js

// -----------------------------------------------------------------------------
// Firebase 설정
// -----------------------------------------------------------------------------
// 중요: 아래 설정 값을 자신의 Firebase 프로젝트 값으로 교체하세요.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL", // 예: "https://your-project-id.firebaseio.com"
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebase 초기화
try {
    if (firebase.apps.length === 0) {
        const app = firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
    }
} catch (error) {
    console.error("Firebase 초기화 실패. 설정 값을 올바르게 입력했는지 확인하세요.", error);
    alert("Firebase 연결에 실패했습니다. 사이트 기능이 제한될 수 있습니다.");
}


// -----------------------------------------------------------------------------
// 전역 변수 및 상수
// -----------------------------------------------------------------------------
const CATEGORIES = [
    { title: "최신 프로그래밍 서적", query: "programming" },
    { title: "주목받는 인공지능 기술", query: "artificial intelligence" },
    { title: "성공을 위한 자기계발", query: "self-help" },
    { title: "상상력을 자극하는 과학 소설", query: "science fiction" },
];
let allFetchedBooks = {}; // API로부터 받은 책 정보를 저장하는 캐시

// -----------------------------------------------------------------------------
// API 통신
// -----------------------------------------------------------------------------
class BookFetcher {
    static async fetchBooks(query) {
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const books = data.items || [];
            
            // 받아온 책 정보를 캐시에 저장
            books.forEach(book => allFetchedBooks[book.id] = book);
            
            return books;
        } catch (error) {
            console.error(`Could not fetch books for query "${query}":`, error);
            return [];
        }
    }
}

// -----------------------------------------------------------------------------
// UI 생성 및 조작
// -----------------------------------------------------------------------------

/**
 * 책 카드 HTML을 생성합니다.
 * @param {object} book - Google Books API로부터 받은 책 객체
 * @returns {string} 책 카드의 HTML 문자열
 */
function createBookCard(book) {
    const id = book.id;
    const title = book.volumeInfo.title;
    const thumbnail = book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/180x270.png?text=No+Image';

    return `
        <div class="book-card" data-book-id="${id}" title="${title}">
            <img src="${thumbnail}" alt="${title}">
            <div class="book-title">${title}</div>
        </div>
    `;
}

/**
 * 책 선반(카테고리)을 생성하고 화면에 표시합니다.
 * @param {object} category - {title, query} 형태의 카테고리 객체
 * @param {HTMLElement} container - 선반을 추가할 부모 컨테이너
 * @param {boolean} isSearchResult - 검색 결과로 생성된 선반인지 여부
 */
async function createShelf(category, container, isSearchResult = false) {
    const shelfId = isSearchResult ? 'search-results-shelf' : `shelf-${category.query.replace(/\s/g, '-')}`;
    
    // 기존 검색 결과가 있다면 제거
    if (isSearchResult) {
        const existingSearchShelf = document.getElementById(shelfId);
        if (existingSearchShelf) existingSearchShelf.remove();
    }

    const shelfElement = document.createElement('div');
    shelfElement.className = 'book-shelf';
    shelfElement.id = shelfId;

    const titleElement = document.createElement('h2');
    titleElement.className = 'shelf-title';
    titleElement.textContent = category.title;
    shelfElement.appendChild(titleElement);

    const booksContainer = document.createElement('div');
    booksContainer.className = 'shelf-container';
    shelfElement.appendChild(booksContainer);

    // 검색 결과는 가장 위에, 나머지는 그 뒤에 추가
    if (isSearchResult) {
        container.prepend(shelfElement);
    } else {
        container.appendChild(shelfElement);
    }

    booksContainer.innerHTML = '<p>책을 불러오는 중...</p>';
    const books = await BookFetcher.fetchBooks(category.query);

    if (books.length > 0) {
        booksContainer.innerHTML = books.map(createBookCard).join('');
    } else {
        booksContainer.innerHTML = '<p>이 카테고리의 책을 찾을 수 없습니다.</p>';
    }
}

// -----------------------------------------------------------------------------
// 토론 모달 관련 기능
// -----------------------------------------------------------------------------

const modal = document.getElementById('discussion-modal');
const closeModalButton = document.querySelector('.close-button');

/**
 * 토론 모달을 엽니다.
 * @param {string} bookId - 책 ID
 */
function openModal(bookId) {
    const book = allFetchedBooks[bookId];
    if (!book) return;

    // 1. 책 상세 정보 표시
    const detailsContainer = document.getElementById('modal-book-details');
    const thumbnail = book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/180x270.png?text=No+Image';
    detailsContainer.innerHTML = `
        <img src="${thumbnail}" alt="${book.volumeInfo.title}">
        <div class="info">
            <h2>${book.volumeInfo.title}</h2>
            <p><strong>저자:</strong> ${book.volumeInfo.authors?.join(', ') || '정보 없음'}</p>
            <p>${book.volumeInfo.description?.substring(0, 200) || ''}...</p>
        </div>
    `;

    // 2. 댓글 입력 폼 생성
    const commentFormContainer = document.getElementById('comment-form-container');
    commentFormContainer.innerHTML = `
        <form id="comment-form">
            <textarea id="comment-input" placeholder="토론에 참여하세요..." required></textarea>
            <button type="submit">등록</button>
        </form>
    `;

    // 3. 댓글 불러오기 및 실시간 리스너 설정
    const discussionThread = document.getElementById('discussion-thread');
    const bookDiscussionsRef = firebase.database().ref(`discussions/${bookId}`);
    
    // 이전에 등록된 리스너가 있다면 제거
    bookDiscussionsRef.off(); 

    bookDiscussionsRef.on('value', (snapshot) => {
        discussionThread.innerHTML = '';
        const discussions = snapshot.val();
        if (discussions) {
            Object.values(discussions).forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                commentElement.innerHTML = `<p>${comment.text}</p><small>${new Date(comment.timestamp).toLocaleString()}</small>`;
                discussionThread.prepend(commentElement); // 최신 댓글이 위로 오도록
            });
        } else {
            discussionThread.innerHTML = '<p>아직 토론이 없습니다. 첫 번째 의견을 남겨보세요!</p>';
        }
    });

    // 4. 댓글 제출 이벤트 처리
    document.getElementById('comment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const commentInput = document.getElementById('comment-input');
        const commentText = commentInput.value.trim();
        if (commentText) {
            bookDiscussionsRef.push({
                text: commentText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            commentInput.value = '';
        }
    });

    modal.style.display = 'block';
}

/** 토론 모달을 닫습니다. */
function closeModal() {
    modal.style.display = 'none';
    const bookId = document.querySelector('#discussion-modal .book-card')?.dataset.bookId;
    if(bookId) {
        firebase.database().ref(`discussions/${bookId}`).off(); // 실시간 리스너 정리
    }
}

// -----------------------------------------------------------------------------
// 이벤트 리스너 설정
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const shelvesContainer = document.getElementById('book-shelves');

    // 기본 카테고리 로드
    CATEGORIES.forEach(category => createShelf(category, shelvesContainer));

    // 검색 기능
    const searchForm = document.getElementById('search-form');
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        const query = searchInput.value.trim();
        if (query) {
            const searchCategory = { title: `'${query}' 검색 결과`, query: query };
            createShelf(searchCategory, shelvesContainer, true);
            searchInput.value = '';
        }
    });

    // 책 카드 클릭 -> 모달 열기 (이벤트 위임)
    shelvesContainer.addEventListener('click', (e) => {
        const bookCard = e.target.closest('.book-card');
        if (bookCard) {
            const bookId = bookCard.dataset.bookId;
            openModal(bookId);
        }
    });

    // 모달 닫기
    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // 헤더 스크롤 효과
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(20, 20, 20, 0.9)';
        } else {
            header.style.backgroundColor = '#141414';
        }
    });
});
