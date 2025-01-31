document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('user-info');
    const sectionSelect = document.getElementById('section-select');
    const quiz = document.getElementById('quiz');
    const result = document.getElementById('result');
    const startQuizButton = document.getElementById('start-quiz');
    const sectionsDiv = document.getElementById('sections');
    const questionDiv = document.getElementById('question');
    const answersDiv = document.getElementById('answers');
    const scoreDiv = document.getElementById('score');

    let questions = [];
    let currentSection = '';
    let currentQuestionIndex = 0;
    let score = 0;
    let userData = {};

    startQuizButton.addEventListener('click', () => {
        userData.name = document.getElementById('name').value;
        userData.company = document.getElementById('company').value;
        userData.phone = document.getElementById('phone').value;

        if (userData.name && userData.company && userData.phone) {
            userInfo.style.display = 'none';
            sectionSelect.style.display = 'block';
            loadQuestions();
        } else {
            alert('Пожалуйста, заполните все поля.');
        }
    });

    function loadQuestions() {
        fetch('questions.csv')
            .then(response => response.text())
            .then(data => {
                console.log('CSV data:', data); // Отладка
                questions = parseCSV(data);
                displaySections();
            })
            .catch(error => console.error('Error loading questions:', error)); // Отладка
    }

    function parseCSV(data) {
        const rows = data.split('\n');
        const headers = rows[0].split(';'); // Используем точку с запятой
        const questions = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(';'); // Используем точку с запятой
            if (row.length === headers.length) {
                const question = {};
                for (let j = 0; j < headers.length; j++) {
                    question[headers[j].trim()] = row[j].trim(); // Убираем лишние пробелы
                }
                questions.push(question);
            }
        }

        console.log('Parsed questions:', questions); // Отладка
        return questions;
    }

    function displaySections() {
        const sections = [...new Set(questions.map(q => q.Section))]; // Используем "Section"
        console.log('Sections:', sections); // Отладка

        sectionsDiv.innerHTML = ''; // Очистка предыдущих кнопок
        sections.forEach(section => {
            const button = document.createElement('button');
            button.textContent = section;
            button.addEventListener('click', () => startSection(section));
            sectionsDiv.appendChild(button);
        });

        console.log('Buttons created:', sectionsDiv.innerHTML); // Отладка
    }

    function startSection(section) {
        currentSection = section;
        currentQuestionIndex = 0;
        sectionSelect.style.display = 'none';
        quiz.style.display = 'block';
        displayQuestion();
    }

    function displayQuestion() {
        const sectionQuestions = questions.filter(q => q.Section === currentSection); // Используем "Section"
        if (currentQuestionIndex < sectionQuestions.length) {
            const question = sectionQuestions[currentQuestionIndex];
            questionDiv.textContent = question.Question; // Используем "Question"
            answersDiv.innerHTML = '';
            for (let i = 1; i <= 4; i++) {
                const answer = question[`answer${i}`];
                if (answer) {
                    const button = document.createElement('button');
                    button.textContent = answer;
                    button.addEventListener('click', () => checkAnswer(question.Correct, answer)); // Используем "Correct"
                    answersDiv.appendChild(button);
                }
            }
        } else {
            endSection();
        }
    }

    function checkAnswer(correctAnswer, selectedAnswer) {
        if (selectedAnswer === correctAnswer) {
            score++;
        }
        currentQuestionIndex++;
        displayQuestion();
    }

    function endSection() {
        quiz.style.display = 'none';
        sectionSelect.style.display = 'block';
        const sectionButton = Array.from(sectionsDiv.children).find(button => button.textContent === currentSection);
        if (sectionButton) {
            sectionButton.style.display = 'none';
        }
        if (Array.from(sectionsDiv.children).every(button => button.style.display === 'none')) {
            showResult();
        }
    }

    function showResult() {
        sectionSelect.style.display = 'none';
        result.style.display = 'block';
        scoreDiv.textContent = `Ваш результат: ${score} из ${questions.length}`;
    }

    function showResult() {
        sectionSelect.style.display = 'none';
        result.style.display = 'block';
        scoreDiv.textContent = `Ваш результат: ${score} из ${questions.length}`;
        SentToTelegram();
    }

    function SentToTelegram(){
   
    let tg = window.Telegram.WebApp;

    // Данные пользователя
    tg.sendData(JSON.stringify({ user_id: tg.initDataUnsafe.user.id,
                               first_name: tg.initDataUnsafe.user.first_name,
                               last_name: tg.initDataUnsafe.user.last_name,
                               ///name: document.getElementById('name').value,
                                ///company: document.getElementById('company').value,
                                ///phone: document.getElementById('phone').value,
                                score: score}));
        
    
}
});