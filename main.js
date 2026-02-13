// main.js

// Google Books API에서 책 정보를 가져오는 클래스
class BookFetcher {
    static async fetchBooks(query) {
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error(`Could not fetch books for query "${query}":`, error);
            return []; // 에러 발생 시 빈 배열 반환
        }
    }
}

// 화면에 표시할 책 카테고리 정의
const CATEGORIES = [
    { title: "프로그래밍", query: "programming" },
    { title: "인공지능", query: "artificial intelligence" },
    { title: "자기계발", query: "self-help" },
    { title: "과학 소설", query: "science fiction" },
    { title: "역사", query: "history" },
    { title: "예술", query: "art" }
];

// 책 카드 HTML을 생성하는 함수
function createBookCard(book) {
    const title = book.volumeInfo.title;
    const thumbnail = book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/180x270.png?text=No+Image';
    const bookLink = book.volumeInfo.infoLink;

    return `
        <a href="${bookLink}" target="_blank" class="book-card" title="${title}">
            <img src="${thumbnail}" alt="${title}">
            <div class="book-title">${title}</div>
        </a>
    `;
}

// 책 선반(카테고리) HTML을 생성하고 DOM에 추가하는 함수
async function createShelf(category, container) {
    // 선반 컨테이너 생성
    const shelfElement = document.createElement('div');
    shelfElement.className = 'book-shelf';

    // 선반 제목 생성
    const titleElement = document.createElement('h2');
    titleElement.className = 'shelf-title';
    titleElement.textContent = category.title;
    shelfElement.appendChild(titleElement);

    // 책들을 담을 컨테이너 생성
    const booksContainer = document.createElement('div');
    booksContainer.className = 'shelf-container';
    shelfElement.appendChild(booksContainer);

    // 컨테이너를 메인 영역에 먼저 추가 (로딩 중임을 인지)
    container.appendChild(shelfElement);

    // 책 데이터 가져오기
    const books = await BookFetcher.fetchBooks(category.query);

    if (books.length > 0) {
        // 가져온 책들로 카드 생성
        const bookCardsHTML = books.map(createBookCard).join('');
        booksContainer.innerHTML = bookCardsHTML;
    } else {
        // 책이 없을 경우 메시지 표시
        booksContainer.innerHTML = '<p>이 카테고리의 책을 찾을 수 없습니다.</p>';
    }
}

// DOM이 로드되었을 때 실행
document.addEventListener('DOMContentLoaded', () => {
    const shelvesContainer = document.getElementById('book-shelves');

    // 정의된 모든 카테고리에 대해 선반 생성
    CATEGORIES.forEach(category => {
        createShelf(category, shelvesContainer);
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
