// 1. 데이터 구조 정의 (샘플 데이터)
const books = [
    {
        id: 1,
        title: "데미안",
        author: "헤르만 헤세",
        cover: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        discussions: [
            { user: "철학자", comment: "이 책은 자아 발견의 여정을 정말 잘 그려냈어요." },
            { user: "여행자", comment: "싱클레어의 성장이 인상 깊었습니다." }
        ]
    },
    {
        id: 2,
        title: "어린왕자",
        author: "생텍쥐페리",
        cover: "https://images.pexels.com/photos/34620/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        discussions: [
            { user: "어른이", comment: "어른이 되어서 읽으니 또 다른 감동이 있네요." }
        ]
    },
    {
        id: 3,
        title: "노인과 바다",
        author: "어니스트 헤밍웨이",
        cover: "https://images.pexels.com/photos/415071/pexels-photo-415071.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        discussions: []
    }
];

// 2. UI 컴포넌트 개발 (웹 컴포넌트)
class BookCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const bookId = this.getAttribute('book-id');
        const book = books.find(b => b.id == bookId);

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
                        <span class="discussion-count">토론 ${book.discussions.length}개</span>
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
        const book = books.find(b => b.id == bookId);

        if (book) {
            const discussionsHtml = book.discussions.map(d => `
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
                    const book = books.find(b => b.id == bookId);
                    const countElement = bookCard.shadowRoot.querySelector('.discussion-count');
                    if(countElement) {
                        countElement.textContent = `토론 ${book.discussions.length}개`;
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

        this.shadowRoot.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const textarea = this.shadowRoot.querySelector('textarea');
            const commentText = textarea.value.trim();
            if (commentText) {
                const bookId = this.getAttribute('book-id');
                const book = books.find(b => b.id == bookId);
                if (book) {
                    book.discussions.push({ user: "익명", comment: commentText });
                    textarea.value = '';
                    this.dispatchEvent(new CustomEvent('comment-added', { bubbles: true, composed: true }));
                }
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
        books.forEach(book => {
            const bookCard = document.createElement('book-card');
            bookCard.setAttribute('book-id', book.id);
            bookListElement.appendChild(bookCard);
        });
    };

    if (bookListElement) {
        // 초기 책 목록 렌더링
        renderBookList();

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
        addBookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('new-book-title');
            const authorInput = document.getElementById('new-book-author');

            const title = titleInput.value.trim();
            const author = authorInput.value.trim();

            if (title && author) {
                const newBook = {
                    id: Date.now(), // Use timestamp for a simple unique ID
                    title,
                    author,
                    cover: `https://source.unsplash.com/random/400x600?book&t=${Date.now()}`, // Random placeholder image
                    discussions: []
                };
                books.push(newBook);
                renderBookList();
                titleInput.value = '';
                authorInput.value = '';
            }
        });
    }
});
