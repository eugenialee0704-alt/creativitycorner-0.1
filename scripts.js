// -------------------- Font size management --------------------
let currentFontSize = 16;   // in px
const minFontSize = 12;
const maxFontSize = 24;

// Apply font size
function applyFontSize(px) {
    document.documentElement.style.setProperty('--font-size-base', `${px}px`);
    const display = document.getElementById('fontSizeDisplay');
    if (display) display.textContent = `${px}px`;
    currentFontSize = px;
    localStorage.setItem('creativityFontSize', String(px));
}

// Load saved font size
const savedSize = localStorage.getItem('creativityFontSize');
if (savedSize) {
    const px = parseInt(savedSize, 10);
    if (!Number.isNaN(px) && px >= minFontSize && px <= maxFontSize) {
        currentFontSize = px;
    }
}

// User data and application state
let currentUser = null;
let currentActivity = null;
let currentLanguage = 'en'; // Default language
let activities = [
    {
        id: 1,
        title_en: "Transformation of Animals",
        title_zh: "動物創作",
        icon: "fas fa-paw",
        colorClass: "animal-icon",
        description_en: "Combine two animals to create a brand new creature!",
        description_zh: "結合兩種動物創造全新的生物！",
        instructions_en: `
            <div class="worksheet-content lang-en">
                <h3>First Activity: Transformation of Animals Activity</h3>
                <p><strong>Objective:</strong> Create a new animal by combining body parts from two different animals. Use your imagination to design and describe this transformed creature.</p>
                
                <h4>Instructions:</h4>
                <ol>
                    <li>You will be assigned two animals.</li>
                    <li>Draw a new animal that incorporates body parts from both animals.</li>
                    <li>Be creative! You can exaggerate, simplify, or stylize the features.</li>
                </ol>
                
                <h4>Your Assigned Animals: Elephant and Butterfly</h4>
                <div class="animal-images">
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-elephant"></i>
                        </div>
                        <p>Elephant</p>
                    </div>
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-plus"></i>
                        </div>
                        <p>Combine</p>
                    </div>
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-butterfly"></i>
                        </div>
                        <p>Butterfly</p>
                    </div>
                </div>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> Hints:</h4>
                    <ul>
                        <li>Choose one body part of one animal? (e.g., wings of butterfly, tail or ears of elephant)</li>
                        <li>How to combine the two animals? (e.g., combine the wings of butterfly to the ears of the elephant, combine the tail of elephant to the body of butterfly)</li>
                    </ul>
                </div>
            </div>
        `,
        instructions_zh: `
            <div class="worksheet-content lang-zh">
                <h3>活動一：動物創作</h3>
                <p><strong>活動目標：</strong>透過結合兩種不同動物的身體部位，創造出一種全新的動物。發揮你的想像力來設計並描述這個新創作的動物。</p>
                
                <h4>活動說明：</h4>
                <ul>
                    <li>分配到兩種動物。</li>
                    <li>請畫出一種新的動物，結合這兩種動物的身體部位。</li>
                    <li>可以誇張、簡化或創意地呈現特徵。</li>
                </ul>
                
                <h4>兩種動物：蝴蝶和大象</h4>
                <div class="animal-images">
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-butterfly"></i>
                        </div>
                        <p>蝴蝶</p>
                    </div>
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-plus"></i>
                        </div>
                        <p>結合</p>
                    </div>
                    <div class="animal-image">
                        <div class="animal-img">
                            <i class="fas fa-elephant"></i>
                        </div>
                        <p>大象</p>
                    </div>
                </div>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> 提示：</h4>
                    <ul>
                        <li>選擇其中一種動物的一個身體部位。(例如：蝴蝶的翅膀、大象的尾巴或耳朵)</li>
                        <li>如何結合這兩種動物？(例如：將蝴蝶的翅膀結合到大象的耳朵上；或將大象的尾巴結合到蝴蝶的身體上)</li>
                    </ul>
                </div>
            </div>
        `,
        completed: false,
        unlocked: true
    },
    {
        id: 2,
        title_en: "What If...? Challenge",
        title_zh: "「如果......？」想像力挑戰",
        icon: "fas fa-question-circle",
        colorClass: "whatif-icon",
        description_en: "Imagine strange situations and their consequences!",
        description_zh: "想像奇特情境及其後果！",
        instructions_en: `
            <div class="worksheet-content lang-en">
                <h3>Second Activity: What If...? Imagination Challenge</h3>
                <p><strong>Objective:</strong> Stimulate creative thinking by imagining unusual or impossible scenarios and thinking their consequences.</p>
                
                <h4>Instructions:</h4>
                <ol>
                    <li>You will be given a "What if...?" question.</li>
                    <li>Think creatively and imagine how your life would change in this situation.</li>
                    <li>Write down as many consequences, changes, or ideas as you can. That can be practical, funny or strange!</li>
                    <li>Use the guiding questions below to help you explore different perspectives.</li>
                </ol>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> Hints:</h4>
                    <ul>
                        <li>What exciting or fun things could happen?</li>
                        <li>How would your surroundings change?</li>
                        <li>What kind of tools or objects would you need?</li>
                        <li>What problem might you face?</li>
                        <li>How can you solve the problem?</li>
                        <li>Would you like this new situation? Why or why not?</li>
                    </ul>
                </div>
                
                <h4>Question: What if my bedroom is on the ship?</h4>
            </div>
        `,
        instructions_zh: `
            <div class="worksheet-content lang-zh">
                <h3>活動二:「如果......？」想像力挑戰</h3>
                <p><strong>活動目標：</strong>透過想像奇特或不可能的情境，激發創意，並思考可能的後果。</p>
                
                <h4>活動說明：</h4>
                <ol>
                    <li>你將會收到一個「如果......？」的問題。</li>
                    <li>發揮創意，想像在這種情境下你的生活會有什麼改變。</li>
                    <li>寫下你能想到的所有後果或變化。變化可以是實際的、有趣的、奇怪的！</li>
                    <li>可以運用下方的引導問題，幫助你從不同角度思考。</li>
                </ol>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> 提示:</h4>
                    <ul>
                        <li>有哪些令人興奮或有趣的事情可能發生？</li>
                        <li>你的環境會有什麼改變？</li>
                        <li>你需要哪些新的工具或物品？</li>
                        <li>你可能會遇到什麼問題？</li>
                        <li>可以怎樣解決遇到困難？</li>
                        <li>你喜歡這個新情境嗎？為什麼？</li>
                    </ul>
                </div>
                
                <h4>問題: 如果我的臥室在船上會怎樣？</h4>
            </div>
        `,
        completed: false,
        unlocked: true
    },
    {
        id: 3,
        title_en: "Word Association Activity",
        title_zh: "詞語聯想",
        icon: "fas fa-link",
        colorClass: "word-icon",
        description_en: "Create a chain of words connecting two different words!",
        description_zh: "創建連接兩個不同詞語的詞語鏈！",
        instructions_en: `
            <div class="worksheet-content lang-en">
                <h3>Third Activity: Word Association Activity</h3>
                
                <h4>Instructions:</h4>
                <ul>
                    <li>You will be given a word in the beginning (e.g., kid).</li>
                    <li>Your task is to fill in five blanks, creating a chain of words where each word is related to the one before it.</li>
                    <li>The activity is no right or wrong answers --- just make sure each word connects naturally or creatively to the previous one.</li>
                    <li>Use your imagination!</li>
                </ul>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> Hints:</h4>
                    <ul>
                        <li>What comes to mind when you hear the word in the beginning?</li>
                        <li>Is it a person, place, feeling, or activity?</li>
                        <li>Can you think of a story or memory involving that word?</li>
                        <li>What might happen next in a sequence involving that word?</li>
                    </ul>
                </div>
                
                <h4>Your Turn!</h4>
                <ul>
                    <li>What pops up in your mind related to the word "kids"? Is it related to the family members? Is it related to the something playful and interesting activity?</li>
                    <li>How can this word relate to the word "Sea"? Can you think of a story involving this word?</li>
                </ul>
            </div>
        `,
        instructions_zh: `
            <div class="worksheet-content lang-zh">
                <h3>活動三:詞語聯想</h3>
                
                <h4>說明：</h4>
                <ul>
                    <li>你將獲得一個詞語作為開始（例如：「孩子」）。</li>
                    <li>你的任務是填寫五個空格，創造一個詞語連線，每個詞都與前一個詞有關聯。</li>
                    <li>這個活動沒有正確或錯誤的答案，只要每個詞能自然或有創意地連接前一個詞即可。</li>
                    <li>用用你的想像力吧！</li>
                </ul>
                
                <div class="hint-box">
                    <h4><i class="fas fa-lightbulb"></i> 提示：</h4>
                    <ul>
                        <li>當你聽到這個詞語時，你會想到什麼？</li>
                        <li>是一個人、一個地方、一種感覺，還是一項活動？</li>
                        <li>你能想到與這個詞有關的故事或回憶嗎？</li>
                    </ul>
                </div>
                
                <h4>輪到你</h4>
                <ul>
                    <li>當你聽到「孩子」這個詞時，你會聯想到什麼？是家庭成員？也許是某種有趣又好玩的活動？</li>
                    <li>這個詞如何與「海洋」產生聯繫？你能想到一個與這個詞有關的故事嗎？</li>
                </ul>
            </div>
        `,
        completed: false,
        unlocked: false
    },
    {
        id: 4,
        title_en: "Why Did It End Up There?",
        title_zh: "沙漠裡的企鵝",
        icon: "fas fa-search",
        colorClass: "why-icon",
        description_en: "Create a story to explain unusual situations!",
        description_zh: "創建故事解釋不尋常的情境！",
        instructions_en: `
            <div class="worksheet-content lang-en">
                <h3>Fourth Activity: Why Did It End Up There?</h3>
                
                <p><strong>Objective:</strong> Imagine and explain why a penguin is in the desert. Use your creativity to explore different possibilities. There are no wrong answers---only imaginative ones!</p>
                
                <h4>Instructions:</h4>
                <ul>
                    <li>You have 15--20 minutes to complete this activity individually.</li>
                    <li>Think of as many different explanations to explain why the penguin is in the desert.</li>
                    <li>Be imaginative, logical, or even humorous---just make sure each idea is explained clearly.</li>
                </ul>
            </div>
        `,
        instructions_zh: `
            <div class="worksheet-content lang-zh">
                <h3>活動四：沙漠裡的企鵝</h3>
                
                <p><strong>活動目標：</strong>請發揮你的創意，想像並解釋為什麼企鵝會出現在沙漠裡。這是一個創意思考的練習，沒有標準答案，只有你新奇有趣的想法！</p>
                
                <h4>活動說明：</h4>
                <ul>
                    <li>你有 15--20 分鐘 的時間獨立完成。</li>
                    <li>請你試試想到多些原因，解釋企鵝為何會在沙漠裡。</li>
                    <li>可以天馬行空、幽默或合理推理，但每個想法都要清楚說明。</li>
                </ul>
            </div>
        `,
        completed: false,
        unlocked: false
    },
    {
        id: 5,
        title_en: "Brainstorming Task",
        title_zh: "集思廣益",
        icon: "fas fa-lightbulb",
        colorClass: "brainstorm-icon",
        description_en: "Think of creative solutions to fun problems!",
        description_zh: "為有趣的問題想出創意解決方案！",
        instructions_en: `
            <div class="worksheet-content lang-en">
                <h3>Fifth Activity: Brainstorming Activity</h3>
                
                <p><strong>Assigned Problem:</strong> How can we stay cool during hot summer days in Hong Kong?</p>
                
                <h4>Step 1: Brainstorm Solutions</h4>
                <p>Think of four different ways to solve the questions.</p>
                
                <h4>Step 2: Categorize Your Solutions</h4>
                <p>Place each solution into one of the four categories (You don't need to use every category; just choose the ones that fit your solutions):</p>
                
                <div class="hint-box">
                    <h4>Categories:</h4>
                    <ul>
                        <li><strong>Irrelevant or Impossible</strong> - Is the solution can help to solve the problem?</li>
                        <li><strong>Feasible but Not Worthwhile</strong> - Is the solution can be achieved by ourselves but need a lot of material and resource?</li>
                        <li><strong>Feasible but Not Executed by Us and Not Here</strong> - Is the solution can be executed by ourselves or need other people?</li>
                        <li><strong>Possible Here and Now</strong> - Is it the material needed in the solution is easy to get?</li>
                    </ul>
                </div>
            </div>
        `,
        instructions_zh: `
            <div class="worksheet-content lang-zh">
                <h3>活動五: 思維訓練活動</h3>
                
                <p><strong>指定問題：</strong>在香港炎熱的夏天，我們如何保持涼爽？</p>
                
                <h4>第一步：集思廣益</h4>
                <p>想出四種不同的方法來解決這個問題。</p>
                
                <h4>第二步：分類你的解決方案</h4>
                <p>將每個解決方案放入四個類別之一(不必使用所有類別，只需選擇適合你解決方案的類別)：</p>
                
                <div class="hint-box">
                    <h4>類別：</h4>
                    <ul>
                        <li><strong>無關或不可能</strong> - 這個解決方案能幫助解決問題嗎？</li>
                        <li><strong>可行但不值得</strong> - 這個解決方案可以由我們自己完成，但需要大量材料和資源嗎？</li>
                        <li><strong>可行但不是我們或不是這裡</strong> - 這個解決方案可以由我們自己執行，還是需要其他人？</li>
                        <li><strong>此時此地可行</strong> - 這個解決方案所需的材料容易取得嗎？</li>
                    </ul>
                </div>
            </div>
        `,
        completed: false,
        unlocked: false
    }
];

// Encouragement messages
const encouragementMessages = {
    en: [
        "Your ideas are amazing! Keep going!",
        "You're a creative superstar!",
        "Wow! Your imagination is incredible!",
        "Keep those creative juices flowing!",
        "You're doing fantastic!",
        "Your brain is a creativity machine!"
    ],
    zh: [
        "你的想法太棒了！繼續加油！",
        "你是創意超級明星！",
        "哇！你的想像力太驚人了！",
        "保持創意源源不斷！",
        "你做得太棒了！",
        "你的大腦是創意機器！"
    ]
};

// DOM elements
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const instructionSection = document.getElementById('instructionSection');
const activityContent = document.getElementById('activityContent');
const authForm = document.getElementById('authForm');
const signInBtn = document.getElementById('signInBtn');
const welcomeName = document.getElementById('welcomeName');
const welcomeNameZh = document.getElementById('welcomeNameZh');
const encouragementMessage = document.getElementById('encouragementMessage');
const encouragementMessageZh = document.getElementById('encouragementMessageZh');
const weekProgress = document.getElementById('weekProgress');
const weekProgressZh = document.getElementById('weekProgressZh');
const activityCards = document.getElementById('activityCards');
const instructionTitle = document.getElementById('instructionTitle');
const instructionContent = document.getElementById('instructionContent');
const startActivityBtn = document.getElementById('startActivityBtn');
const backFromInstruction = document.getElementById('backFromInstruction');
const backFromActivity = document.getElementById('backFromActivity');
const activityTitle = document.getElementById('activityTitle');
const activitySpecificContent = document.getElementById('activitySpecificContent');
const submitActivityBtn = document.getElementById('submitActivityBtn');
const completionMessage = document.getElementById('completionMessage');
const languageButtons = document.querySelectorAll('.lang-btn');
const logoutBtn = document.getElementById('logoutBtn');
const fontSizeUp = document.getElementById('fontSizeUp');
const fontSizeDown = document.getElementById('fontSizeDown');

// Handle logout
function handleLogout() {
    // Clear user data from localStorage
    localStorage.removeItem('creativityCornerUser');
    currentUser = null;
    
    // Reset activities to initial state
    activities.forEach(activity => {
        activity.completed = false;
        activity.unlocked = activity.id === 1; // Only first activity unlocked
    });
    
    // Hide logout button
    logoutBtn.style.display = 'none';
    
    // Show auth section and hide others
    authSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
    instructionSection.style.display = 'none';
    activityContent.style.display = 'none';
    
    // Clear form
    document.getElementById('authForm').reset();
}

// Show dashboard
function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    instructionSection.style.display = 'none';
    activityContent.style.display = 'none';
    
    // Show logout button when on dashboard
    logoutBtn.style.display = 'block';
    
    // Update user info
    if (currentUser) {
        welcomeName.textContent = currentUser.name;
        welcomeNameZh.textContent = currentUser.name;
    }
    
    // Update progress
    updateProgressTracker();
    
    // Update activity cards
    generateActivityCards();
    
    // Set a random encouragement message
    setRandomEncouragement();
}

// Update language
function updateLanguage(lang) {
    currentLanguage = lang;
    
    // Update language buttons
    languageButtons.forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update all language-specific elements
    document.querySelectorAll('.lang-en').forEach(el => {
        el.style.display = lang === 'en' ? 'block' : 'none';
    });
    
    document.querySelectorAll('.lang-zh').forEach(el => {
        el.style.display = lang === 'zh' ? 'block' : 'none';
    });
    
    // Update activity cards
    generateActivityCards();
    
    // Update progress tracker
    updateProgressTracker();
    
    // Update encouragement message
    setRandomEncouragement();
    
    // Update activity title if viewing an activity
    if (currentActivity) {
        const activity = activities.find(a => a.id === currentActivity);
        if (activity) {
            activityTitle.textContent = lang === 'en' ? activity.title_en : activity.title_zh;
        }
    }
}

// Handle authentication form submission
function handleAuthSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const email = document.getElementById('email').value;
    const language = document.getElementById('language').value;
    
    // Create user object
    currentUser = {
        name,
        age,
        email,
        language,
        joinedDate: new Date().toISOString(),
        completedActivities: []
    };
    
    // Save to localStorage
    localStorage.setItem('creativityCornerUser', JSON.stringify(currentUser));
    
    // Update language
    updateLanguage(language);
    
    // Show dashboard
    showDashboard();

    // Show logout button
    logoutBtn.style.display = 'block';
}

// Handle sign in
function handleSignIn() {
    // For demo purposes, we'll just use a mock user
    const demoUser = {
        name: "Alex",
        age: "8",
        email: "alex@example.com",
        language: "en",
        joinedDate: new Date().toISOString(),
        completedActivities: [1] // First activity already completed for demo
    };
    
    currentUser = demoUser;
    localStorage.setItem('creativityCornerUser', JSON.stringify(currentUser));
    
    // Mark first activity as completed for demo
    activities[0].completed = true;
    activities[2].unlocked = true; // Unlock third activity
    
    updateLanguage(currentUser.language);
    showDashboard();
}

// Show instructions for an activity
function showInstructions(activityId) {
    currentActivity = activityId;
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) return;
    
    instructionTitle.textContent = currentLanguage === 'en' ? activity.title_en : activity.title_zh;
    instructionContent.innerHTML = currentLanguage === 'en' ? activity.instructions_en : activity.instructions_zh;
    
    dashboardSection.style.display = 'none';
    instructionSection.style.display = 'block';
    activityContent.style.display = 'none';
}

// Start the activity
function startActivity() {
    const activity = activities.find(a => a.id === currentActivity);
    
    if (!activity) return;
    
    activityTitle.textContent = currentLanguage === 'en' ? activity.title_en : activity.title_zh;
    
    // Load activity-specific content
    loadActivityContent(activity.id);
    
    instructionSection.style.display = 'none';
    activityContent.style.display = 'block';
    completionMessage.style.display = 'none';
}

// Submit activity
function submitActivity() {
    const activity = activities.find(a => a.id === currentActivity);
    
    if (activity) {
        activity.completed = true;
        
        // Unlock next activity if applicable
        if (currentActivity < activities.length) {
            const nextActivity = activities.find(a => a.id === currentActivity + 1);
            if (nextActivity) {
                nextActivity.unlocked = true;
            }
        }
        
        // Update user's completed activities
        if (currentUser && !currentUser.completedActivities.includes(currentActivity)) {
            currentUser.completedActivities.push(currentActivity);
            localStorage.setItem('creativityCornerUser', JSON.stringify(currentUser));
        }
        
        // Show completion message
        completionMessage.style.display = 'block';
        submitActivityBtn.innerHTML = currentLanguage === 'en' ? 
            '<i class="fas fa-forward"></i> Continue to Next Activity' : 
            '<i class="fas fa-forward"></i> 繼續下一個活動';
        
        // Update progress tracker
        updateProgressTracker();
        
        // Update activity cards
        generateActivityCards();
        
        // Change button behavior for next click
        submitActivityBtn.onclick = function() {
            if (currentActivity < activities.length) {
                showInstructions(currentActivity + 1);
            } else {
                showDashboard();
            }
        };
    }
}

// Generate activity cards
function generateActivityCards() {
    activityCards.innerHTML = '';
    
    activities.forEach(activity => {
        const card = document.createElement('div');
        card.className = `activity-card ${activity.unlocked ? '' : 'locked'}`;
        card.dataset.id = activity.id;
        
        if (activity.unlocked) {
            card.addEventListener('click', () => showInstructions(activity.id));
        }
        
        const title = currentLanguage === 'en' ? activity.title_en : activity.title_zh;
        const description = currentLanguage === 'en' ? activity.description_en : activity.description_zh;
        const statusText = activity.completed ? 
            (currentLanguage === 'en' ? 'Completed ✓' : '已完成 ✓') : 
            (currentLanguage === 'en' ? 'Ready to start!' : '準備開始！');
        
        card.innerHTML = `
            <div class="activity-icon ${activity.colorClass}">
                <i class="${activity.icon}"></i>
            </div>
            ${!activity.unlocked ? '<div class="lock-icon"><i class="fas fa-lock"></i></div>' : ''}
            <h4>${title}</h4>
            <p>${description}</p>
            <div class="activity-status ${activity.completed ? 'completed' : 'incomplete'}">
                ${statusText}
            </div>
        `;
        
        activityCards.appendChild(card);
    });
}

// Update progress tracker
function updateProgressTracker() {
    const completedCount = activities.filter(a => a.completed).length;
    const totalCount = activities.length;
    
    if (currentLanguage === 'en') {
        let weekText = '';
        if (completedCount === 0) {
            weekText = 'Week 1: Activity 1 - Incomplete';
        } else if (completedCount === totalCount) {
            weekText = 'All activities completed! 🎉';
        } else {
            weekText = `Week 1: Activity ${completedCount + 1} - Incomplete`;
        }
        weekProgress.textContent = weekText;
    } else {
        let weekText = '';
        if (completedCount === 0) {
            weekText = '第一周：活動一 - 未完成';
        } else if (completedCount === totalCount) {
            weekText = '所有活動已完成！🎉';
        } else {
            weekText = `第一周：活動${completedCount + 1} - 未完成`;
        }
        weekProgressZh.textContent = weekText;
    }
}

// Set random encouragement message
function setRandomEncouragement() {
    const messages = encouragementMessages[currentLanguage];
    const randomIndex = Math.floor(Math.random() * messages.length);
    
    if (currentLanguage === 'en') {
        encouragementMessage.textContent = messages[randomIndex];
    } else {
        encouragementMessageZh.textContent = messages[randomIndex];
    }
}

// Load activity-specific content
function loadActivityContent(activityId) {
    let content = '';
    
    switch(activityId) {
        case 1: // Transformation of Animals
            if (currentLanguage === 'en') {
                content = `
                    <div class="worksheet-content lang-en">
                        <h4>Draw Your Transformation Animal:</h4>
                        
                        <div class="drawing-frame">
                            <div style="text-align: center;">
                                <i class="fas fa-pencil-alt" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                                <p>Drawing area - Create your new animal here!</p>
                                <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">Draw your transformed animal combining elephant and butterfly features</p>
                            </div>
                        </div>
                        
                        <div class="hint-box">
                            <h4><i class="fas fa-lightbulb"></i> Remember:</h4>
                            <ul>
                                <li>Combine body parts from both animals</li>
                                <li>Be creative! Exaggerate, simplify, or stylize features</li>
                                <li>Give your new animal a name!</li>
                            </ul>
                        </div>
                    </div>
                    <div class="lang-zh" style="display: none;">
                        <div class="worksheet-content">
                            <h4>畫出你的動物:</h4>
                            
                            <div class="drawing-frame">
                                <div style="text-align: center;">
                                    <i class="fas fa-pencil-alt" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                                    <p>繪圖區域 - 在這裡創造你的新動物！</p>
                                    <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">畫出結合大象和蝴蝶特徵的新動物</p>
                                </div>
                            </div>
                            
                            <div class="hint-box">
                                <h4><i class="fas fa-lightbulb"></i> 記住：</h4>
                                <ul>
                                    <li>結合兩種動物的身體部位</li>
                                    <li>發揮創意！誇張、簡化或創意呈現特徵</li>
                                    <li>為你的新動物取個名字！</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div class="lang-en" style="display: none;">
                        <div class="worksheet-content">
                            <h4>Draw Your Transformation Animal:</h4>
                            
                            <div class="drawing-frame">
                                <div style="text-align: center;">
                                    <i class="fas fa-pencil-alt" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                                    <p>Drawing area - Create your new animal here!</p>
                                    <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">Draw your transformed animal combining elephant and butterfly features</p>
                                </div>
                            </div>
                            
                            <div class="hint-box">
                                <h4><i class="fas fa-lightbulb"></i> Remember:</h4>
                                <ul>
                                    <li>Combine body parts from both animals</li>
                                    <li>Be creative! Exaggerate, simplify, or stylize features</li>
                                    <li>Give your new animal a name!</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="worksheet-content lang-zh">
                        <h4>畫出你的動物:</h4>
                        
                        <div class="drawing-frame">
                            <div style="text-align: center;">
                                <i class="fas fa-pencil-alt" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                                <p>繪圖區域 - 在這裡創造你的新動物！</p>
                                <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">畫出結合大象和蝴蝶特徵的新動物</p>
                            </div>
                        </div>
                        
                        <div class="hint-box">
                            <h4><i class="fas fa-lightbulb"></i> 記住：</h4>
                            <ul>
                                <li>結合兩種動物的身體部位</li>
                                <li>發揮創意！誇張、簡化或創意呈現特徵</li>
                                <li>為你的新動物取個名字！</li>
                            </ul>
                        </div>
                    </div>
                `;
            }
            break;
            
        case 2: // What If...? Challenge
            if (currentLanguage === 'en') {
                content = `
                    <div class="worksheet-content lang-en">
                        <div class="whatif-question">
                            <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                            <p>What if my bedroom is on the ship?</p>
                        </div>
                        
                        <h4>✍️ The possible Consequences:</h4>
                        
                        <div class="consequence-item">
                            <label for="consequence1">Consequence 1:</label>
                            <textarea class="consequence-input" id="consequence1" placeholder="Type your answer here..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence2">Consequence 2:</label>
                            <textarea class="consequence-input" id="consequence2" placeholder="Type your answer here..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence3">Consequence 3:</label>
                            <textarea class="consequence-input" id="consequence3" placeholder="Type your answer here..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence4">Consequence 4:</label>
                            <textarea class="consequence-input" id="consequence4" placeholder="Type your answer here..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence5">Consequence 5:</label>
                            <textarea class="consequence-input" id="consequence5" placeholder="Type your answer here..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence6">Consequence 6:</label>
                            <textarea class="consequence-input" id="consequence6" placeholder="Type your answer here..."></textarea>
                        </div>
                    </div>
                    <div class="lang-zh" style="display: none;">
                        <div class="worksheet-content">
                            <div class="whatif-question">
                                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                                <p>如果我的臥室在船上會怎樣？</p>
                            </div>
                            
                            <h4>✍️可能的後果：</h4>
                            
                            <div class="consequence-item">
                                <label for="consequence1-zh">後果 1:</label>
                                <textarea class="consequence-input" id="consequence1-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence2-zh">後果 2:</label>
                                <textarea class="consequence-input" id="consequence2-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence3-zh">後果 3:</label>
                                <textarea class="consequence-input" id="consequence3-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence4-zh">後果 4:</label>
                                <textarea class="consequence-input" id="consequence4-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence5-zh">後果 5:</label>
                                <textarea class="consequence-input" id="consequence5-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence6-zh">後果 6:</label>
                                <textarea class="consequence-input" id="consequence6-zh" placeholder="在此輸入你的答案..."></textarea>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div class="lang-en" style="display: none;">
                        <div class="worksheet-content">
                            <div class="whatif-question">
                                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                                <p>What if my bedroom is on the ship?</p>
                            </div>
                            
                            <h4>✍️ The possible Consequences:</h4>
                            
                            <div class="consequence-item">
                                <label for="consequence1">Consequence 1:</label>
                                <textarea class="consequence-input" id="consequence1" placeholder="Type your answer here..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence2">Consequence 2:</label>
                                <textarea class="consequence-input" id="consequence2" placeholder="Type your answer here..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence3">Consequence 3:</label>
                                <textarea class="consequence-input" id="consequence3" placeholder="Type your answer here..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence4">Consequence 4:</label>
                                <textarea class="consequence-input" id="consequence4" placeholder="Type your answer here..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence5">Consequence 5:</label>
                                <textarea class="consequence-input" id="consequence5" placeholder="Type your answer here..."></textarea>
                            </div>
                            
                            <div class="consequence-item">
                                <label for="consequence6">Consequence 6:</label>
                                <textarea class="consequence-input" id="consequence6" placeholder="Type your answer here..."></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="worksheet-content lang-zh">
                        <div class="whatif-question">
                            <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                            <p>如果我的臥室在船上會怎樣？</p>
                        </div>
                        
                        <h4>✍️可能的後果：</h4>
                        
                        <div class="consequence-item">
                            <label for="consequence1-zh">後果 1:</label>
                            <textarea class="consequence-input" id="consequence1-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence2-zh">後果 2:</label>
                            <textarea class="consequence-input" id="consequence2-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence3-zh">後果 3:</label>
                            <textarea class="consequence-input" id="consequence3-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence4-zh">後果 4:</label>
                            <textarea class="consequence-input" id="consequence4-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence5-zh">後果 5:</label>
                            <textarea class="consequence-input" id="consequence5-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                        
                        <div class="consequence-item">
                            <label for="consequence6-zh">後果 6:</label>
                            <textarea class="consequence-input" id="consequence6-zh" placeholder="在此輸入你的答案..."></textarea>
                        </div>
                    </div>
                `;
            }
            break;
            
        case 3: // Word Association Activity
            if (currentLanguage === 'en') {
                content = `
                    <div class="worksheet-content lang-en">
                        <div class="word-chain-container">
                            <h4>Create a word chain from "Kid" to "Sea":</h4>
                            
                            <div class="word-chain">
                                <div class="word-box">Kid</div>
                                <div class="blank-box"><input type="text" id="word1" placeholder="Word 1"></div>
                                <div class="blank-box"><input type="text" id="word2" placeholder="Word 2"></div>
                                <div class="blank-box"><input type="text" id="word3" placeholder="Word 3"></div>
                                <div class="blank-box"><input type="text" id="word4" placeholder="Word 4"></div>
                                <div class="blank-box"><input type="text" id="word5" placeholder="Word 5"></div>
                                <div class="word-box">Sea</div>
                            </div>
                            
                            <p style="text-align: center; margin-top: 20px;">Each word should be related to the one before it.</p>
                        </div>
                        
                        <div class="hint-box">
                            <h4><i class="fas fa-lightbulb"></i> Thinking tips:</h4>
                            <ul>
                                <li>What does a kid like to do? Play? Learn? Imagine?</li>
                                <li>What activities might connect to the sea? Swim? Boat? Fish?</li>
                                <li>Think of a story: Kid → Play → Water → Swim → Ocean → Sea</li>
                            </ul>
                        </div>
                    </div>
                    <div class="lang-zh" style="display: none;">
                        <div class="worksheet-content">
                            <div class="word-chain-container">
                                <h4>創建從「孩子」到「海洋」的詞語鏈：</h4>
                                
                                <div class="word-chain">
                                    <div class="word-box">孩子</div>
                                    <div class="blank-box"><input type="text" id="word1-zh" placeholder="詞語 1"></div>
                                    <div class="blank-box"><input type="text" id="word2-zh" placeholder="詞語 2"></div>
                                    <div class="blank-box"><input type="text" id="word3-zh" placeholder="詞語 3"></div>
                                    <div class="blank-box"><input type="text" id="word4-zh" placeholder="詞語 4"></div>
                                    <div class="blank-box"><input type="text" id="word5-zh" placeholder="詞語 5"></div>
                                    <div class="word-box">海洋</div>
                                </div>
                                
                                <p style="text-align: center; margin-top: 20px;">每個詞語應與前一個詞語相關。</p>
                            </div>
                            
                            <div class="hint-box">
                                <h4><i class="fas fa-lightbulb"></i> 思考提示：</h4>
                                <ul>
                                    <li>孩子喜歡做什麼？玩耍？學習？想像？</li>
                                    <li>什麼活動可能與海洋有關？游泳？划船？釣魚？</li>
                                    <li>想一個故事：孩子 → 玩耍 → 水 → 游泳 → 大海 → 海洋</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div class="lang-en" style="display: none;">
                        <div class="worksheet-content">
                            <div class="word-chain-container">
                                <h4>Create a word chain from "Kid" to "Sea":</h4>
                                
                                <div class="word-chain">
                                    <div class="word-box">Kid</div>
                                    <div class="blank-box"><input type="text" id="word1" placeholder="Word 1"></div>
                                    <div class="blank-box"><input type="text" id="word2" placeholder="Word 2"></div>
                                    <div class="blank-box"><input type="text" id="word3" placeholder="Word 3"></div>
                                    <div class="blank-box"><input type="text" id="word4" placeholder="Word 4"></div>
                                    <div class="blank-box"><input type="text" id="word5" placeholder="Word 5"></div>
                                    <div class="word-box">Sea</div>
                                </div>
                                
                                <p style="text-align: center; margin-top: 20px;">Each word should be related to the one before it.</p>
                            </div>
                            
                            <div class="hint-box">
                                <h4><i class="fas fa-lightbulb"></i> Thinking tips:</h4>
                                <ul>
                                    <li>What does a kid like to do? Play? Learn? Imagine?</li>
                                    <li>What activities might connect to the sea? Swim? Boat? Fish?</li>
                                    <li>Think of a story: Kid → Play → Water → Swim → Ocean → Sea</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="worksheet-content lang-zh">
                        <div class="word-chain-container">
                            <h4>創建從「孩子」到「海洋」的詞語鏈：</h4>
                            
                            <div class="word-chain">
                                <div class="word-box">孩子</div>
                                <div class="blank-box"><input type="text" id="word1-zh" placeholder="詞語 1"></div>
                                <div class="blank-box"><input type="text" id="word2-zh" placeholder="詞語 2"></div>
                                <div class="blank-box"><input type="text" id="word3-zh" placeholder="詞語 3"></div>
                                <div class="blank-box"><input type="text" id="word4-zh" placeholder="詞語 4"></div>
                                <div class="blank-box"><input type="text" id="word5-zh" placeholder="詞語 5"></div>
                                <div class="word-box">海洋</div>
                            </div>
                            
                            <p style="text-align: center; margin-top: 20px;">每個詞語應與前一個詞語相關。</p>
                        </div>
                        
                        <div class="hint-box">
                            <h4><i class="fas fa-lightbulb"></i> 思考提示：</h4>
                            <ul>
                                <li>孩子喜歡做什麼？玩耍？學習？想像？</li>
                                <li>什麼活動可能與海洋有關？游泳？划船？釣魚？</li>
                                <li>想一個故事：孩子 → 玩耍 → 水 → 游泳 → 大海 → 海洋</li>
                            </ul>
                        </div>
                    </div>
                `;
            }
            break;
            
        case 4: // Why Did It End Up There?
            if (currentLanguage === 'en') {
                content = `
                    <div class="worksheet-content lang-en">
                        <div class="scenario-box">
                            <h3><i class="fas fa-search"></i> Mystery Situation:</h3>
                            <p style="font-size: 1.8rem; margin-top: 10px;">A penguin in the desert</p>
                        </div>
                        
                        <h4>✏️ Your Ideas:</h4>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-search"></i>
                                <span>Idea 1: What is the situation?</span>
                            </div>
                            <p>Describe the scene. What does the desert look like? Was it full of people or nothing is in the desert? What is the penguin doing?</p>
                            <textarea class="consequence-input" id="idea1" placeholder="Describe the scene..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-question"></i>
                                <span>Idea 2: Why is the penguin there?</span>
                            </div>
                            <p>What led the penguin to this place? Was it an accident, a mission, or something else?</p>
                            <textarea class="consequence-input" id="idea2" placeholder="Explain why..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-bullseye"></i>
                                <span>Idea 3: What is the penguin's goal or purpose?</span>
                            </div>
                            <p>Is it trying to survive, explore, escape, or help someone? Was it someone helping the penguin or there is only itself?</p>
                            <textarea class="consequence-input" id="idea3" placeholder="Describe the goal..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Idea 4: What challenges does it face?</span>
                            </div>
                            <p>What problems or surprises does the penguin appear in the desert?</p>
                            <textarea class="consequence-input" id="idea4" placeholder="Describe challenges..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-flag-checkered"></i>
                                <span>Idea 5: What is the ending or outcome?</span>
                            </div>
                            <p>How does the story end? Does the penguin succeed, return home, or explore something new in the desert?</p>
                            <textarea class="consequence-input" id="idea5" placeholder="Describe the ending..."></textarea>
                        </div>
                    </div>
                    <div class="lang-zh" style="display: none;">
                        <div class="worksheet-content">
                            <div class="scenario-box">
                                <h3><i class="fas fa-search"></i> 神秘情境：</h3>
                                <p style="font-size: 1.8rem; margin-top: 10px;">沙漠裡的企鵝</p>
                            </div>
                            
                            <h4>✏️ 你的想法：</h4>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-search"></i>
                                    <span>想法 1：這是什麼情境？</span>
                                </div>
                                <p>描述這個場景。沙漠是什麼樣子？很荒蕪的還是充滿人氣的？沙漠的企鵝在做什麼？</p>
                                <textarea class="consequence-input" id="idea1-zh" placeholder="描述場景..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-question"></i>
                                    <span>想法 2：企鵝為什麼會在那裡？</span>
                                </div>
                                <p>是什麼原因讓企鵝來到這個地方？是因為意外、做任務，還是其他原因？</p>
                                <textarea class="consequence-input" id="idea2-zh" placeholder="解釋原因..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-bullseye"></i>
                                    <span>想法 3：企鵝的目標或目的是什麼？</span>
                                </div>
                                <p>它是想生存、探索、逃離，還是幫助某人？</p>
                                <textarea class="consequence-input" id="idea3-zh" placeholder="描述目標..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>想法 4：它面臨什麼挑戰或驚喜？</span>
                                </div>
                                <p>在沙漠中企鵝遇到了哪些困難或驚喜？遇到幫助他的人，還是自己一個人在做事？</p>
                                <textarea class="consequence-input" id="idea4-zh" placeholder="描述挑戰..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-flag-checkered"></i>
                                    <span>想法 5：故事的結局是什麼？</span>
                                </div>
                                <p>結局如何？企鵝成功了嗎？回家了嗎？還是想留在沙漠探索？</p>
                                <textarea class="consequence-input" id="idea5-zh" placeholder="描述結局..."></textarea>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div class="lang-en" style="display: none;">
                        <div class="worksheet-content">
                            <div class="scenario-box">
                                <h3><i class="fas fa-search"></i> Mystery Situation:</h3>
                                <p style="font-size: 1.8rem; margin-top: 10px;">A penguin in the desert</p>
                            </div>
                            
                            <h4>✏️ Your Ideas:</h4>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-search"></i>
                                    <span>Idea 1: What is the situation?</span>
                                </div>
                                <p>Describe the scene. What does the desert look like? Was it full of people or nothing is in the desert? What is the penguin doing?</p>
                                <textarea class="consequence-input" id="idea1" placeholder="Describe the scene..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-question"></i>
                                    <span>Idea 2: Why is the penguin there?</span>
                                </div>
                                <p>What led the penguin to this place? Was it an accident, a mission, or something else?</p>
                                <textarea class="consequence-input" id="idea2" placeholder="Explain why..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-bullseye"></i>
                                    <span>Idea 3: What is the penguin's goal or purpose?</span>
                                </div>
                                <p>Is it trying to survive, explore, escape, or help someone? Was it someone helping the penguin or there is only itself?</p>
                                <textarea class="consequence-input" id="idea3" placeholder="Describe the goal..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <span>Idea 4: What challenges does it face?</span>
                                </div>
                                <p>What problems or surprises does the penguin appear in the desert?</p>
                                <textarea class="consequence-input" id="idea4" placeholder="Describe challenges..."></textarea>
                            </div>
                            
                            <div class="idea-item">
                                <div class="idea-question">
                                    <i class="fas fa-flag-checkered"></i>
                                    <span>Idea 5: What is the ending or outcome?</span>
                                </div>
                                <p>How does the story end? Does the penguin succeed, return home, or explore something new in the desert?</p>
                                <textarea class="consequence-input" id="idea5" placeholder="Describe the ending..."></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="worksheet-content lang-zh">
                        <div class="scenario-box">
                            <h3><i class="fas fa-search"></i> 神秘情境：</h3>
                            <p style="font-size: 1.8rem; margin-top: 10px;">沙漠裡的企鵝</p>
                        </div>
                        
                        <h4>✏️ 你的想法：</h4>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-search"></i>
                                <span>想法 1：這是什麼情境？</span>
                            </div>
                            <p>描述這個場景。沙漠是什麼樣子？很荒蕪的還是充滿人氣的？沙漠的企鵝在做什麼？</p>
                            <textarea class="consequence-input" id="idea1-zh" placeholder="描述場景..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-question"></i>
                                <span>想法 2：企鵝為什麼會在那裡？</span>
                            </div>
                            <p>是什麼原因讓企鵝來到這個地方？是因為意外、做任務，還是其他原因？</p>
                            <textarea class="consequence-input" id="idea2-zh" placeholder="解釋原因..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-bullseye"></i>
                                <span>想法 3：企鵝的目標或目的是什麼？</span>
                            </div>
                            <p>它是想生存、探索、逃離，還是幫助某人？</p>
                            <textarea class="consequence-input" id="idea3-zh" placeholder="描述目標..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>想法 4：它面臨什麼挑戰或驚喜？</span>
                            </div>
                            <p>在沙漠中企鵝遇到了哪些困難或驚喜？遇到幫助他的人，還是自己一個人在做事？</p>
                            <textarea class="consequence-input" id="idea4-zh" placeholder="描述挑戰..."></textarea>
                        </div>
                        
                        <div class="idea-item">
                            <div class="idea-question">
                                <i class="fas fa-flag-checkered"></i>
                                <span>想法 5：故事的結局是什麼？</span>
                            </div>
                            <p>結局如何？企鵝成功了嗎？回家了嗎？還是想留在沙漠探索？</p>
                            <textarea class="consequence-input" id="idea5-zh" placeholder="描述結局..."></textarea>
                        </div>
                    </div>
                `;
            }
            break;
            
        case 5: // Brainstorming Task
            if (currentLanguage === 'en') {
                content = `
                    <div class="worksheet-content lang-en">
                        <div class="problem-box">
                            <h3><i class="fas fa-lightbulb"></i> Problem to Solve:</h3>
                            <p style="font-size: 1.3rem; margin-top: 10px;">How can we stay cool during hot summer days in Hong Kong?</p>
                        </div>
                        
                        <h4>Step 1: Brainstorm Solutions</h4>
                        <p>Think of four different ways to solve the questions.</p>
                        
                        <div class="solutions-container">
                            <div class="solution-item">
                                <label for="solution1">Solution 1:</label>
                                <textarea class="solution-input" id="solution1" placeholder="Type your first solution..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution2">Solution 2:</label>
                                <textarea class="solution-input" id="solution2" placeholder="Type your second solution..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution3">Solution 3:</label>
                                <textarea class="solution-input" id="solution3" placeholder="Type your third solution..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution4">Solution 4:</label>
                                <textarea class="solution-input" id="solution4" placeholder="Type your fourth solution..."></textarea>
                            </div>
                        </div>
                        
                        <div class="categories-container">
                            <h4>Step 2: Categorize Your Solutions</h4>
                            <p>Place each solution into one of the four categories:</p>
                            
                            <div class="category-item">
                                <h5>Irrelevant or Impossible</h5>
                                <p>Is the solution can help to solve the problem?</p>
                                <div class="category-drop" id="category1">
                                    <p style="color: #999; text-align: center;">Drag solutions here</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>Feasible but Not Worthwhile</h5>
                                <p>Is the solution can be achieved by ourselves but need a lot of material and resource?</p>
                                <div class="category-drop" id="category2">
                                    <p style="color: #999; text-align: center;">Drag solutions here</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>Feasible but Not Executed by Us and Not Here</h5>
                                <p>Is the solution can be executed by ourselves or need other people?</p>
                                <div class="category-drop" id="category3">
                                    <p style="color: #999; text-align: center;">Drag solutions here</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>Possible Here and Now</h5>
                                <p>Is it the material needed in the solution is easy to get?</p>
                                <div class="category-drop" id="category4">
                                    <p style="color: #999; text-align: center;">Drag solutions here</p>
                                </div>
                            </div>
                        </div>
                        
                        <p style="text-align: center; margin-top: 20px; font-style: italic; color: #666;">
                            (In a full implementation, this would include drag-and-drop functionality)
                        </p>
                    </div>
                    <div class="lang-zh" style="display: none;">
                        <div class="worksheet-content">
                            <div class="problem-box">
                                <h3><i class="fas fa-lightbulb"></i> 需要解決的問題：</h3>
                                <p style="font-size: 1.3rem; margin-top: 10px;">在香港炎熱的夏天，我們如何保持涼爽？</p>
                            </div>
                            
                            <h4>第一步：集思廣益</h4>
                            <p>想出四種不同的方法來解決這個問題。</p>
                            
                            <div class="solutions-container">
                                <div class="solution-item">
                                    <label for="solution1-zh">解決方案 1:</label>
                                    <textarea class="solution-input" id="solution1-zh" placeholder="輸入你的第一個解決方案..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution2-zh">解決方案 2:</label>
                                    <textarea class="solution-input" id="solution2-zh" placeholder="輸入你的第二個解決方案..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution3-zh">解決方案 3:</label>
                                    <textarea class="solution-input" id="solution3-zh" placeholder="輸入你的第三個解決方案..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution4-zh">解決方案 4:</label>
                                    <textarea class="solution-input" id="solution4-zh" placeholder="輸入你的第四個解決方案..."></textarea>
                                </div>
                            </div>
                            
                            <div class="categories-container">
                                <h4>第二步：分類你的解決方案</h4>
                                <p>將每個解決方案放入四個類別之一：</p>
                                
                                <div class="category-item">
                                    <h5>無關或不可能</h5>
                                    <p>這個解決方案能幫助解決問題嗎？</p>
                                    <div class="category-drop" id="category1-zh">
                                        <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>可行但不值得</h5>
                                    <p>這個解決方案可以由我們自己完成，但需要大量材料和資源嗎？</p>
                                    <div class="category-drop" id="category2-zh">
                                        <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>可行但不是我們或不是這裡</h5>
                                    <p>這個解決方案可以由我們自己執行，還是需要其他人？</p>
                                    <div class="category-drop" id="category3-zh">
                                        <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>此時此地可行</h5>
                                    <p>這個解決方案所需的材料容易取得嗎？</p>
                                    <div class="category-drop" id="category4-zh">
                                        <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                    </div>
                                </div>
                            </div>
                            
                            <p style="text-align: center; margin-top: 20px; font-style: italic; color: #666;">
                                (在完整實現中，將包含拖放功能)
                            </p>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div class="lang-en" style="display: none;">
                        <div class="worksheet-content">
                            <div class="problem-box">
                                <h3><i class="fas fa-lightbulb"></i> Problem to Solve:</h3>
                                <p style="font-size: 1.3rem; margin-top: 10px;">How can we stay cool during hot summer days in Hong Kong?</p>
                            </div>
                            
                            <h4>Step 1: Brainstorm Solutions</h4>
                            <p>Think of four different ways to solve the questions.</p>
                            
                            <div class="solutions-container">
                                <div class="solution-item">
                                    <label for="solution1">Solution 1:</label>
                                    <textarea class="solution-input" id="solution1" placeholder="Type your first solution..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution2">Solution 2:</label>
                                    <textarea class="solution-input" id="solution2" placeholder="Type your second solution..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution3">Solution 3:</label>
                                    <textarea class="solution-input" id="solution3" placeholder="Type your third solution..."></textarea>
                                </div>
                                
                                <div class="solution-item">
                                    <label for="solution4">Solution 4:</label>
                                    <textarea class="solution-input" id="solution4" placeholder="Type your fourth solution..."></textarea>
                                </div>
                            </div>
                            
                            <div class="categories-container">
                                <h4>Step 2: Categorize Your Solutions</h4>
                                <p>Place each solution into one of the four categories:</p>
                                
                                <div class="category-item">
                                    <h5>Irrelevant or Impossible</h5>
                                    <p>Is the solution can help to solve the problem?</p>
                                    <div class="category-drop" id="category1">
                                        <p style="color: #999; text-align: center;">Drag solutions here</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>Feasible but Not Worthwhile</h5>
                                    <p>Is the solution can be achieved by ourselves but need a lot of material and resource?</p>
                                    <div class="category-drop" id="category2">
                                        <p style="color: #999; text-align: center;">Drag solutions here</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>Feasible but Not Executed by Us and Not Here</h5>
                                    <p>Is the solution can be executed by ourselves or need other people?</p>
                                    <div class="category-drop" id="category3">
                                        <p style="color: #999; text-align: center;">Drag solutions here</p>
                                    </div>
                                </div>
                                
                                <div class="category-item">
                                    <h5>Possible Here and Now</h5>
                                    <p>Is it the material needed in the solution is easy to get?</p>
                                    <div class="category-drop" id="category4">
                                        <p style="color: #999; text-align: center;">Drag solutions here</p>
                                    </div>
                                </div>
                            </div>
                            
                            <p style="text-align: center; margin-top: 20px; font-style: italic; color: #666;">
                                (In a full implementation, this would include drag-and-drop functionality)
                            </p>
                        </div>
                    </div>
                    <div class="worksheet-content lang-zh">
                        <div class="problem-box">
                            <h3><i class="fas fa-lightbulb"></i> 需要解決的問題：</h3>
                            <p style="font-size: 1.3rem; margin-top: 10px;">在香港炎熱的夏天，我們如何保持涼爽？</p>
                        </div>
                        
                        <h4>第一步：集思廣益</h4>
                        <p>想出四種不同的方法來解決這個問題。</p>
                        
                        <div class="solutions-container">
                            <div class="solution-item">
                                <label for="solution1-zh">解決方案 1:</label>
                                <textarea class="solution-input" id="solution1-zh" placeholder="輸入你的第一個解決方案..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution2-zh">解決方案 2:</label>
                                <textarea class="solution-input" id="solution2-zh" placeholder="輸入你的第二個解決方案..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution3-zh">解決方案 3:</label>
                                <textarea class="solution-input" id="solution3-zh" placeholder="輸入你的第三個解決方案..."></textarea>
                            </div>
                            
                            <div class="solution-item">
                                <label for="solution4-zh">解決方案 4:</label>
                                <textarea class="solution-input" id="solution4-zh" placeholder="輸入你的第四個解決方案..."></textarea>
                            </div>
                        </div>
                        
                        <div class="categories-container">
                            <h4>第二步：分類你的解決方案</h4>
                            <p>將每個解決方案放入四個類別之一：</p>
                            
                            <div class="category-item">
                                <h5>無關或不可能</h5>
                                <p>這個解決方案能幫助解決問題嗎？</p>
                                <div class="category-drop" id="category1-zh">
                                    <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>可行但不值得</h5>
                                <p>這個解決方案可以由我們自己完成，但需要大量材料和資源嗎？</p>
                                <div class="category-drop" id="category2-zh">
                                    <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>可行但不是我們或不是這裡</h5>
                                <p>這個解決方案可以由我們自己執行，還是需要其他人？</p>
                                <div class="category-drop" id="category3-zh">
                                    <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                </div>
                            </div>
                            
                            <div class="category-item">
                                <h5>此時此地可行</h5>
                                <p>這個解決方案所需的材料容易取得嗎？</p>
                                <div class="category-drop" id="category4-zh">
                                    <p style="color: #999; text-align: center;">將解決方案拖放到這裡</p>
                                </div>
                            </div>
                        </div>
                        
                        <p style="text-align: center; margin-top: 20px; font-style: italic; color: #666;">
                            (在完整實現中，將包含拖放功能)
                        </p>
                    </div>
                `;
            }
            break;
    }
    
    activitySpecificContent.innerHTML = content;
    
    // Reset submit button
    submitActivityBtn.innerHTML = currentLanguage === 'en' ? 
        '<i class="fas fa-paper-plane"></i> Submit Activity' : 
        '<i class="fas fa-paper-plane"></i> 提交活動';
    submitActivityBtn.onclick = submitActivity;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Apply saved font size
    applyFontSize(currentFontSize);
    
    // Font size controls
    if (fontSizeUp) {
        fontSizeUp.addEventListener('click', () => {
            if (currentFontSize < maxFontSize) applyFontSize(currentFontSize + 1);
        });
    }
    
    if (fontSizeDown) {
        fontSizeDown.addEventListener('click', () => {
            if (currentFontSize > minFontSize) applyFontSize(currentFontSize - 1);
        });
    }
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('creativityCornerUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        currentLanguage = currentUser.language || 'en';
        updateLanguage(currentLanguage);
        showDashboard();
        
        // Show logout button when logged in
        logoutBtn.style.display = 'block';
    } else {
        // Ensure logout button is hidden when not logged in
        logoutBtn.style.display = 'none';
    }
    
    // Set up event listeners
    authForm.addEventListener('submit', handleAuthSubmit);
    signInBtn.addEventListener('click', handleSignIn);
    startActivityBtn.addEventListener('click', startActivity);
    backFromInstruction.addEventListener('click', () => showDashboard());
    backFromActivity.addEventListener('click', () => showInstructions(currentActivity));
    submitActivityBtn.addEventListener('click', submitActivity);
    
    // Add logout button listener
    logoutBtn.addEventListener('click', handleLogout);
    
    // Language toggle
    languageButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            updateLanguage(lang);
        });
    });
    
    // Generate activity cards
    generateActivityCards();
    
    // Set a random encouragement message
    setRandomEncouragement();
    
    // Update progress tracker
    updateProgressTracker();
});