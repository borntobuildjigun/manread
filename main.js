const canvas = document.getElementById('roulette-wheel');
const spinButton = document.getElementById('spin-button');
const resultElement = document.getElementById('result');
const recommendationsElement = document.getElementById('recommendations');
const bookListElement = document.getElementById('book-list');
const ctx = canvas.getContext('2d');

const genres = [
    'Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Historical', 'Non-Fiction'
];
const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#795548', '#607D8B'];

const bookDatabase = {
    'Fantasy': ['The Hobbit', 'A Wizard of Earthsea', 'The Name of the Wind', 'Mistborn: The Final Empire', 'The Lies of Locke Lamora'],
    'Sci-Fi': ['Dune', 'Ender\'s Game', 'Neuromancer', 'The Hitchhiker\'s Guide to the Galaxy', 'Foundation'],
    'Mystery': ['The Adventures of Sherlock Holmes', 'And Then There Were None', 'The Big Sleep', 'Gone Girl', 'The Girl with the Dragon Tattoo'],
    'Thriller': ['The Silence of the Lambs', 'The Da Vinci Code', 'The Girl on the Train', 'Before I Go to Sleep', 'The Guest List'],
    'Romance': ['Pride and Prejudice', 'Outlander', 'The Notebook', 'Me Before You', 'The Hating Game'],
    'Horror': ['The Shining', 'It', 'Dracula', 'Frankenstein', 'The Haunting of Hill House'],
    'Historical': ['The Other Boleyn Girl', 'All the Light We Cannot See', 'The Book Thief', 'The Nightingale', 'Wolf Hall'],
    'Non-Fiction': ['Sapiens: A Brief History of Humankind', 'Educated', 'The Immortal Life of Henrietta Lacks', 'Thinking, Fast and Slow', 'Becoming']
};

const sliceAngle = 2 * Math.PI / genres.length;

function drawRouletteWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    genres.forEach((genre, i) => {
        const startAngle = i * sliceAngle;
        const endAngle = (i + 1) * sliceAngle;

        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.arc(200, 200, 200, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();

        ctx.save();
        ctx.translate(200, 200);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(genre, 180, 10);
        ctx.restore();
    });
}

function displayBooks(books) {
    bookListElement.innerHTML = '';
    books.forEach(book => {
        const li = document.createElement('li');
        li.textContent = book;
        bookListElement.appendChild(li);
    });
}

let isSpinning = false;
let currentRotation = 0;

spinButton.addEventListener('click', () => {
    if (isSpinning) return;

    isSpinning = true;
    resultElement.textContent = '';
    recommendationsElement.style.display = 'none';
    bookListElement.innerHTML = '';

    const spinAngle = Math.random() * 360 + 360 * 5; // Spin at least 5 times
    const totalRotation = currentRotation + spinAngle;

    canvas.style.transform = `rotate(${totalRotation}deg)`;
    currentRotation = totalRotation;

    setTimeout(() => {
        const normalizedRotation = totalRotation % 360;
        const selectedIndex = Math.floor((360 - normalizedRotation) / (360 / genres.length));
        const selectedGenre = genres[selectedIndex];
        
        resultElement.textContent = `You should read: ${selectedGenre}`;
        
        const books = bookDatabase[selectedGenre];
        displayBooks(books);
        recommendationsElement.style.display = 'block';
        
        isSpinning = false;
    }, 4000); // Corresponds to the transition duration in CSS
});

drawRouletteWheel();
