// Firebase Configuration (Replace with your actual project config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL", // e.g., "https://YOUR_PROJECT_ID.firebaseio.com"
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Global variables to hold data from Firebase
let allBooks = [];
let allDiscussions = {}; // Store discussions keyed by book ID

// 1. 데이터 구조 정의 (Firebase에서 로드)
// books 변수와 discussions 변수는 Firebase에서 데이터를 로드한 후 설정됩니다.

// 2. UI 컴포넌트 개발 (웹 컴포넌트)
class BookCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const bookId = this.getAttribute('book-id');
        const book = allBooks.find(b => b.id == bookId);
        const discussionsForBook = allDiscussions[bookId] ? Object.values(allDiscussions[bookId]) : [];

        if (book) {
            this.shadowRoot.innerHTML = `
                <style>
                    .card {
                        background-color: var(--card-bg-color, #fff);
                        border-radius: 8px;
                        box-shadow: 0 4px 8px var(--shadow-color, rgba(0,0,0,0.1));
                        padding: 1rem;
                        margin-bottom: 1rem;
                        display: flex;
                        gap: 1rem;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }
                    .card:hover {
                        transform: translateY(-5px);
                    }
                    :host(.active) .card {
                        border-left: 5px solid var(--secondary-color);
                        transform: translateY(-2px);
                    }
                    .cover-img {
                        width: 100px;
                        height: 150px;
                        object-fit: cover;
                        border-radius: 4px;
                    }
                    .info {
                        display: flex;
                        flex-direction: column;
                    }
                    .title {
                        font-size: 1.2rem;
                        font-weight: bold;
                        color: var(--primary-color, #0C0C4A);
                    }
                    .author {
                        font-size: 0.9rem;
                        color: #555;
                        margin-bottom: auto;
                    }
                    .discussion-count {
                        font-size: 0.8rem;
                        color: var(--secondary-color, #00A6A6);
                    }
                </style>
                <div class="card">
                    <img src="${book.cover}" alt="${book.title}" class="cover-img">
                    <div class="info">
                        <span class="title">${book.title}</span>
                        <span class="author">${book.author}</span>
                        <span class="discussion-count">토론 ${discussionsForBook.length}개</span>
                    </div>
                </div>
            `;
        }
    }
}
customElements.define('book-card', BookCard);

class DiscussionThread extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const bookId = this.getAttribute('book-id');
        const book = allBooks.find(b => b.id == bookId);
        const discussionsForBook = allDiscussions[bookId] ? Object.values(allDiscussions[bookId]) : [];

        if (book) {
            const discussionsHtml = discussionsForBook.map(d => `
                <div class="comment">
                    <span class="user">${d.user}</span>
                    <p class="comment-text">${d.comment}</p>
                </div>
            `).join('') || '<p>아직 토론이 없습니다.</p>';

            this.shadowRoot.innerHTML = `
                <style>
                    .thread {
                        background-color: var(--card-bg-color, #fff);
                        border-radius: 8px;
                        padding: 1.5rem;
                        box-shadow: 0 2px 4px var(--shadow-color, rgba(0,0,0,0.05));
                    }
                    h2 {
                        color: var(--primary-color, #0C0C4A);
                        margin-top: 0;
                    }
                    .comment {
                        border-bottom: 1px solid #eee;
                        padding: 1rem 0;
                    }
                    .comment:last-child {
                        border-bottom: none;
                    }
                    .user {
                        font-weight: bold;
                        color: var(--secondary-color, #00A6A6);
                    }
                    .comment-text {
                        margin-top: 0.5rem;
                    }
                </style>
                <div class="thread">
                    <h2>"${book.title}" 토론</h2>
                    <div id="comments">${discussionsHtml}</div>
                    <comment-form book-id="${bookId}"></comment-form>
                </div>
            `;

            // Add the event listener for the form submission
            const commentForm = this.shadowRoot.querySelector('comment-form');
            commentForm.addEventListener('comment-added', () => {
                this.render();
                // Also update the discussion count on the book card
                const bookCard = document.querySelector(`book-card[book-id="${bookId}"]`);
                if(bookCard) {
                    const latestDiscussionsForBook = allDiscussions[bookId] ? Object.values(allDiscussions[bookId]) : [];
                    const countElement = bookCard.shadowRoot.querySelector('.discussion-count');
                    if(countElement) {
                        countElement.textContent = `토론 ${latestDiscussionsForBook.length}개`;
                    }
                }
            });
        }
    }
}
customElements.define('discussion-thread', DiscussionThread);

class CommentForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                form {
                    margin-top: 1.5rem;
                    display: flex;
                    flex-direction: column;
                }
                textarea {
                    width: 100%;
                    min-height: 60px;
                    padding: 0.5rem;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    margin-bottom: 0.5rem;
                    font-family: inherit;
                }
                button {
                    align-self: flex-end;
                    padding: 0.6rem 1.2rem;
                    background-color: var(--secondary-color, #00A6A6);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>
            <form>
                <textarea placeholder="의견을 남겨주세요..."></textarea>
                <button type="submit">등록</button>
            </form>
        `;

        this.shadowRoot.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const textarea = this.shadowRoot.querySelector('textarea');
            const commentText = textarea.value.trim();
            if (commentText) {
                const bookId = this.getAttribute('book-id');
                const bookRef = database.ref(`discussions/${bookId}`);
                await bookRef.push({ user: "익명", comment: commentText, timestamp: firebase.database.ServerValue.TIMESTAMP });
                textarea.value = '';
                this.dispatchEvent(new CustomEvent('comment-added', { bubbles: true, composed: true }));
            }
        });
    }
}
customElements.define('comment-form', CommentForm);

// 3. 메인 기능 구현
document.addEventListener('DOMContentLoaded', () => {
    const bookListElement = document.getElementById('book-list');
    const discussionElement = document.getElementById('discussion');
    const addBookForm = document.getElementById('add-book-form');

    const renderBookList = () => {
        bookListElement.innerHTML = '';
        allBooks.forEach(book => {
            const bookCard = document.createElement('book-card');
            bookCard.setAttribute('book-id', book.id);
            bookListElement.appendChild(bookCard);
        });
    };

    // Listen for changes in books data
    database.ref('books').on('value', (snapshot) => {
        const data = snapshot.val();
        allBooks = [];
        for (let id in data) {
            allBooks.push({ id, ...data[id] });
        }
        renderBookList();
    });

    // Listen for changes in discussions data
    database.ref('discussions').on('value', (snapshot) => {
        allDiscussions = snapshot.val() || {};
        // If a discussion thread is active, re-render it to show new comments
        const activeBookCard = document.querySelector('book-card.active');
        if (activeBookCard) {
            const bookId = activeBookCard.getAttribute('book-id');
            discussionElement.innerHTML = ''; // Clear existing discussion
            const discussionThread = document.createElement('discussion-thread');
            discussionThread.setAttribute('book-id', bookId);
            discussionElement.appendChild(discussionThread);
        } else {
            // If no discussion is active, re-render the book list to update discussion counts
            renderBookList();
        }
    });


    if (bookListElement) {
        // 책 카드 클릭 시 토론 표시 (이벤트 위임)
        bookListElement.addEventListener('click', (event) => {
            const bookCard = event.target.closest('book-card');
            if (bookCard) {
                // Remove active class from all cards
                bookListElement.querySelectorAll('book-card').forEach(card => {
                    card.classList.remove('active');
                });
                // Add active class to the clicked card
                bookCard.classList.add('active');

                const bookId = bookCard.getAttribute('book-id');
                
                // 기존 토론 지우기
                discussionElement.innerHTML = '';

                // 새로운 토론 스레드 생성
                const discussionThread = document.createElement('discussion-thread');
                discussionThread.setAttribute('book-id', bookId);
                discussionElement.appendChild(discussionThread);
            }
        });
    }

    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('new-book-title');
            const authorInput = document.getElementById('new-book-author');

            const title = titleInput.value.trim();
            const author = authorInput.value.trim();

            if (title && author) {
                const newBook = {
                    title,
                    author,
                    cover: `https://source.unsplash.com/random/400x600?book&t=${Date.now()}`, // Random placeholder image
                };
                await database.ref('books').push(newBook);
                titleInput.value = '';
                authorInput.value = '';
            }
        });
    }
});
