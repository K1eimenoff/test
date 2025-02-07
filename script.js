let currentQuestionIndex = 0;
let score = 0;

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

        const headers = data[0];
        const rows = data.slice(1);

        const sectionIndex = headers.indexOf("Раздел");
        const questionIndex = headers.indexOf("Вопрос");
        const option1Index = headers.indexOf("Вариант 1");
        const option2Index = headers.indexOf("Вариант 2");
        const option3Index = headers.indexOf("Вариант 3");
        const option4Index = headers.indexOf("Вариант 4");
        const correctAnswerIndex = headers.indexOf("Правильный ответ");

        const uniqueSections = new Set();
        rows.forEach(row => {
            if (row[sectionIndex]) {
                uniqueSections.add(row[sectionIndex]);
            }
        });

        return {
            sections: Array.from(uniqueSections),
            questions: rows.map(row => ({
                section: row[sectionIndex]?.toString().trim(),
                question: row[questionIndex]?.toString().trim(),
                options: [
                    row[option1Index]?.toString().trim(),
                    row[option2Index]?.toString().trim(),
                    row[option3Index]?.toString().trim(),
                    row[option4Index]?.toString().trim()
                ],
                correctAnswer: parseInt(row[correctAnswerIndex]?.toString().trim()) || null
            }))
        };
    } catch (error) {
        console.error("Ошибка при чтении Excel-файла:", error);
        alert("Не удалось загрузить вопросы. Проверьте файл data.xlsx.");
        window.Telegram.WebApp.close();
    }
}

// Отображение текущего вопроса
function displayQuestion(question) {
    document.getElementById('questionText').textContent = question.question || "Нет вопроса";
    const answerButtonsDiv = document.getElementById('answerButtons');
    answerButtonsDiv.innerHTML = '';

    // Обновляем счетчик вопросов
    const filteredQuestions = JSON.parse(localStorage.getItem('filteredQuestions'));
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1; // Текущий вопрос (индекс + 1)
    document.getElementById('totalQuestions').textContent = filteredQuestions.length; // Общее количество вопросов

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option || "Нет варианта";
        button.classList.add('answer-button');
        button.dataset.index = index + 1;
        button.addEventListener('click', handleAnswerClick);
        answerButtonsDiv.appendChild(button);
    });
}

// Обработка нажатия на кнопку
function handleAnswerClick(event) {
    const selectedButton = event.target;
    const selectedOption = parseInt(selectedButton.dataset.index);

    document.querySelectorAll('.answer-button').forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');

    const filteredQuestions = JSON.parse(localStorage.getItem('filteredQuestions'));
    const correctAnswer = filteredQuestions[currentQuestionIndex].correctAnswer;

    if (selectedOption === correctAnswer) {
        score++;
        document.getElementById('resultMessageRight').textContent = "Правильно!";
    } else {
        document.getElementById('resultMessageWrong').textContent = "Неправильно.";
    }

    setTimeout(() => {
        document.getElementById('resultMessageRight').textContent = "";
        document.getElementById('resultMessageWrong').textContent = "";
        currentQuestionIndex++;
        if (currentQuestionIndex < filteredQuestions.length) {
            displayQuestion(filteredQuestions[currentQuestionIndex]);
        } else {
            document.getElementById('quizContainer').style.display = 'none';
            document.getElementById('finalScore').style.display = 'block';
            document.getElementById('score').textContent = score;
    
            // Добавляем текущий раздел в отправляемые данные
            const selectedSection = getQueryParam('section'); // Получаем текущий раздел из URL
            const sendData = JSON.stringify({
                score,
                section: selectedSection // Добавляем раздел
            });
    
            window.Telegram.WebApp.sendData(sendData);
            window.Telegram.WebApp.close();
        }
    }, 1000);
}

// Логика теста
async function startQuiz(selectedSection, questions) {
    const filteredQuestions = questions.filter(q => q.section === selectedSection);

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
    const selectedSection = getQueryParam('section');

    if (selectedSection) {
        const { questions } = await parseExcel();
        startQuiz(selectedSection, questions);
    } else {
        document.getElementById('userForm').style.display = 'block';
    }
}

// Обработка формы пользователя
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fio = document.getElementById('fio').value;
    const company = document.getElementById('company').value;
    const phone = document.getElementById('phone').value;

    const { sections, questions } = await parseExcel();

    const sendData = JSON.stringify({
        fio,
        company,
        phone,
        sections
    });

    window.Telegram.WebApp.sendData(sendData);

    document.getElementById('userForm').style.display = 'none';
    const selectedSection = getQueryParam('section');
    if (selectedSection) {
        startQuiz(selectedSection, questions);
    } else {
        alert("Не выбран раздел.");
        window.Telegram.WebApp.close();
    }
});


// Инициализация при загрузке страницы
initMiniApp();