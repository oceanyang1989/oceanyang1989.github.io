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
    consecutiveWrong: 0,    // 连续答错计数
    lastPlayerSpecial: 2,   // 玩家上次必杀技：1=旋风连踹，2=臭屁王
    lastEnemySpecial: 2,    // AI上次必杀技：1=拉粑粑，2=召唤茹姐
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
    'videos/transition.mp4',
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

// 用户点击继续，关闭横屏提示
function hideRotateHint() {
    elements.rotateHint.classList.remove('show');
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
    
    // 创建过渡界面：视频+底部加载条
    const transitionDiv = document.createElement('div');
    transitionDiv.id = 'transition-screen';
    transitionDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:350;display:flex;flex-direction:column;';
    transitionDiv.innerHTML = `
        <video id="transition-video" style="flex:1;width:100%;object-fit:cover;" playsinline></video>
        <div style="padding:15px;background:rgba(0,0,0,0.8);">
            <div style="width:100%;height:8px;background:rgba(255,255,255,0.2);border-radius:4px;overflow:hidden;">
                <div id="transition-loading-bar" style="height:100%;background:#ffd700;width:0%;transition:width 0.3s;"></div>
            </div>
            <div id="transition-loading-text" style="text-align:center;font-size:12px;color:#aaa;margin-top:5px;">加载中... 0%</div>
        </div>
    `;
    document.body.appendChild(transitionDiv);
    
    const transitionVideo = document.getElementById('transition-video');
    const loadingBar = document.getElementById('transition-loading-bar');
    const loadingText = document.getElementById('transition-loading-text');
    
    // 更新加载进度的函数
    const updateTransitionLoading = () => {
        const percent = Math.round((loadedCount / videoList.length) * 100);
        loadingBar.style.width = `${percent}%`;
        loadingText.textContent = `加载中... ${percent}%`;
    };
    
    transitionVideo.src = 'videos/transition.mp4';
    transitionVideo.load();
    
    // 播放过渡动画
    let videoEnded = false;
    const videoPromise = new Promise(resolve => {
        transitionVideo.onended = () => {
            videoEnded = true;
            // 视频播完后暂停在最后一帧
            transitionVideo.pause();
            resolve();
        };
        transitionVideo.onerror = () => resolve();
        transitionVideo.play().catch(() => resolve());
        
        // 最多等10秒
        setTimeout(() => {
            videoEnded = true;
            transitionVideo.pause();
            resolve();
        }, 10000);
    });
    
    // 同时等待预加载
    const preloadPromise = new Promise(resolve => {
        const checkLoaded = setInterval(() => {
            updateTransitionLoading();
            if (loadedCount >= videoList.length) {
                clearInterval(checkLoaded);
                loadingBar.style.width = '100%';
                loadingText.textContent = '加载完成！';
                setTimeout(resolve, 500);
            }
        }, 200);
    });
    
    // 等待视频播放完成
    await videoPromise;
    
    // 视频播完后，等待加载完成
    await preloadPromise;
    
    // 移除过渡界面
    transitionDiv.remove();
    
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
    game.consecutiveCorrect = 0;
    game.consecutiveWrong = 0;
    game.lastPlayerSpecial = 2;
    game.lastEnemySpecial = 2;
    game.isPlaying = true;
    currentInput = '';
    
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
    game.consecutiveWrong++;
    game.consecutiveCorrect = 0;
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
        game.consecutiveCorrect++;
        game.consecutiveWrong = 0;  // 重置连续答错
        showFeedback('correct', '太棒了！攻击成功！');
        setTimeout(() => playerAttack(), 500);
    } else {
        game.wrongCount++;
        game.consecutiveWrong++;
        game.consecutiveCorrect = 0;  // 重置连续答对
        showFeedback('wrong', `哎呀！答错了...`);
        setTimeout(() => enemyAttack(), 500);
    }
}

// 放弃
elements.giveUpBtn.addEventListener('click', () => {
    clearInterval(game.countdownTimer);
    game.wrongCount++;
    game.consecutiveWrong++;
    game.consecutiveCorrect = 0;
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
    
    // 连续答对3道触发必杀技
    if (game.consecutiveCorrect >= 3) {
        damage = 10;
        // 轮换：上次是旋风连踹(1)就用臭屁王(2)，上次是臭屁王(2)就用旋风连踹(1)
        if (game.lastPlayerSpecial === 1) {
            videoName = 'cc_special2';  // 臭屁王
            game.lastPlayerSpecial = 2;
        } else {
            videoName = 'cc_special1';  // 旋风连踹
            game.lastPlayerSpecial = 1;
        }
        isSpecial = true;
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
    
    // 串串连续答错/放弃3道触发必杀技
    if (game.consecutiveWrong >= 3) {
        damage = 10;
        // 轮换：上次是拉粑粑(1)就用召唤茹姐(2)，上次是召唤茹姐(2)就用拉粑粑(1)
        if (game.lastEnemySpecial === 1) {
            videoName = 'rr_special2';  // 召唤茹姐
            game.lastEnemySpecial = 2;
        } else {
            videoName = 'rr_special1';  // 拉粑粑
            game.lastEnemySpecial = 1;
        }
    } else {
        // 普通攻击
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
    
    // 等待可以播放后再播放
    elements.gameVideo.oncanplaythrough = () => {
        elements.gameVideo.play().catch(() => {
            elements.gameVideo.muted = true;
            elements.gameVideo.play().catch(() => {});
        });
    };
}

// 播放视频并等待结束
function playVideoAndWait(name) {
    return new Promise((resolve) => {
        // 先停止当前视频
        elements.gameVideo.pause();
        
        let resolved = false;
        
        const doResolve = () => {
            if (resolved) return;
            resolved = true;
            elements.gameVideo.removeEventListener('ended', doResolve);
            elements.gameVideo.removeEventListener('error', doResolve);
            elements.gameVideo.oncanplaythrough = null;
            resolve();
        };
        
        elements.gameVideo.addEventListener('ended', doResolve);
        elements.gameVideo.addEventListener('error', doResolve);
        
        elements.gameVideo.src = `videos/${name}.mp4`;
        elements.gameVideo.loop = false;
        elements.gameVideo.muted = false;
        elements.gameVideo.load();
        
        // 等待视频可以播放后再播放
        elements.gameVideo.oncanplaythrough = () => {
            elements.gameVideo.play().catch(() => {
                // 静音后再试
                elements.gameVideo.muted = true;
                elements.gameVideo.play().catch(() => doResolve());
            });
        };
        
        // 超时保护（视频最长等20秒）
        setTimeout(doResolve, 20000);
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
