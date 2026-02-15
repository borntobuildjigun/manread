document.addEventListener('DOMContentLoaded', () => {
    // --- Common elements and initial setup ---
    const htmlElement = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const langToggle = document.getElementById('lang-toggle');
    
    const translations = {
        'en': {
            'document_title_index': 'Book Genre Roulette',
            'document_title_about': 'About Us - Book Roulette',
            'document_title_contact': 'Contact Us - Book Roulette',
            'document_title_privacy': 'Privacy Policy - Book Roulette',
            'document_title_book_template': 'Book Title - Book Roulette',

            'nav_home': 'Home',
            'nav_about': 'About',
            'nav_contact': 'Contact',
            'privacy_link_text': 'Privacy Policy',

            'index_title': 'Find Your Next Read',
            'index_description': 'Spin the wheel to get a random book genre, and we\'ll recommend some great books for you to check out!',
            'spin_button_text': 'Spin',
            'result_text_prefix': 'You should read: ', // Prefix for result
            'recommendations_title': 'Top 5 Recommendations:',

            'about_title': 'About Us',
            'about_p1': 'Welcome to Book Roulette, your friendly guide to discovering your next great read! We believe that reading should be an adventure, and sometimes, the best adventures are the ones you don\'t plan for.',
            'about_p2': 'Our mission is to help you break out of your reading comfort zone and explore new genres in a fun and interactive way. Just spin the wheel, and let fate decide what kind of story you\'ll dive into next. We provide a curated list of top-rated books for each genre to get you started.',
            'about_p3': 'Happy reading!',

            'contact_title': 'Contact Us',
            'contact_p1': 'Have questions, suggestions, or just want to say hello? We\'d love to hear from you!',
            'contact_p2_prefix': 'You can reach us by email at: ', // Prefix for contact email

            'privacy_title': 'Privacy Policy for Book Roulette',
            'privacy_p1': 'At Book Roulette, accessible from bookroulette.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Book Roulette and how we use it.',
            'log_files_title': 'Log Files',
            'log_files_p1': 'Book Roulette follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services\' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users\' movement on the website, and gathering demographic information.',
            'cookies_title': 'Cookies and Web Beacons',
            'cookies_p1': 'Like any other website, Book Roulette uses \'cookies\'. These cookies are used to store information including visitors\' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users\' experience by customizing our web page content based on visitors\' browser type and/or other information.',
            'adsense_title': 'Google AdSense',
            'adsense_p1': 'We use Google AdSense Advertising on our website. Google, as a third-party vendor, uses cookies to serve ads on our site. Google\'s use of the DART cookie enables it to serve ads to our users based on previous visits to our site and other sites on the Internet. Users may opt-out of the use of the DART cookie by visiting the Google Ad and Content Network privacy policy.',
            'privacy_policies_title': 'Privacy Policies',
            'privacy_policies_p1': 'You may consult this list to find the Privacy Policy for each of the advertising partners of Book Roulette.',
            'privacy_policies_p2': 'Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Book Roulette, which are sent directly to users\' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.',
            'privacy_policies_p3': 'Note that Book Roulette has no access to or control over these cookies that are used by third-party advertisers.',
            'third_party_privacy_title': 'Third Party Privacy Policies',
            'third_party_privacy_p1': 'Book Roulette\'s Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.',
            'online_privacy_only_title': 'Online Privacy Policy Only',
            'online_privacy_only_p1': 'This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in Book Roulette. This policy is not applicable to any information collected offline or via channels other than this website.',
            'consent_title': 'Consent',
            'consent_p1': 'By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.',

            'book_title': '[Book Title]', // Placeholder for dynamic content
            'book_author_prefix': 'by ', // Prefix for dynamic content
            'summary_title': 'Summary',
            'summary_content_placeholder': '[Book summary will go here. This section will contain a unique and interesting summary of the book, to provide value to the user and meet AdSense content requirements.]',
            'why_recommend_title': 'Why we recommend this book',
            'why_recommend_content_placeholder': '[A short paragraph explaining why this book is a great read and a good representation of its genre.]'
        },
        'ko': {
            'document_title_index': '책 장르 룰렛',
            'document_title_about': '회사 소개 - 책 룰렛',
            'document_title_contact': '문의하기 - 책 룰렛',
            'document_title_privacy': '개인정보처리방침 - 책 룰렛',
            'document_title_book_template': '책 제목 - 책 룰렛',

            'nav_home': '홈',
            'nav_about': '회사 소개',
            'nav_contact': '문의하기',
            'privacy_link_text': '개인정보처리방침',

            'index_title': '다음 읽을 책 찾기',
            'index_description': '룰렛을 돌려 무작위 책 장르를 얻고, 멋진 책들을 추천해 드립니다!',
            'spin_button_text': '돌리기',
            'result_text_prefix': '읽어야 할 책:',
            'recommendations_title': '상위 5개 추천 도서:',

            'about_title': '회사 소개',
            'about_p1': '책 룰렛에 오신 것을 환영합니다! 다음 멋진 책을 발견하는 데 도움이 되는 친근한 가이드입니다. 독서는 모험이어야 한다고 믿으며, 때로는 계획하지 않은 모험이 최고라고 생각합니다.',
            'about_p2': '저희의 미션은 여러분이 독서의 편안한 영역을 벗어나 재미있고 상호작용적인 방식으로 새로운 장르를 탐험하도록 돕는 것입니다. 룰렛을 돌려 운명에 따라 어떤 이야기에 빠져들지 결정하세요. 시작하는 데 도움이 되는 각 장르별 최고 평점 도서 목록을 제공합니다.',
            'about_p3': '즐거운 독서 되세요!',

            'contact_title': '문의하기',
            'contact_p1': '질문, 제안이 있으시거나 그냥 인사하고 싶으시면 언제든지 연락 주세요!',
            'contact_p2_prefix': '이메일 주소: ',

            'privacy_title': '책 룰렛 개인정보처리방침',
            'privacy_p1': '책 룰렛(bookroulette.com)에서는 방문자의 개인 정보 보호를 최우선으로 생각합니다. 본 개인정보처리방침 문서는 책 룰렛에서 수집 및 기록되는 정보 유형과 해당 정보를 사용하는 방법을 설명합니다.',
            'log_files_title': '로그 파일',
            'log_files_p1': '책 룰렛은 로그 파일 사용에 대한 표준 절차를 따릅니다. 이 파일은 방문자가 웹사이트를 방문할 때 기록됩니다. 모든 호스팅 회사는 이를 수행하며 호스팅 서비스 분석의 일부입니다. 로그 파일이 수집하는 정보에는 인터넷 프로토콜(IP) 주소, 브라우저 유형, 인터넷 서비스 제공업체(ISP), 날짜 및 시간 스탬프, 참조/종료 페이지, 그리고 클릭 수가 포함될 수 있습니다. 이들은 개인 식별 정보와 연결되지 않습니다. 정보의 목적은 추세 분석, 사이트 관리, 웹사이트에서 사용자 이동 추적, 인구 통계 정보 수집입니다.',
            'cookies_title': '쿠키 및 웹 비콘',
            'cookies_p1': '다른 웹사이트와 마찬가지로 책 룰렛도 \'쿠키\'를 사용합니다. 이 쿠키는 방문자의 기본 설정 및 방문자가 액세스하거나 방문한 웹사이트의 페이지를 포함한 정보를 저장하는 데 사용됩니다. 이 정보는 방문자의 브라우저 유형 및/또는 기타 정보에 따라 웹 페이지 콘텐츠를 맞춤 설정하여 사용자 경험을 최적화하는 데 사용됩니다.',
            'adsense_title': 'Google AdSense',
            'adsense_p1': '저희는 웹사이트에서 Google AdSense 광고를 사용합니다. Google은 타사 공급업체로서 쿠키를 사용하여 저희 사이트에 광고를 게재합니다. Google의 DART 쿠키 사용은 저희 사이트 및 인터넷의 다른 사이트에 대한 이전 방문을 기반으로 사용자에게 광고를 게재할 수 있도록 합니다. 사용자는 Google 광고 및 콘텐츠 네트워크 개인 정보 보호 정책을 방문하여 DART 쿠키 사용을 거부할 수 있습니다.',
            'privacy_policies_title': '개인정보처리방침',
            'privacy_policies_p1': '이 목록을 참조하여 책 룰렛의 각 광고 파트너에 대한 개인정보처리방침을 확인할 수 있습니다.',
            'privacy_policies_p2': '타사 광고 서버 또는 광고 네트워크는 쿠키, JavaScript 또는 웹 비콘과 같은 기술을 사용하며, 이는 책 룰렛에 표시되는 해당 광고 및 링크에 사용되며 사용자 브라우저로 직접 전송됩니다. 이 경우 자동으로 IP 주소를 수신합니다. 이러한 기술은 광고 캠페인의 효과를 측정하고/하거나 방문하는 웹사이트에서 보는 광고 콘텐츠를 개인화하는 데 사용됩니다.',
            'privacy_policies_p3': '책 룰렛은 타사 광고주가 사용하는 이 쿠키에 대한 접근 또는 통제 권한이 없습니다.',
            'third_party_privacy_title': '타사 개인정보처리방침',
            'third_party_privacy_p1': '책 룰렛의 개인정보처리방침은 다른 광고주 또는 웹사이트에는 적용되지 않습니다. 따라서 더 자세한 정보를 위해 이 타사 광고 서버의 해당 개인정보처리방침을 참조하도록 조언합니다. 여기에는 특정 옵션에서 옵트아웃하는 방법에 대한 관행 및 지침이 포함될 수 있습니다.',
            'online_privacy_only_title': '온라인 개인정보처리방침만 해당',
            'online_privacy_only_p1': '본 개인정보처리방침은 당사의 온라인 활동에만 적용되며, 책 룰렛에서 공유 및/또는 수집한 정보와 관련하여 당사 웹사이트 방문자에게 유효합니다. 이 정책은 오프라인 또는 이 웹사이트 이외의 채널을 통해 수집된 정보에는 적용되지 않습니다.',
            'consent_title': '동의',
            'consent_p1': '당사 웹사이트를 사용함으로써 귀하는 본 개인정보처리방침에 동의하고 약관에 동의합니다.',

            'book_title': '[책 제목]', // Placeholder for dynamic content
            'book_author_prefix': '저자: ', // Prefix for dynamic content
            'summary_title': '요약',
            'summary_content_placeholder': '[책 요약이 여기에 들어갑니다. 이 섹션에는 사용자에게 가치를 제공하고 애드센스 콘텐츠 요구 사항을 충족하기 위한 독특하고 흥미로운 책 요약이 포함됩니다.]',
            'why_recommend_title': '이 책을 추천하는 이유',
            'why_recommend_content_placeholder': '[이 책이 훌륭한 읽을거리이자 해당 장르를 잘 대표하는 이유를 설명하는 짧은 단락입니다.]'
        }
    };

    function setLanguage(lang) {
        htmlElement.lang = lang; // Update html lang attribute

        const pageKey = document.body.dataset.pageKey;
        if (pageKey && translations[lang][`document_title_${pageKey}`]) {
            document.title = translations[lang][`document_title_${pageKey}`];
        }

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                if (key.startsWith('contact_p2_prefix')) {
                    element.innerHTML = translations[lang][key] + `<a href="mailto:contact@bookroulette.com">contact@bookroulette.com</a>`;
                } else if (key.startsWith('result_text_prefix')) {
                    // This will be handled when roulette result is displayed
                    // For initial load, just set the prefix if it's the index page
                    if (pageKey === 'index' && resultElement) {
                        resultElement.textContent = translations[lang][key] + (resultElement.textContent.includes(':') ? resultElement.textContent.split(':')[1].trim() : '');
                    }
                } else if (key === 'book_author_prefix' && element.classList.contains('author')) {
                    // Handle dynamic author prefix for book-template
                    element.textContent = translations[lang][key] + (element.textContent.includes('by ') ? element.textContent.split('by ')[1] : element.textContent);
                } else if (key.endsWith('_placeholder') || key.includes('book_title')) {
                    // Placeholders or dynamic book titles/summaries are not translated here
                    // They will be dynamically inserted or are just for template
                }
                else {
                    element.textContent = translations[lang][key];
                }
            }
        });
        
        if (langToggle) {
            langToggle.textContent = (lang === 'en') ? '🇰🇷' : '🇺🇸';
            langToggle.setAttribute('data-lang', (lang === 'en') ? 'ko' : 'en');
        }
        localStorage.setItem('language', lang);
    }

    // Set a data-page-key on body for document title translation
    const pageFileName = window.location.pathname.split('/').pop();
    if (pageFileName === 'index.html' || pageFileName === '') {
        document.body.dataset.pageKey = 'index';
    } else if (pageFileName === 'about.html') {
        document.body.dataset.pageKey = 'about';
    } else if (pageFileName === 'contact.html') {
        document.body.dataset.pageKey = 'contact';
    } else if (pageFileName === 'privacy.html') {
        document.body.dataset.pageKey = 'privacy';
    } else if (pageFileName.startsWith('book-')) { // Generic for book detail pages
        document.body.dataset.pageKey = 'book_template';
    }


    // --- Roulette-specific code (only on index.html) ---
    if (canvas) { // Check if canvas exists on this page
        const ctx = canvas.getContext('2d');
        const spinButton = document.getElementById('spin-button');
        const resultElement = document.getElementById('result');
        const recommendationsElement = document.getElementById('recommendations');
        const bookListElement = document.getElementById('book-list');

        const genres = [
            'Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Historical', 'Non-Fiction'
        ];
        const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#795548', '#607D8B'];
        const sliceAngle = 2 * Math.PI / genres.length;

        function drawRouletteWheel() {
            if (!ctx) return; // Guard against null ctx
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
        
        if (spinButton) {
            spinButton.addEventListener('click', () => {
                if (isSpinning) return;

                isSpinning = true;
                if (resultElement) resultElement.textContent = '';
                if (recommendationsElement) recommendationsElement.style.display = 'none';
                if (bookListElement) bookListElement.innerHTML = '';

                const spinAngle = Math.random() * 360 + 360 * 5; // Spin at least 5 times
                const totalRotation = currentRotation + spinAngle;

                canvas.style.transform = `rotate(${totalRotation}deg)`;
                currentRotation = totalRotation;

                setTimeout(() => {
                    const normalizedRotation = (totalRotation % 360 + 360) % 360; // Ensure positive rotation
                    const selectedIndex = Math.floor((360 - normalizedRotation) / (360 / genres.length));
                    const selectedGenre = genres[selectedIndex];
                    
                    if (resultElement) {
                        const currentLang = localStorage.getItem('language') || 'en';
                        resultElement.textContent = translations[currentLang]['result_text_prefix'] + selectedGenre;
                    }
                    
                    const books = bookDatabase[selectedGenre];
                    displayBooks(books, selectedGenre);
                    if (recommendationsElement) recommendationsElement.style.display = 'block';
                    
                    isSpinning = false;
                }, 4000); // Corresponds to the transition duration in CSS
            });
        }
        drawRouletteWheel(); // Initial draw of the roulette wheel
    }


    // --- Theme toggle functionality ---
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            themeToggle.textContent = isDarkMode ? '🌙' : '☀️';
        });

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '🌙';
        } else {
            // Default is light mode, no class needed, ensure button shows sun
            document.body.classList.remove('dark-mode');
            themeToggle.textContent = '☀️';
        }
    }


    // --- Language toggle functionality ---
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const currentLang = localStorage.getItem('language') || 'en';
            const newLang = (currentLang === 'en') ? 'ko' : 'en';
            setLanguage(newLang);
        });

        // Apply saved language on page load
        const savedLang = localStorage.getItem('language') || 'en';
        setLanguage(savedLang); // Initial language setting

    } else {
        // If no langToggle, still apply default language to translatable elements
        const savedLang = localStorage.getItem('language') || 'en';
        setLanguage(savedLang);
    }
    

    // --- Global helper functions (can be called from various parts of the script) ---
    let isSpinning = false; // Moved to a higher scope if needed by roulette
    let currentRotation = 0; // Moved to a higher scope if needed by roulette

    function displayBooks(books, selectedGenre) {
        if (!bookListElement) return; // Guard for pages without book list

        bookListElement.innerHTML = '';
        books.forEach(book => {
            const li = document.createElement('li');
            const bookSlug = book.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            li.innerHTML = `<a href="book-${bookSlug}.html">${book}</a>`; 
            bookListElement.appendChild(li);
        });
    }

});
