let currentQuestionIndex = 0;
let score = 0;
let filteredQuestions = []; // Глобальная переменная для хранения отфильтрованных вопросов
let isAnswered = false; // Флаг для отслеживания состояния вопроса
let currentShuffledOptions = []; // Для хранения перемешанных вариантов текущего вопроса

// Получаем параметр "section" из URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Функция для перемешивания массива (алгоритм Фишера-Йетса)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
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

function displayQuestion(question) {
    const quizContainer = document.getElementById('quizContainer');
    const questionText = document.getElementById('questionText');
    const answerButtonsDiv = document.getElementById('answerButtons');
    const currentQuestionElement = document.getElementById('currentQuestion');
    const totalQuestionsElement = document.getElementById('totalQuestions');
    const currentSection = document.getElementById('CurrentSection');

    // Сбрасываем флаг и очищаем выбранный вариант
    isAnswered = false;
    document.querySelectorAll('.answer-button').forEach(button => button.classList.remove('selected'));

    // Очищаем кнопки
    answerButtonsDiv.innerHTML = '';

    // Устанавливаем текст вопроса
    currentSection.textContent = question.section;
    questionText.textContent = question.question || "Нет вопроса";
    currentQuestionElement.textContent = currentQuestionIndex + 1; // Текущий вопрос
    totalQuestionsElement.textContent = filteredQuestions.length; // Общее количество вопросов

    // Создаем массив объектов с вариантами и их оригинальными индексами
    const optionsWithIndices = question.options
        .map((option, index) => ({ option, originalIndex: index + 1 }))
        .filter(item => item.option && item.option.trim() !== "");

    // Перемешиваем варианты ответов
    currentShuffledOptions = shuffleArray(optionsWithIndices);

    // Создаем кнопки для перемешанных вариантов
    currentShuffledOptions.forEach((item, shuffledIndex) => {
        const button = document.createElement('button');
        button.textContent = item.option;
        button.classList.add('answer-button');
        button.dataset.originalIndex = item.originalIndex; // Сохраняем оригинальный индекс
        button.dataset.shuffledIndex = shuffledIndex + 1; // И новый перемешанный индекс
        answerButtonsDiv.appendChild(button);
    });

    // Добавляем обработчик событий для кнопок
    answerButtonsDiv.addEventListener('click', handleAnswerClick);
}

// Обработка нажатия на кнопку
function handleAnswerClick(event) {
    if (isAnswered) return; // Если вопрос уже отвечен, игнорируем клик
    const selectedButton = event.target.closest('.answer-button');
    if (!selectedButton) return;

    const selectedOriginalIndex = parseInt(selectedButton.dataset.originalIndex);
    const correctAnswer = filteredQuestions[currentQuestionIndex].correctAnswer;

    // Помечаем выбранный вариант
    document.querySelectorAll('.answer-button').forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');

    // Проверяем правильность ответа (по оригинальному индексу)
    if (selectedOriginalIndex === correctAnswer) {
        score++;
    }

    // Устанавливаем флаг, что вопрос уже отвечен
    isAnswered = true;

    // Удаляем обработчик событий для кнопок, чтобы блокировать повторные нажатия
    const answerButtonsDiv = document.getElementById('answerButtons');
    answerButtonsDiv.removeEventListener('click', handleAnswerClick);

    // Переход к следующему вопросу через 2 секунды
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < filteredQuestions.length) {
            displayQuestion(filteredQuestions[currentQuestionIndex]);
        } else {
            endQuiz();
        }
    }, 2000);
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

if (window.DeviceMotionEvent) {
    let lastX = 0, lastY = 0;
    const sensitivity = 30;
    const liquidBg = document.querySelector('.liquid-bg');
    
    window.addEventListener('devicemotion', function(e) {
        // Получаем данные акселерометра
        const acceleration = e.accelerationIncludingGravity;
        
        // Вычисляем изменение положения
        const deltaX = (acceleration.x - lastX) * sensitivity;
        const deltaY = (acceleration.y - lastY) * sensitivity;
        
        // Применяем трансформацию к фону
        liquidBg.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate3d(${deltaX/100}, ${deltaY/100}, 0, ${Math.sqrt(deltaX*deltaX + deltaY*deltaY)/100}deg)`;
        
        // Обновляем последние значения
        lastX = acceleration.x;
        lastY = acceleration.y;
        
        // Анимируем градиент
        const xPos = (deltaX / sensitivity) * 100;
        const yPos = (deltaY / sensitivity) * 100;
        liquidBg.style.backgroundPosition = `${50 + xPos}% ${50 + yPos}%`;
    });
} else {
    console.log("Device Motion not supported");
    // Fallback анимация
    document.querySelector('.liquid-bg').style.animation = "gradientBG 25s ease infinite";
}

// Инициализация при загрузке страницы
initMiniApp();