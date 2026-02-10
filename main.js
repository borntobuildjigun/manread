document.addEventListener('DOMContentLoaded', () => {
    const numberContainer = document.getElementById('lotto-numbers');
    const generateBtn = document.getElementById('generate-btn');

    const getBallColor = (number) => {
        if (number <= 10) return '#fbc400'; // 노란색
        if (number <= 20) return '#69c8f2'; // 파란색
        if (number <= 30) return '#ff7272'; // 빨간색
        if (number <= 40) return '#aaa';    // 회색
        return '#b0d840';                   // 녹색
    };

    const generateNumbers = () => {
        // 1. 기존 번호 삭제
        numberContainer.innerHTML = '';
        generateBtn.disabled = true;
        generateBtn.textContent = '추첨 중...';

        // 2. 고유 번호 생성 (1~45)
        const numberSet = new Set();
        while (numberSet.size < 6) {
            const randomNumber = Math.floor(Math.random() * 45) + 1;
            numberSet.add(randomNumber);
        }

        // 3. 번호 정렬 및 화면에 표시
        const sortedNumbers = Array.from(numberSet).sort((a, b) => a - b);

        sortedNumbers.forEach((number, index) => {
            setTimeout(() => {
                const ball = document.createElement('div');
                ball.className = 'lotto-ball';
                ball.textContent = number;
                ball.style.backgroundColor = getBallColor(number);
                // 애니메이션 효과를 위한 지연 스타일 적용
                ball.style.animationDelay = `${index * 0.1}s`;
                numberContainer.appendChild(ball);

                // 마지막 공이 생성된 후 버튼 활성화
                if (index === sortedNumbers.length - 1) {
                    setTimeout(() => {
                        generateBtn.disabled = false;
                        generateBtn.textContent = '다시 생성';
                    }, 200);
                }
            }, index * 150); // 순차적으로 공이 나타나도록 지연
        });
    };

    generateBtn.addEventListener('click', generateNumbers);
});