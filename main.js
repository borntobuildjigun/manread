const canvas = document.getElementById('roulette-wheel');
const spinButton = document.getElementById('spin-button');
const resultElement = document.getElementById('result');
const ctx = canvas.getContext('2d');

const genres = [
    'Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Historical', 'Non-Fiction'
];
const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#795548', '#607D8B'];

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

let isSpinning = false;
let currentRotation = 0;

spinButton.addEventListener('click', () => {
    if (isSpinning) return;

    isSpinning = true;
    resultElement.textContent = '';
    const spinAngle = Math.random() * 360 + 360 * 5; // Spin at least 5 times
    const totalRotation = currentRotation + spinAngle;

    canvas.style.transform = `rotate(${totalRotation}deg)`;
    currentRotation = totalRotation;

    setTimeout(() => {
        const normalizedRotation = totalRotation % 360;
        const selectedIndex = Math.floor((360 - normalizedRotation) / (360 / genres.length));
        resultElement.textContent = `You should read: ${genres[selectedIndex]}`;
        isSpinning = false;
    }, 4000); // Corresponds to the transition duration in CSS
});

drawRouletteWheel();
