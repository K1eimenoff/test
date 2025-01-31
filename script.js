document.addEventListener('DOMContentLoaded', () => {
    const userInfo = document.getElementById('user-info');
    const quizSection = document.getElementById('quiz-section');
    const quiz = document.getElementById('quiz');
    const result = document.getElementById('result');
    const startQuizButton = document.getElementById('start-quiz');
    const sectionButtons = document.getElementById('section-buttons');
    const questionElement = document.getElementById('question');
    const optionsElement = document.getElementById('options');
    const scoreElement = document.getElementById('score');

    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userData = {};
    //let tg = window.Telegram.WebApp


    // Начало квиза
    startQuizButton.addEventListener('click', () => {
        userData = {
            //user_id: tg.initDataUnsafe.user.id,
            //lname: tg.initDataUnsafe.user.last_name,
            name: document.getElementById('name').value,
            workplace: document.getElementById('workplace').value,
            phone: document.getElementById('phone').value
        };
        userInfo.style.display = 'none';
        quizSection.style.display = 'block';
        loadQuestions();
    });

    // Загрузка вопросов из CSV
    function loadQuestions() {
        fetch('questions.csv')
            .then(response => response.text())
            .then(data => {
                questions = parseCSV(data);
                const sections = [...new Set(questions.map(q => q.Раздел))].filter(section => section);
                console.log('Уникальные разделы:', sections); // Проверка разделов

                // Создаем кнопки для выбора раздела
                sectionButtons.innerHTML = '';
                sections.forEach(section => {
                    const button = document.createElement('button');
                    button.textContent = section;
                    button.addEventListener('click', () => startQuiz(section));
                    sectionButtons.appendChild(button);
                });
            })
            .catch(error => console.error('Ошибка:', error));
    }

    // Парсинг CSV
    function parseCSV(data) {
        const lines = data.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(';').map(header => header.trim());
        return lines.slice(1).map(line => {
            const values = line.split(';').map(value => value.trim());
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
    }

    // Начало квиза для выбранного раздела
    function startQuiz(selectedSection) {
        const sectionQuestions = questions.filter(q => q.Раздел === selectedSection);
        questions = sectionQuestions;
        currentQuestionIndex = 0;
        score = 0;
        quizSection.style.display = 'none';
        quiz.style.display = 'block';
        showQuestion();
    }

    // Отображение вопроса
    function showQuestion() {
        const question = questions[currentQuestionIndex];
        questionElement.textContent = question.Вопрос;
        optionsElement.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const optionText = question[`Вариант ${i}`];
            if (optionText) {
                const option = document.createElement('button');
                option.textContent = optionText;
                option.addEventListener('click', () => checkAnswer(option.textContent, question['Правильный ответ']));
                optionsElement.appendChild(option);
            }
        }
    }

    // Проверка ответа и автоматический переход к следующему вопросу
    function checkAnswer(selectedAnswer, correctAnswer) {
        if (selectedAnswer === correctAnswer) {
            score++;
        }
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            showQuestion(); // Автоматический переход к следующему вопросу
        } else {
            showResult(); // Показ результата, если вопросы закончились
        }
    }

    // Отображение результата
    function showResult() {
        quiz.style.display = 'none';
        result.style.display = 'block';
        scoreElement.textContent = `Ваш результат: ${score} из ${questions.length}`;
        saveResult();
    }

    // Сохранение результата в Google Sheets
    function saveResult() {
        const resultData = {
            ...userData,
            score: score,
            total: questions.length
        };
        fetch('https://script.google.com/macros/s/AKfycbwezfmfJLHSbd4inV8-eIoxjUT1d8al-XMEyMArzS0ff_2cwxPpYCRx2mAtCwbzKk6s/exec', {
            method: 'POST',
            body: JSON.stringify(resultData)
        });
    }
});
