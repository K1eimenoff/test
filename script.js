let currentQuestionIndex = 0;
let score = 0;
let filteredQuestions = [];
let isAnswered = false;
let currentShuffledOptions = [];
let answerHistory = [];

// Инициализация Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
}

// Получение параметра из URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Перемешивание массива
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Парсинг Excel
async function parseExcel() {
    try {
        const response = await fetch('questions.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const [headers, ...rows] = data;

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
        if (window.Telegram && window.Telegram.WebApp) Telegram.WebApp.close();
    }
}

// Отображение вопроса
function displayQuestion(question) {
    const quizContainer = document.getElementById('quizContainer');
    const questionText = document.getElementById('questionText');
    const answerButtonsDiv = document.getElementById('answerButtons');
    const currentQuestionElement = document.getElementById('currentQuestion');
    const totalQuestionsElement = document.getElementById('totalQuestions');
    const currentSection = document.getElementById('CurrentSection');

    isAnswered = false;
    answerButtonsDiv.innerHTML = '';
    currentSection.textContent = question.section;
    questionText.textContent = question.question || "Нет вопроса";
    currentQuestionElement.textContent = currentQuestionIndex + 1;
    totalQuestionsElement.textContent = filteredQuestions.length;

    const optionsWithIndices = question.options
        .map((option, index) => ({ option, originalIndex: index + 1 }))
        .filter(item => item.option && item.option.trim() !== "");

    currentShuffledOptions = shuffleArray(optionsWithIndices);

    currentShuffledOptions.forEach((item, shuffledIndex) => {
        const button = document.createElement('button');
        button.textContent = item.option;
        button.classList.add('answer-button', 'mobile-button');
        button.dataset.originalIndex = item.originalIndex;
        button.dataset.shuffledIndex = shuffledIndex + 1;
        answerButtonsDiv.appendChild(button);
    });

    answerButtonsDiv.addEventListener('click', handleAnswerClick);
}

// Обработка клика по ответу
function handleAnswerClick(event) {
    if (isAnswered) return;
    const selectedButton = event.target.closest('.answer-button');
    if (!selectedButton) return;

    const selectedOriginalIndex = parseInt(selectedButton.dataset.originalIndex);
    const correctAnswer = filteredQuestions[currentQuestionIndex].correctAnswer;
    const isCorrect = selectedOriginalIndex === correctAnswer;

    // Записываем историю ответа
    answerHistory.push({
        question: filteredQuestions[currentQuestionIndex].question,
        userAnswer: selectedOriginalIndex,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        options: filteredQuestions[currentQuestionIndex].options.filter(opt => opt && opt.trim() !== "")
    });

    document.querySelectorAll('.answer-button').forEach(btn => btn.classList.remove('selected'));
    selectedButton.classList.add('selected');
    isAnswered = true;

    const answerButtonsDiv = document.getElementById('answerButtons');
    answerButtonsDiv.removeEventListener('click', handleAnswerClick);

    if (isCorrect) {
        score++;
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < filteredQuestions.length) {
            displayQuestion(filteredQuestions[currentQuestionIndex]);
        } else {
            endQuiz();
        }
    }, 2000);

}

// Завершение квиза
function endQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    const finalScore = document.getElementById('finalScore');
    const scoreElement = document.getElementById('score');
    const selectedSection = getQueryParam('section');

    quizContainer.style.display = 'none';
    finalScore.style.display = 'block';
    scoreElement.textContent = score;

    const sendData = JSON.stringify({ 
        score, 
        section: selectedSection,
        answerHistory: answerHistory 
    });

    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.sendData(sendData);
    } else {
        console.log("Данные (тестовый режим):", sendData);
    }
}

// Начало квиза
async function startQuiz(selectedSection, questions) {
    filteredQuestions = questions.filter(q => q.section === selectedSection);
    if (filteredQuestions.length === 0) {
        alert("В этом разделе нет вопросов.");
        if (window.Telegram && window.Telegram.WebApp) Telegram.WebApp.close();
        return;
    }

    // Сбрасываем историю и счет при начале нового квиза
    answerHistory = [];
    score = 0;
    currentQuestionIndex = 0;

    document.getElementById('quizContainer').style.display = 'block';
    displayQuestion(filteredQuestions[currentQuestionIndex]);
}

// Обработка формы регистрации
function setupForm(questions) {
    const form = document.getElementById('userForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fio = document.getElementById('fio').value.trim();
        const company = document.getElementById('company').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!fio || !company || !phone) {
            alert("Пожалуйста, заполните все поля");
            return;
        }

        const sendData = JSON.stringify({
            fio,
            company,
            phone,
            sections: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26"]
        });

        if (window.Telegram && window.Telegram.WebApp) {
            Telegram.WebApp.sendData(sendData);
        } else {
            console.log("Отправленные данные (тест):", sendData);
        }

        form.style.display = 'none';

        const selectedSection = getQueryParam('section');
        if (selectedSection) {
            startQuiz(selectedSection, questions);
        }
    });
}

// Инициализация Mini App
async function initMiniApp() {
    const selectedSection = getQueryParam('section');

    try {
        const { sections, questions } = await parseExcel();

        if (selectedSection) {
            startQuiz(selectedSection, questions);
        } else {
            document.getElementById('userForm').style.display = 'block';
            setupForm(questions);
        }
    } catch (e) {
        console.error("Ошибка при инициализации Mini App:", e);
    }
}


// Запуск приложения
initMiniApp();