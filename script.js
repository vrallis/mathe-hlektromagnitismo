// Quiz Application Logic
class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestion = null;
        this.score = 0;
        this.totalAnswered = 0;
        this.selectedAnswer = null;
        this.isAnswered = false;
        
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.loadProgress();
        this.updateScore();
        this.loadRandomQuestion();
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            const data = await response.json();
            this.questions = data.questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            document.getElementById('question-text').textContent = 
                'Σφάλμα φόρτωσης ερωτήσεων. Παρακαλώ ανανεώστε τη σελίδα.';
        }
    }

    loadProgress() {
        const savedProgress = localStorage.getItem('quizProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.score = progress.score || 0;
            this.totalAnswered = progress.totalAnswered || 0;
        }
    }

    saveProgress() {
        const progress = {
            score: this.score,
            totalAnswered: this.totalAnswered,
            lastPlayed: new Date().toISOString()
        };
        localStorage.setItem('quizProgress', JSON.stringify(progress));
    }

    loadRandomQuestion() {
        if (this.questions.length === 0) return;

        this.selectedAnswer = null;
        this.isAnswered = false;

        // Select random question
        const randomIndex = Math.floor(Math.random() * this.questions.length);
        this.currentQuestion = this.questions[randomIndex];

        const falseAnswers = this.generateRandomFalseAnswers(this.currentQuestion);
        
        const answers = [
            { text: this.currentQuestion.correctAnswer, correct: true },
            ...falseAnswers
        ];

        this.currentQuestion.shuffledAnswers = this.shuffleArray(answers);

        // Display question
        this.displayQuestion();
    }

    generateRandomFalseAnswers(currentQuestion) {
        // Get all other questions
        const otherQuestions = this.questions.filter(q => q.id !== currentQuestion.id);
        
        // wrong questions shuffle
        const shuffledOthers = this.shuffleArray(otherQuestions);
        
        return shuffledOthers.slice(0, 3).map(q => ({
            text: q.correctAnswer,
            correct: false
        }));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    displayQuestion() {
        const questionText = document.getElementById('question-text');
        const answerButtons = document.querySelectorAll('.answer-btn');
        const feedbackText = document.getElementById('feedback-text');
        const nextBtn = document.getElementById('next-btn');

        // Clear previous state
        feedbackText.textContent = '';
        feedbackText.className = '';
        nextBtn.style.display = 'none';

        // Set question
        questionText.textContent = this.currentQuestion.question;

        // Set answers
        answerButtons.forEach((button, index) => {
            const answerText = button.querySelector('.answer-text');
            answerText.innerHTML = this.currentQuestion.shuffledAnswers[index].text;
            
            // Reset button state
            button.className = 'answer-btn';
            button.disabled = false;
        });

        // Render math expressions
        setTimeout(() => {
            this.renderMath();
        }, 100);
    }

    renderMath() {
        if (typeof renderMathInElement !== 'undefined') {
            try {
                renderMathInElement(document.body, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false
                });
            } catch (error) {
                console.log('Math rendering error:', error);
            }
        }
    }

    selectAnswer(answerIndex) {
        if (this.isAnswered) return;

        this.selectedAnswer = answerIndex;
        this.isAnswered = true;
        this.totalAnswered++;

        const selectedButton = document.getElementById(`answer-${answerIndex}`);
        const selectedAnswerData = this.currentQuestion.shuffledAnswers[answerIndex];

        // Highlight selected answer
        selectedButton.classList.add('selected');

        // Check if answer is correct
        const isCorrect = selectedAnswerData.correct;
        
        if (isCorrect) {
            this.score++;
            selectedButton.classList.remove('selected');
            selectedButton.classList.add('correct');
            
        } else {
            selectedButton.classList.remove('selected');
            selectedButton.classList.add('incorrect');
            
            // Highlight the correct answer
            const answerButtons = document.querySelectorAll('.answer-btn');
            answerButtons.forEach((button, index) => {
                if (this.currentQuestion.shuffledAnswers[index].correct) {
                    button.classList.add('correct');
                }
            });
            
            
        }

        const answerButtons = document.querySelectorAll('.answer-btn');
        answerButtons.forEach(button => {
            button.disabled = true;
        });

        this.updateScore();
        this.saveProgress();

        document.getElementById('next-btn').style.display = 'inline-block';
    }

    showFeedback(message, type) {
        const feedbackText = document.getElementById('feedback-text');
        feedbackText.textContent = message;
        feedbackText.className = type;
    }

    nextQuestion() {
        document.getElementById('quiz-container').style.display = 'none';
        document.getElementById('loading').style.display = 'block';

        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('quiz-container').style.display = 'block';
            this.loadRandomQuestion();
        }, 500);
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('total').textContent = this.totalAnswered;
    }

    resetProgress() {
        this.score = 0;
        this.totalAnswered = 0;
        this.saveProgress();
        this.updateScore();
    }

    exportProgress() {
        const progress = {
            score: this.score,
            totalAnswered: this.totalAnswered,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        
        const dataStr = JSON.stringify(progress, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `quiz-progress-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    }

    importProgress(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const progress = JSON.parse(e.target.result);
                
                if (progress.score !== undefined && progress.totalAnswered !== undefined) {
                    this.score = progress.score;
                    this.totalAnswered = progress.totalAnswered;
                    this.saveProgress();
                    this.updateScore();
                    
                    alert(`Πρόοδος εισήχθη επιτυχώς!\nΣκορ: ${this.score}/${this.totalAnswered}`);
                } else {
                    alert('Λάθος μορφή αρχείου. Παρακαλώ επιλέξτε έγκυρο αρχείο προόδου.');
                }
            } catch (error) {
                alert('Σφάλμα κατά την ανάγνωση του αρχείου. Παρακαλώ δοκιμάστε ξανά.');
            }
        };
        reader.readAsText(file);
    }
}

let quizApp;

function selectAnswer(answerIndex) {
    quizApp.selectAnswer(answerIndex);
}

function nextQuestion() {
    quizApp.nextQuestion();
}

function resetProgress() {
    if (confirm('Είστε σίγουροι ότι θέλετε να επαναφέρετε την πρόοδό σας;')) {
        quizApp.resetProgress();
    }
}

function exportProgress() {
    quizApp.exportProgress();
}

function importProgress() {
    document.getElementById('import-file').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (file) {
        quizApp.importProgress(file);
        event.target.value = '';
    }
}

function toggleTheme() {
    const body = document.body;
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');
    
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
        localStorage.setItem('theme', 'dark');
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const moonIcon = document.querySelector('.moon-icon');
    const sunIcon = document.querySelector('.sun-icon');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    }
}

// Initialize quiz
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    quizApp = new QuizApp();
});

// keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (quizApp && !quizApp.isAnswered) {
        switch(event.key) {
            case '1':
            case 'a':
            case 'A':
                selectAnswer(0);
                break;
            case '2':
            case 'b':
            case 'B':
                selectAnswer(1);
                break;
            case '3':
            case 'c':
            case 'C':
                selectAnswer(2);
                break;
            case '4':
            case 'd':
            case 'D':
                selectAnswer(3);
                break;
        }
    } else if (quizApp && quizApp.isAnswered && event.key === 'Enter') {
        nextQuestion();
    }
});