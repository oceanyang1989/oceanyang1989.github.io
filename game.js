// 游戏状态
const game = {
    playerHP: 200,      // 玩家血量（串串）
    enemyHP: 200,       // AI血量（爸爸）
    maxHP: 200,
    playerDamage: 0,    // 玩家累计伤害
    enemyDamage: 0,     // AI累计伤害
    correctCount: 0,
    wrongCount: 0,
    totalQuestions: 16,
    currentQuestion: 0,
    questionTimer: null,
    countdownTimer: null,
    currentAnswer: 0,
    currentDifficulty: '',  // easy, normal, hard
    questionType: '',       // simple, medium, hard
    timeLeft: 30,
    selectCountdown: 30,    // 选择界面倒计时
    selectTimer: null,
    isPlaying: false,
    consecutiveCorrect: 0,  // 连续答对计数
    lastSpecial: 2,  // 上次必杀技：1=旋风连踹，2=臭屁王，初始为2让第一次用1
    difficultyConfig: {
        easy: { simple: 16, medium: 0, hard: 0 },
        normal: { simple: 10, medium: 6, hard: 0 },
        hard: { simple: 6, medium: 6, hard: 4 }
    },
    // 倒计时配置（各加10秒）
    timeConfig: {
        simple: 30,   // 原20秒 + 10秒
        medium: 40,   // 原30秒 + 10秒
        hard: 50      // 原40秒 + 10秒
    }
};

// DOM元素
const elements = {
    introScreen: document.getElementById('intro-screen'),
    introVideo: document.getElementById('intro-video'),
    loadingScreen: document.getElementById('loading-screen'),
    loadingProgress: document.getElementById('loading-progress'),
    loadingPercent: document.getElementById('loading-percent'),
    challengeScreen: document.getElementById('challenge-screen'),
    gameContainer: document.getElementById('game-container'),
    resultScreen: document.getElementById('result-screen'),
    rotateHint: document.getElementById('rotate-hint'),
    
    // 答题区
    questionProgress: document.getElementById('question-progress'),
    questionType: document.getElementById('question-type'),
    countdown: document.getElementById('countdown'),
    question: document.getElementById('question'),
    answerInput: document.getElementById('answer-input'),
    answerDisplay: document.getElementById('answer-display'),
    numpadBtns: document.querySelectorAll('.numpad-btn'),
    submitBtn: document.getElementById('submit-btn'),
    giveUpBtn: document.getElementById('giveup-btn'),
    feedback: document.getElementById('feedback'),
    
    // 血条
    playerHP: document.getElementById('player-hp'),
    enemyHP: document.getElementById('enemy-hp'),
    playerHPBar: document.getElementById('player-hp-bar'),
    enemyHPBar: document.getElementById('enemy-hp-bar'),
    
    // 视频
    gameVideo: document.getElementById('game-video'),
    
    // 结果
    resultText: document.getElementById('result-text'),
    resultStats: document.getElementById('result-stats'),
    restartBtn: document.getElementById('restart-btn'),
    
    // 选择界面
    selectCountdown: document.getElementById('select-countdown'),
    difficultyBtns: document.querySelectorAll('.difficulty-btn')
};

// 当前输入的答案
let currentInput = '';

// 所有视频列表
const videoList = [
    'videos/idle_loop.mp4',
    'videos/cc_normal.mp4',
    'videos/rr_normal.mp4',
    'videos/cc_special1.mp4',
    'videos/cc_special2.mp4',
    'videos/rr_special1.mp4',
    'videos/rr_special2.mp4',
    'videos/cc_win.mp4',
    'videos/rr_win.mp4',
    'videos/draw.mp4'
];

// 预加载视频
let loadedCount = 0;
let preloadResolve = null;

function preloadVideos() {
    return new Promise((resolve) => {
        preloadResolve = resolve;
        
        videoList.forEach(src => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.src = src;
            video.load();
            
            video.oncanplaythrough = () => {
                loadedCount++;
                updateLoadingProgress();
                if (loadedCount >= videoList.length && preloadResolve) {
                    preloadResolve();
                    preloadResolve = null;
                }
            };
            
            video.onerror = () => {
                loadedCount++;
                updateLoadingProgress();
                if (loadedCount >= videoList.length && preloadResolve) {
                    preloadResolve();
                    preloadResolve = null;
                }
            };
        });
    });
}

function updateLoadingProgress() {
    const percent = Math.round((loadedCount / videoList.length) * 100);
    elements.loadingProgress.style.width = `${percent}%`;
    elements.loadingPercent.textContent = `加载中... ${percent}%`;
}

// 横屏检测
function checkOrientation() {
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
        elements.rotateHint.classList.remove('show');
    } else {
        elements.rotateHint.classList.add('show');
    }
}

// 开场 - 直接显示选择界面
window.addEventListener('load', async () => {
    // 检测屏幕方向
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // 后台开始预加载视频
    preloadVideos();
    
    // 直接显示选择界面
    elements.introScreen.classList.add('hidden');
    elements.challengeScreen.classList.add('show');
    startSelectCountdown();
});

// 选择界面倒计时
function startSelectCountdown() {
    game.selectCountdown = 30;
    elements.selectCountdown.textContent = game.selectCountdown;
    
    game.selectTimer = setInterval(() => {
        game.selectCountdown--;
        elements.selectCountdown.textContent = game.selectCountdown;
        
        if (game.selectCountdown <= 5) {
            elements.selectCountdown.classList.add('warning');
        }
        
        if (game.selectCountdown <= 0) {
            clearInterval(game.selectTimer);
            showTimeout();
        }
    }, 1000);
    
    // 难度按钮事件
    elements.difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            clearInterval(game.selectTimer);
            game.currentDifficulty = btn.dataset.difficulty;
            playTransitionAndStart();
        });
    });
}

// 播放过渡动画后开始游戏
async function playTransitionAndStart() {
    elements.challengeScreen.classList.remove('show');
    elements.introScreen.classList.remove('hidden');
    
    // 播放开场动画
    elements.introVideo.play().catch(() => {});
    
    // 等待视频播放完成或预加载完成（取较长时间）
    await new Promise(resolve => {
        const onEnded = () => {
            elements.introVideo.removeEventListener('ended', onEnded);
            resolve();
        };
        elements.introVideo.addEventListener('ended', onEnded);
        
        // 如果视频还没加载，最多等8秒
        setTimeout(resolve, 8000);
    });
    
    // 如果预加载还没完成，显示加载界面
    if (loadedCount < videoList.length) {
        elements.introScreen.classList.add('hidden');
        elements.loadingScreen.classList.add('show');
        await preloadVideos();
        elements.loadingScreen.classList.remove('show');
    } else {
        elements.introScreen.classList.add('hidden');
    }
    
    // 开始游戏
    elements.gameContainer.classList.add('show');
    resetGame();
    updateHP();
    playVideo('idle_loop', true);
    generateQuestion();
}

// 超时提示
function showTimeout() {
    elements.challengeScreen.innerHTML = `
        <div class="timeout-message">
            <div class="timeout-icon">⏰</div>
            <div class="timeout-text">时间到！游戏结束</div>
            <button class="restart-btn" onclick="location.reload()">重新开始</button>
        </div>
    `;
}

// 重置游戏状态
function resetGame() {
    game.playerHP = game.maxHP;
    game.enemyHP = game.maxHP;
    game.playerDamage = 0;
    game.enemyDamage = 0;
    game.correctCount = 0;
    game.wrongCount = 0;
    game.currentQuestion = 0;
    game.consecutiveCorrect = 0;  // 重置连续答对计数
    game.lastSpecial = 2;  // 重置必杀技轮换
    game.isPlaying = true;
    currentInput = '';  // 重置输入
    
    const config = game.difficultyConfig[game.currentDifficulty];
    game.totalQuestions = config.simple + config.medium + config.hard;
}

// 更新血条显示
function updateHP() {
    const playerPercent = (game.playerHP / game.maxHP) * 100;
    const enemyPercent = (game.enemyHP / game.maxHP) * 100;
    
    elements.playerHPBar.style.width = `${playerPercent}%`;
    elements.enemyHPBar.style.width = `${enemyPercent}%`;
    elements.playerHP.textContent = game.playerHP;
    elements.enemyHP.textContent = game.enemyHP;
}

// 生成题目
function generateQuestion() {
    if (!game.isPlaying) return;
    
    game.currentQuestion++;
    elements.questionProgress.textContent = `第 ${game.currentQuestion} / ${game.totalQuestions} 题`;
    
    if (game.currentQuestion > game.totalQuestions) {
        endGame();
        return;
    }
    
    // 根据难度配置决定题目类型
    const config = game.difficultyConfig[game.currentDifficulty];
    
    if (game.currentDifficulty === 'easy') {
        game.questionType = 'simple';
    } else if (game.currentDifficulty === 'normal') {
        game.questionType = game.currentQuestion > 10 ? 'medium' : 'simple';
    } else {
        if (game.currentQuestion <= 6) game.questionType = 'simple';
        else if (game.currentQuestion <= 12) game.questionType = 'medium';
        else game.questionType = 'hard';
    }
    
    let a, b, operator;
    
    if (game.questionType === 'hard') {
        a = Math.floor(Math.random() * 300) + 200;  // 200-500
        b = Math.floor(Math.random() * 300) + 200;
        operator = Math.random() < 0.5 ? '+' : '-';
        if (operator === '-' && b > a) [a, b] = [b, a];
        game.timeLeft = game.timeConfig.hard;  // 50秒
        elements.questionType.textContent = '🔥 高难题 (伤害10)';
        elements.questionType.style.color = '#ff4444';
    } else if (game.questionType === 'medium') {
        a = Math.floor(Math.random() * 100) + 100;  // 100-200
        b = Math.floor(Math.random() * 100) + 100;
        operator = Math.random() < 0.5 ? '+' : '-';
        if (operator === '-' && b > a) [a, b] = [b, a];
        game.timeLeft = game.timeConfig.medium;  // 40秒
        elements.questionType.textContent = '⚡ 中等题 (伤害10)';
        elements.questionType.style.color = '#ff9933';
    } else {
        a = Math.floor(Math.random() * 90) + 10;  // 10-99
        b = Math.floor(Math.random() * 90) + 10;
        operator = Math.random() < 0.5 ? '+' : '-';
        if (operator === '-' && b > a) [a, b] = [b, a];
        game.timeLeft = game.timeConfig.simple;  // 30秒
        elements.questionType.textContent = '✨ 简单题 (伤害5)';
        elements.questionType.style.color = '#44cc44';
    }
    
    game.currentAnswer = operator === '+' ? a + b : a - b;
    elements.question.textContent = `${a} ${operator} ${b} = ?`;
    currentInput = '';  // 清空输入
    elements.answerDisplay.textContent = '?';
    elements.answerInput.value = '';
    elements.feedback.textContent = '';
    
    startCountdown();
}

// 倒计时
function startCountdown() {
    clearInterval(game.countdownTimer);
    elements.countdown.textContent = game.timeLeft;
    elements.countdown.classList.remove('warning');
    
    game.countdownTimer = setInterval(() => {
        game.timeLeft--;
        elements.countdown.textContent = game.timeLeft;
        
        // 最后5秒音效提示
        if (game.timeLeft <= 5 && game.timeLeft > 0) {
            elements.countdown.classList.add('warning');
            playBeep();
        }
        
        if (game.timeLeft <= 0) {
            clearInterval(game.countdownTimer);
            handleTimeout();
        }
    }, 1000);
}

// 倒计时音效
function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
}

// 超时处理
function handleTimeout() {
    game.wrongCount++;
    game.consecutiveCorrect = 0;  // 重置连续答对
    showFeedback('wrong', '时间到！');
    setTimeout(() => enemyAttack(), 500);
}

// 数字键盘事件
elements.numpadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        
        if (num === 'clear') {
            currentInput = '';
        } else if (num === 'submit') {
            checkAnswer();
            return;
        } else {
            // 限制输入长度
            if (currentInput.length < 4) {
                currentInput += num;
            }
        }
        
        elements.answerDisplay.textContent = currentInput || '?';
    });
});

// 提交答案
elements.submitBtn.addEventListener('click', checkAnswer);
elements.answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkAnswer();
});

function checkAnswer() {
    const userAnswer = parseInt(currentInput);
    if (isNaN(userAnswer) || currentInput === '') return;
    
    clearInterval(game.countdownTimer);
    
    if (userAnswer === game.currentAnswer) {
        game.correctCount++;
        game.consecutiveCorrect++;  // 连续答对+1
        showFeedback('correct', '太棒了！攻击成功！');
        setTimeout(() => playerAttack(), 500);
    } else {
        game.wrongCount++;
        game.consecutiveCorrect = 0;  // 重置连续答对
        showFeedback('wrong', `哎呀！答错了...`);
        setTimeout(() => enemyAttack(), 500);
    }
}

// 放弃
elements.giveUpBtn.addEventListener('click', () => {
    clearInterval(game.countdownTimer);
    game.wrongCount++;
    game.consecutiveCorrect = 0;  // 重置连续答对
    showFeedback('wrong', '没关系，继续加油！');
    setTimeout(() => enemyAttack(), 500);
});

// 显示反馈
function showFeedback(type, text) {
    elements.feedback.textContent = text;
    elements.feedback.className = type === 'correct' ? 'correct' : 'wrong';
}

// 玩家攻击（串串攻击爸爸）
async function playerAttack() {
    let damage, videoName, isSpecial = false;
    
    // 判断是否触发必杀技
    // 规则：简单题连续答对3道，或中等/高难题答对
    if (game.questionType !== 'simple') {
        // 中等/高难题直接触发必杀技（轮换）
        damage = 10;
        videoName = game.lastSpecial === 1 ? 'cc_special2' : 'cc_special1';
        game.lastSpecial = videoName === 'cc_special1' ? 1 : 2;
        isSpecial = true;
    } else if (game.consecutiveCorrect >= 3) {
        // 简单题连续答对3道触发必杀技（轮换）
        damage = 10;
        videoName = game.lastSpecial === 1 ? 'cc_special2' : 'cc_special1';
        game.lastSpecial = videoName === 'cc_special1' ? 1 : 2;
        isSpecial = true;
        game.consecutiveCorrect = 0;  // 触发后重置计数
    } else {
        // 普通攻击
        damage = 5;
        videoName = 'cc_normal';
    }
    
    game.enemyHP = Math.max(0, game.enemyHP - damage);
    game.playerDamage += damage;
    updateHP();
    
    // 播放视频并等待结束
    await playVideoAndWait(videoName);
    
    if (game.currentQuestion < game.totalQuestions) {
        playVideo('idle_loop', true);
        setTimeout(generateQuestion, 500);
    } else {
        endGame();
    }
}

// AI攻击（爸爸攻击串串）
async function enemyAttack() {
    let damage, videoName;
    
    // 判断是否触发必杀技
    if (game.questionType !== 'simple') {
        damage = 10;
        videoName = Math.random() < 0.5 ? 'rr_special1' : 'rr_special2';
    } else {
        damage = 5;
        videoName = 'rr_normal';
    }
    
    game.playerHP = Math.max(0, game.playerHP - damage);
    game.enemyDamage += damage;
    updateHP();
    
    // 播放视频并等待结束
    await playVideoAndWait(videoName);
    
    if (game.currentQuestion < game.totalQuestions) {
        playVideo('idle_loop', true);
        setTimeout(generateQuestion, 500);
    } else {
        endGame();
    }
}

// 播放视频
function playVideo(name, loop) {
    // 先停止当前视频
    elements.gameVideo.pause();
    elements.gameVideo.src = `videos/${name}.mp4`;
    elements.gameVideo.loop = loop;
    elements.gameVideo.muted = false;
    elements.gameVideo.load();
    elements.gameVideo.play().catch(() => {
        elements.gameVideo.muted = true;
        elements.gameVideo.play().catch(() => {});
    });
}

// 播放视频并等待结束
function playVideoAndWait(name) {
    return new Promise((resolve) => {
        // 先停止当前视频，移除所有旧的事件监听
        elements.gameVideo.pause();
        
        let resolved = false;
        
        const doResolve = () => {
            if (resolved) return;
            resolved = true;
            elements.gameVideo.removeEventListener('ended', doResolve);
            elements.gameVideo.removeEventListener('error', doResolve);
            resolve();
        };
        
        elements.gameVideo.addEventListener('ended', doResolve);
        elements.gameVideo.addEventListener('error', doResolve);
        
        elements.gameVideo.src = `videos/${name}.mp4`;
        elements.gameVideo.loop = false;
        elements.gameVideo.muted = false;
        elements.gameVideo.load();
        
        // 确保视频可以播放
        elements.gameVideo.oncanplay = () => {
            elements.gameVideo.play().catch(() => {
                elements.gameVideo.muted = true;
                elements.gameVideo.play().catch(() => doResolve());
            });
        };
        
        // 超时保护（视频最长等15秒）
        setTimeout(doResolve, 15000);
    });
}

// 结束游戏
function endGame() {
    game.isPlaying = false;
    clearInterval(game.countdownTimer);
    
    // 判断胜负
    let result, videoName;
    if (game.playerDamage > game.enemyDamage) {
        result = '串串胜利！🎉';
        videoName = 'cc_win';
        elements.resultText.style.color = '#44cc44';
    } else if (game.playerDamage < game.enemyDamage) {
        result = '爸爸胜利！';
        videoName = 'rr_win';
        elements.resultText.style.color = '#ff4444';
    } else {
        result = '平局！🤝';
        videoName = 'draw';
        elements.resultText.style.color = '#ffcc00';
    }
    
    elements.resultText.textContent = result;
    elements.resultStats.innerHTML = `
        答对: ${game.correctCount} 题<br>
        答错: ${game.wrongCount} 题<br><br>
        你造成的伤害: ${game.playerDamage}<br>
        爸爸造成的伤害: ${game.enemyDamage}
    `;
    
    playVideo(videoName, false);
    
    setTimeout(() => {
        elements.resultScreen.classList.add('show');
    }, 6000);
}

// 重新开始
elements.restartBtn.addEventListener('click', () => {
    location.reload();
});
