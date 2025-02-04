let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let sections = [];
let isSectionsLoaded = false;

const sectionId = new URLSearchParams(window.location.search).get('section_id');

if (!sectionId) {
    console.error("Не указан section_id в URL");
} else {
    console.log("Section ID:", sectionId);
    loadSections();
}

function loadSections() {
    fetch('data.xlsx')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            // Извлекаем уникальные разделы
            sections = [...new Set(rows.map(row => row.section_id))].map(id => ({
                section_id: id,
                title: rows.find(row => row.section_id === id).section_title
            }));

            console.log("Загруженные разделы:", sections);
            isSectionsLoaded = true;

            if (sectionId) {
                loadQuestions();
            }
        })
        .catch(error => {
            console.error("Ошибка при загрузке секций:", error);
        });
}

function loadQuestions() {
    fetch('data.xlsx')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            questions = rows.filter(row => row.section_id == sectionId);

            console.log("Загруженные вопросы:", questions);

            if (questions.length === 0) {
                console.error("Нет вопросов для раздела с ID:", sectionId);
                return;
            }

            document.getElementById('form-container').style.display = 'none';
            document.getElementById('quiz-container').style.display = 'block';
            showQuestion();
        })
        .catch(error => {
            console.error("Ошибка при загрузке вопросов:", error);
        });
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        console.error("Индекс вопроса выходит за пределы массива:", currentQuestionIndex);
        return;
    }

    const question = questions[currentQuestionIndex];
    console.log("Текущий вопрос:", question);

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

function sendUserData() {
    if (!isSectionsLoaded) {
        alert("Дождитесь загрузки данных!");
        return;
    }

    const fio = document.getElementById('fio').value;
    const company = document.getElementById('company').value;
    const phone = document.getElementById('phone').value;

    const data = JSON.stringify({
        fio,
        company,
        phone,
        sections: sections
    });

    console.log("Отправляемые данные:", data);

    Telegram.WebApp.sendData(data);
}