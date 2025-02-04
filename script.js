

let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let sectionId = new URLSearchParams(window.location.search).get('section_id');

let sections = [];

document.addEventListener('DOMContentLoaded', () => {
// Функция для загрузки разделов из Excel

    fetch('questions.xlsx')
        .then(response => {
            if (!response.ok) {
                console.error("Ошибка при загрузке файла:", response.statusText);
                return;
            }
            return response.arrayBuffer();
        })
        .then(data => {
            if (!data) return;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            console.log("Сырые данные из Excel:", rows);

            // Извлекаем уникальные разделы
            sections = [...new Set(rows.map(row => row.section_id))];

            console.log("Загруженные разделы:", sections);
        })
        .catch(error => {
            console.error("Ошибка при обработке Excel-файла:", error);
        });
        

});

function sendUserData() {
    const fio = document.getElementById('fio').value;
    const company = document.getElementById('company').value;
    const phone = document.getElementById('phone').value;

    // Добавляем массив секций к данным пользователя
    const data = JSON.stringify({
        fio,
        company,
        phone,
        sections
    });

    Telegram.WebApp.sendData(data);
}




function loadQuestions() {
    fetch('questions.xlsx')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            questions = XLSX.utils.sheet_to_json(sheet).filter(q => q.section_id == sectionId);
            showQuestion();
        });
}

function showQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question-title').innerText = question.question;
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    [question.option1, question.option2, question.option3, question.option4].forEach(answer => {
        const button = document.createElement('button');
        button.innerText = answer;
        button.onclick = () => checkAnswer(answer === question.correct_answer);
        answersDiv.appendChild(button);
    });
}

function checkAnswer(isCorrect) {
    if (isCorrect) score++;
    document.getElementById('next-question').style.display = 'block';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        showQuestion();
        document.getElementById('next-question').style.display = 'none';
    } else {
        Telegram.WebApp.sendData(JSON.stringify({ section_id: sectionId, score }));
    }
}

if (sectionId) {
    document.getElementById('form-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    loadQuestions();
}
