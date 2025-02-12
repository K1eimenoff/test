let currentQuestionIndex = 0;
let score = 0;
let filteredQuestions = []; // Глобальная переменная для хранения отфильтрованных вопросов

// Получаем параметр "section" из URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Функция для чтения Excel-файла
async function parseExcel() {
    try {
        const response = await fetch('questions.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const [headers, ...rows] = data; // Разделяем заголовки и строки
        const sectionIndex = headers.indexOf("Раздел");
        const questionIndex = headers.indexOf("Вопрос");
        const optionIndices = [
            headers.indexOf("Вариант 1"),
            headers.indexOf("Вариант 2"),
            headers.indexOf("Вариант 3"),
            headers.indexOf("Вариант 4")
        ];
        const correctAnswerIndex = headers.indexOf("Правильный ответ");
        const uniqueSections = new Set(rows.map(row => row[sectionIndex]?.toString().trim()));
        const questions = rows.map(row => ({
            section: row[sectionIndex]?.toString().trim(),
            question: row[questionIndex]?.toString().trim(),
            options: optionIndices.map(index => row[index]?.toString().trim()),
            correctAnswer: parseInt(row[correctAnswerIndex]?.toString().trim()) || null
        }));
        return { sections: Array.from(uniqueSections), questions };
    } catch (error) {
        console.error("Ошибка при чтении Excel-файла:", error);
        alert("Не удалось загрузить вопросы. Проверьте файл questions.xlsx.");
        window.Telegram.WebApp.close();
    }
}

// Отображение текущего вопроса
function displayQuestion(question) {
    const questionText = document.getElementById('questionText');
    const answerButtonsDiv = document.getElementById('answerButtons');
    const currentQuestionElement = document.getElementById('currentQuestion');
    const totalQuestionsElement = document.getElementById('totalQuestions');
    questionText.textContent = question.question || "Нет вопроса";
    answerButtonsDiv.innerHTML = ''; // Очищаем кнопки
    currentQuestionElement.textContent = currentQuestionIndex + 1; // Текущий вопрос
    totalQuestionsElement.textContent = filteredQuestions.length; // Общее количество вопросов
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option || "Нет варианта";
        button.classList.add('answer-button');
        button.dataset.index = index + 1;
        answerButtonsDiv.appendChild(button);
    });
    // Делегирование событий для кнопок
    answerButtonsDiv.addEventListener('click', handleAnswerClick);
}

// Обработка нажатия на кнопку
function handleAnswerClick(event) {
    const selectedButton = event.target.closest('.answer-button');
    if (!selectedButton) return;
    const selectedOption = parseInt(selectedButton.dataset.index);
    document.querySelectorAll('.answer-button').forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');
    const correctAnswer = filteredQuestions[currentQuestionIndex].correctAnswer;
    const resultMessageRight = document.getElementById('resultMessageRight');
    const resultMessageWrong = document.getElementById('resultMessageWrong');
    if (selectedOption === correctAnswer) {
        score++;
        resultMessageRight.textContent = "Правильно!";
    } else {
        resultMessageWrong.textContent = "Неправильно.";
    }
    setTimeout(() => {
        resultMessageRight.textContent = "";
        resultMessageWrong.textContent = "";
        currentQuestionIndex++;
        if (currentQuestionIndex < filteredQuestions.length) {
            displayQuestion(filteredQuestions[currentQuestionIndex]);
        } else {
            endQuiz();
        }
    }, 1000);
}

// Завершение теста
function endQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    const finalScore = document.getElementById('finalScore');
    const scoreElement = document.getElementById('score');
    quizContainer.style.display = 'none';
    finalScore.style.display = 'block';
    scoreElement.textContent = score;
    const selectedSection = getQueryParam('section'); // Получаем текущий раздел из URL
    const sendData = JSON.stringify({ score, section: selectedSection });
    window.Telegram.WebApp.sendData(sendData);
    window.Telegram.WebApp.close();
}

// Логика теста
async function startQuiz(selectedSection, questions) {
    filteredQuestions = questions.filter(q => q.section === selectedSection);
    if (filteredQuestions.length === 0) {
        alert("В этом разделе нет вопросов.");
        window.Telegram.WebApp.close();
        return;
    }
    localStorage.setItem('filteredQuestions', JSON.stringify(filteredQuestions));
    document.getElementById('quizContainer').style.display = 'block';
    displayQuestion(filteredQuestions[currentQuestionIndex]);
}

// Инициализация Mini App
async function initMiniApp() {
    // Расширяем веб-приложение до полного размера экрана
    window.Telegram.WebApp.expand();

    const selectedSection = getQueryParam('section');
    const { sections, questions } = await parseExcel();
    if (selectedSection) {
        startQuiz(selectedSection, questions);
    } else {
        document.getElementById('userForm').style.display = 'block';
        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const fio = document.getElementById('fio').value;
            const company = document.getElementById('company').value;
            const phone = document.getElementById('phone').value;
            const sendData = JSON.stringify({ fio, company, phone, sections });
            window.Telegram.WebApp.sendData(sendData);
            document.getElementById('userForm').style.display = 'none';
            if (selectedSection) {
                startQuiz(selectedSection, questions);
            }
        });
    }
}

// Инициализация при загрузке страницы
initMiniApp();