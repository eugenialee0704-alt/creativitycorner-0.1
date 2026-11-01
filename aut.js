(function () {
    const DIFY_APP = 'TqQd9UYVwS5yh1rN';
    const DIFY_API = 'https://api.dify.ai/v1';
    const DIFY_WEB = 'https://udify.app/api';
    const KEY_STORAGE = 'creativityDifyApiKey';
    const INDEX_KEY = 'autArchiveIndex';
    const BOXES = 6;

    const STATUS = {
        valid: { en: 'Counted', zh: '計入' },
        main_use: { en: 'Usual use', zh: '一般用途' },
        impossible: { en: 'Not possible', zh: '做不到' },
        vague: { en: 'Too general', zh: '太籠統' },
        nonsense: { en: 'Not a real idea', zh: '沒有意義' },
        duplicate: { en: 'Same idea again', zh: '重複想法' },
        empty: { en: 'Empty', zh: '空白' }
    };

    const ICONS = { book: '📖', sticky: '📝', brick: '🧱', newspaper: '📰' };
    const TEST_SECONDS = 180;
    const MAIN_USE_LABELS = {
        book: { en: 'Reading', zh: '閱讀' },
        sticky: { en: 'Taking notes', zh: '寫筆記' },
        brick: { en: 'Building', zh: '建築' },
        newspaper: { en: 'Reading the news', zh: '看新聞' }
    };
    let timerId = null;
    let submitLock = false;

    function scoreApi() {
        return window.AutScore;
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
        });
    }

    function langPair(en, zh) {
        return '<div class="lang-en">' + en + '</div><div class="lang-zh">' + zh + '</div>';
    }

    function langSpan(en, zh) {
        return '<span class="lang-en">' + en + '</span><span class="lang-zh">' + zh + '</span>';
    }

    function applyLang() {
        if (typeof updateLanguageVisibility === 'function') updateLanguageVisibility();
    }

    function userEmail() {
        if (!currentUser) return '';
        return String(currentUser.email || currentUser.name || '').toLowerCase();
    }

    function recordKey() {
        return 'autRecord_' + userEmail();
    }

    function emptyRecord() {
        return { pre: null, post: null };
    }

    function loadRecord() {
        if (!currentUser) return emptyRecord();
        try {
            return Object.assign(emptyRecord(), JSON.parse(localStorage.getItem(recordKey()) || '{}'));
        } catch (error) {
            return emptyRecord();
        }
    }

    function saveRecord(record) {
        localStorage.setItem(recordKey(), JSON.stringify(record));
        const index = readIndex().filter(function (entry) {
            return entry.email !== userEmail();
        });
        index.push({
            email: userEmail(),
            name: currentUser.name,
            age: currentUser.age,
            savedAt: new Date().toISOString(),
            pre: record.pre,
            post: record.post
        });
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    }

    function readIndex() {
        try {
            const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function draftKey(phase) {
        return 'autDraft_' + userEmail() + '_' + phase;
    }

    function loadDraft(phase) {
        try {
            return JSON.parse(localStorage.getItem(draftKey(phase)) || '{}');
        } catch (error) {
            return {};
        }
    }

    function trainingComplete() {
        return Array.isArray(activities) && activities.length > 0 && activities.every(function (activity) {
            return activity.completed;
        });
    }

    function applyActivityLocks() {
        if (!currentUser || !Array.isArray(activities)) return;
        const completed = new Set((currentUser.completedActivities || []).map(Number));
        const preDone = !!(loadRecord().pre && loadRecord().pre.result);
        activities.forEach(function (activity, index) {
            activity.completed = completed.has(Number(activity.id));
            if (!preDone) {
                activity.unlocked = false;
                return;
            }
            activity.unlocked = index === 0 ? true : !!activities[index - 1].completed;
        });
    }

    function signed(value) {
        if (value > 0) return '+' + value;
        return String(value);
    }

    function changeClass(value) {
        if (value > 0) return 'up';
        if (value < 0) return 'down';
        return '';
    }

    function scoreTiles(result) {
        return '<div class="aut-total-score">' +
            tile(result.total, 'Total creativity score', '創意總分', 'total') +
            '</div>' +
            '<div class="aut-score-row aut-score-row-two">' +
            tile(result.fluency, 'Fluency', '流暢力') +
            tile(result.flexibility, 'Flexibility', '變通力') +
            '</div>';
    }

    function tile(value, en, zh, extraClass) {
        return '<div class="aut-score-tile ' + (extraClass || '') + '"><strong>' + esc(value) + '</strong>' + langPair(en, zh) + '</div>';
    }

    function renderDashboardCard() {
        const mount = document.getElementById('autDashboardMount');
        if (!mount) return;
        if (!currentUser) {
            mount.innerHTML = '';
            return;
        }
        applyActivityLocks();
        const record = loadRecord();
        const pre = record.pre && record.pre.result;
        const post = record.post && record.post.result;
        let body = '';
        if (!pre) {
            body = langPair(
                '<p class="aut-lead">Before the activities, write new uses for a book and a sticky note. The usual use does not count. Empty boxes are allowed.</p>',
                '<p class="aut-lead">在活動開始前，請為書和便利貼寫下新用途。一般用途不算。空白的格子可以留空。</p>'
            ) + '<div class="aut-actions"><button class="btn btn-primary" id="autStartPre"><i class="fas fa-pencil-alt"></i> ' +
                langPair('Start the creativity check', '開始創意測試') + '</button></div>';
        } else if (!trainingComplete()) {
            body = langPair(
                '<p class="aut-lead">Your first check is saved. The activities are open.</p>',
                '<p class="aut-lead">第一次測試已儲存。活動已經開啟。</p>'
            ) + scoreTiles(pre) +
                '<div class="aut-actions"><button class="btn btn-secondary" id="autViewPre">' + langPair('View saved check', '查看已儲存的測試') + '</button></div>';
        } else if (!post) {
            body = langPair(
                '<p class="aut-lead">The activities are finished. Do the second check with a brick and a newspaper.</p>',
                '<p class="aut-lead">活動已完成。請用磚塊和報紙做第二次測試。</p>'
            ) + scoreTiles(pre) +
                '<div class="aut-actions"><button class="btn btn-primary" id="autStartPost"><i class="fas fa-clipboard-check"></i> ' +
                langPair('Start the after-training check', '開始訓練後測試') + '</button></div>';
        } else {
            const change = scoreApi().improvement(pre, post);
            body = creativityResultCopy(change).html +
                langPair(
                '<p class="aut-lead">Both checks are saved. Improvement is the after-training score minus the first score.</p>',
                '<p class="aut-lead">兩次測試都已儲存。進步分數是訓練後分數減去第一次分數。</p>'
            ) +
                '<div class="aut-score-row">' +
                tile(signed(change.fluency), 'Fluency change', '流暢力變化', changeClass(change.fluency)) +
                tile(signed(change.flexibility), 'Flexibility change', '變通力變化', changeClass(change.flexibility)) +
                tile(signed(change.total), 'Total score change', '總分變化', changeClass(change.total)) +
                '</div>' +
                '<div class="aut-actions"><button class="btn btn-secondary" id="autViewArchive">' + langPair('Open the response archive', '打開回答紀錄') + '</button></div>';
        }
        mount.innerHTML = '<div class="aut-dashboard-card"><span class="aut-kicker">AUT</span>' +
            langPair('<h3>Creativity check</h3>', '<h3>創意測試</h3>') + body + '</div>';
        const preButton = document.getElementById('autStartPre');
        const postButton = document.getElementById('autStartPost');
        const viewPre = document.getElementById('autViewPre');
        const viewArchive = document.getElementById('autViewArchive');
        if (preButton) preButton.addEventListener('click', function () { openAut('pre'); });
        if (postButton) postButton.addEventListener('click', function () { openAut('post'); });
        if (viewPre) viewPre.addEventListener('click', function () { openAut('pre'); });
        if (viewArchive) viewArchive.addEventListener('click', function () { openAut(record.post ? 'post' : 'pre'); });
        applyLang();
    }

    function openAut(phase) {
        if (phase === 'post' && !trainingComplete()) {
            alert(currentLanguage === 'zh' ? '請先完成所有活動。' : 'Please finish all activities first.');
            return;
        }
        if (typeof hideAllSections === 'function') hideAllSections();
        const section = document.getElementById('autSection');
        section.style.display = 'block';
        if (typeof logoutBtn !== 'undefined' && logoutBtn) logoutBtn.style.display = 'flex';
        const saved = loadRecord()[phase];
        if (saved && saved.result) renderArchive(phase);
        else renderInstructions(phase);
        window.scrollTo(0, 0);
    }

    function stopTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remain = seconds % 60;
        return minutes + ':' + (remain < 10 ? '0' : '') + remain;
    }

    function renderInstructions(phase) {
        stopTimer();
        submitLock = false;
        document.getElementById('autStage').innerHTML =
            '<div class="aut-panel"><button class="back-button" id="autBack" type="button"><i class="fas fa-arrow-left"></i></button>' +
            langPair('<h3>Creativity check instructions</h3>', '<h3>創意測試說明</h3>') +
            langPair(
                '<div class="aut-lead">Please list up to six alternative uses for each object. You will have three minutes to complete the two items. The primary use of each object is provided below. You must not list the primary use as an alternative use.</div>',
                '<div class="aut-lead">請為每個物品列出最多六種其他用途。參加者有三分鐘的時間完成兩個物品。每項物品的主要用途已列出，不得將主要用途寫作其他用途。</div>'
            ) +
            langPair(
                '<p class="aut-note">The three minutes start when you press the button. They do not start while you are reading this page.</p>',
                '<p class="aut-note">按下按鈕後才開始三分鐘計時。閱讀本頁時不會計時。</p>'
            ) +
            '<section class="aut-example">' +
            langPair('<h3>Example</h3>', '<h3>例子</h3>') +
            langPair('<p><strong>Object: Water Bottle</strong></p>', '<p><strong>物品：水樽</strong></p>') +
            langPair(
                '<p class="aut-main-use">(Main use: Carry and store water or drinks)</p>',
                '<p class="aut-main-use">（主要用途：儲存和隨身攜帶飲用水或其他飲料）</p>'
            ) +
            '<img class="scenario-photo" src="images/water-bottle.jpg" alt="Water bottle">' +
            langPair(
                '<p>Alternative use can be a snack box.</p>',
                '<p>其他用途可為零食盒。</p>'
            ) +
            '</section>' +
            '<div class="aut-actions"><button class="btn btn-primary" id="autBeginBtn" type="button"><i class="fas fa-hourglass-start"></i> ' +
            langPair('Start the three minutes', '開始三分鐘計時') + '</button></div></div>';
        document.getElementById('autBack').addEventListener('click', function () {
            stopTimer();
            if (typeof showDashboard === 'function') showDashboard();
        });
        document.getElementById('autBeginBtn').addEventListener('click', function () { renderForm(phase); });
        applyLang();
    }

    function timerKey(phase) {
        return 'autTimer_' + userEmail() + '_' + phase;
    }

    function startTimer(phase) {
        stopTimer();
        const timer = document.getElementById('autTimer');
        if (!timer) return;
        const stored = Number(sessionStorage.getItem(timerKey(phase)) || 0);
        const deadline = stored > 0 ? stored : Date.now() + TEST_SECONDS * 1000;
        sessionStorage.setItem(timerKey(phase), String(deadline));
        timer.dataset.deadline = String(deadline);
        function tick() {
            const node = document.getElementById('autTimer');
            if (!node) {
                stopTimer();
                return;
            }
            const end = Number(node.dataset.deadline || deadline);
            const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            const clock = node.querySelector('.aut-timer-clock');
            if (clock) clock.textContent = formatTime(left);
            node.classList.toggle('urgent', left <= 30 && left > 0);
            if (left <= 0) {
                stopTimer();
                submitAut(phase, true);
            }
        }
        tick();
        timerId = setInterval(tick, 250);
    }

    function renderForm(phase) {
        const objects = scoreApi().OBJECTS[phase];
        const draft = loadDraft(phase);
        const intro = phase === 'pre'
            ? langPair(
                '<p class="aut-lead">Think of other ways to use each object. Write one idea in each box. You can leave a box empty.</p>',
                '<p class="aut-lead">想想每個物件的其他用途。每個格子寫一個想法。格子可以留空。</p>'
            )
            : langPair(
                '<p class="aut-lead">This is the check after the activities. Write other ways to use each object. Empty boxes are allowed.</p>',
                '<p class="aut-lead">這是活動後的測試。請寫下每個物件的其他用途。格子可以留空。</p>'
            );
        const blocks = objects.map(function (object) {
            const savedAnswers = draft[object.id] || [];
            const rows = [];
            for (let i = 0; i < BOXES; i++) {
                rows.push(
                    '<div class="aut-answer-row">' +
                    '<label for="aut-' + phase + '-' + object.id + '-' + i + '">' + langPair('Answer ' + (i + 1), '答案 ' + (i + 1)) + '</label>' +
                    '<input id="aut-' + phase + '-' + object.id + '-' + i + '" type="text" maxlength="180" autocomplete="off" value="' + esc(savedAnswers[i] || '') + '">' +
                    '</div>'
                );
            }
            const mainUse = MAIN_USE_LABELS[object.id] || { en: '', zh: '' };
            return '<section class="aut-object"><div class="aut-object-title"><div class="aut-object-badge">' + ICONS[object.id] + '</div><div>' +
                langPair('<h3>Object: ' + esc(object.en) + '</h3>', '<h3>物件：' + esc(object.zh) + '</h3>') +
                langPair('<p class="aut-main-use">(Main use: ' + esc(mainUse.en) + ')</p>', '<p class="aut-main-use">（主要用途：' + esc(mainUse.zh) + '）</p>') +
                langPair('<p class="aut-note">Up to 6 uses. Do not write the main use. Empty boxes are allowed.</p>', '<p class="aut-note">最多 6 個用途。不要寫主要用途。空白的格子可以留空。</p>') +
                '</div></div>' + rows.join('') + '</section>';
        }).join('');
        document.getElementById('autStage').innerHTML =
            '<div class="aut-panel"><button class="back-button" id="autBack" type="button"><i class="fas fa-arrow-left"></i></button>' +
            '<div class="aut-timer" id="autTimer" role="timer">' +
            langPair('<span>Time left</span>', '<span>剩餘時間</span>') +
            '<strong class="aut-timer-clock">3:00</strong></div>' +
            langPair('<h3>' + (phase === 'pre' ? 'Creativity check: before training' : 'Creativity check: after training') + '</h3>',
                '<h3>' + (phase === 'pre' ? '創意測試：訓練前' : '創意測試：訓練後') + '</h3>') +
            intro + blocks +
            '<div class="aut-actions"><button class="btn btn-primary" id="autSubmitBtn" type="button"><i class="fas fa-paper-plane"></i> ' +
            langPair('Submit answers', '提交答案') + '</button></div></div>';
        document.getElementById('autBack').addEventListener('click', function () {
            stopTimer();
            if (typeof showDashboard === 'function') showDashboard();
        });
        document.getElementById('autStage').querySelectorAll('input').forEach(function (input) {
            input.addEventListener('input', function () { saveDraft(phase); });
        });
        document.getElementById('autSubmitBtn').addEventListener('click', function () { submitAut(phase, false); });
        applyLang();
        startTimer(phase);
    }

    function collectAnswers(phase) {
        const answers = {};
        scoreApi().OBJECTS[phase].forEach(function (object) {
            answers[object.id] = [];
            for (let i = 0; i < BOXES; i++) {
                const input = document.getElementById('aut-' + phase + '-' + object.id + '-' + i);
                answers[object.id].push(input ? input.value.trim() : '');
            }
        });
        return answers;
    }

    function saveDraft(phase) {
        localStorage.setItem(draftKey(phase), JSON.stringify(collectAnswers(phase)));
    }

    function hasAnyAnswer(answers) {
        return Object.keys(answers).some(function (key) {
            return answers[key].some(function (answer) { return answer.trim() !== ''; });
        });
    }

    function buildPrompt(phase, answers) {
        const lines = scoreApi().OBJECTS[phase].map(function (object) {
            const rows = (answers[object.id] || []).map(function (answer, index) {
                return (index + 1) + '. ' + (answer || '(empty)');
            }).join('\n');
            return object.en + ' (objectId: ' + object.id + ')\n' + rows;
        }).join('\n\n');
        return [
            'You rate an Alternative Uses Test for children.',
            'Mark valid:false when the response is the ordinary main use, physically impossible, overly vague, or a repeat of an earlier answer.',
            'Main uses: Book = reading. Sticky Note = taking notes. Brick = building. Newspaper = reading the news.',
            'Vague examples: useful thing, for fun, something special.',
            'Impossible example: fly to the moon.',
            'Leave empty answers out.',
            'Mark valid:false and reason:"vague" for meaningless letter strings such as fv, fav, asdf, or qwerty.',
            'Give a specific category. Do not use "Other idea" when a clearer category fits.',
            'Copy objectId exactly as given: book, sticky, brick, or newspaper.',
            'Copy each answer exactly.',
            'For each valid response, give one short English category and one short Chinese category.',
            'Return only JSON with this shape:',
            '{"items":[{"objectId":"book","answer":"door stopper","valid":true,"reason":"valid","category":"Household tool","categoryZh":"家居工具"}]}',
            'reason must be one of: valid, main_use, impossible, vague, duplicate.',
            lines
        ].join('\n');
    }

    function extractJson(text) {
        let raw = String(text || '');
        const thinkEnd = raw.lastIndexOf('</think>');
        if (thinkEnd !== -1) raw = raw.slice(thinkEnd + 8);
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced) raw = fenced[1];
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start === -1 || end <= start) throw new Error('No JSON');
        return JSON.parse(raw.slice(start, end + 1));
    }

    async function askDify(query) {
        const controller = new AbortController();
        const timer = setTimeout(function () { controller.abort(); }, 70000);
        try {
            const userId = userEmail() || 'participant';
            try {
                const localResponse = await fetch(apiUrl('/api/public/aut-rate'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({ query: query, user: userId })
                });
                if (localResponse.ok) {
                    const localData = await localResponse.json();
                    if (localData && localData.answer) return localData.answer;
                }
            } catch (localError) {
                if (localError && localError.name === 'AbortError') throw localError;
            }
            const apiKey = localStorage.getItem(KEY_STORAGE);
            let response;
            if (apiKey && apiKey.indexOf('app-') === 0) {
                response = await fetch(DIFY_API + '/chat-messages', {
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer ' + apiKey,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        inputs: {},
                        query: query,
                        response_mode: 'blocking',
                        user: userId,
                        conversation_id: ''
                    })
                });
            } else {
                const passportResponse = await fetch(DIFY_WEB + '/passport', {
                    headers: { 'X-App-Code': DIFY_APP },
                    signal: controller.signal
                });
                if (!passportResponse.ok) throw new Error('Passport failed');
                const passport = await passportResponse.json();
                response = await fetch(DIFY_WEB + '/chat-messages', {
                    method: 'POST',
                    headers: {
                        'X-App-Passport': passport.access_token,
                        'X-App-Code': DIFY_APP,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        inputs: {},
                        query: query,
                        response_mode: 'blocking',
                        user: userId,
                        conversation_id: ''
                    })
                });
            }
            if (!response.ok) throw new Error('Chat failed');
            const data = await response.json();
            return data.answer || data.data && data.data.answer || '';
        } finally {
            clearTimeout(timer);
        }
    }

    async function scoreAnswers(phase, answers) {
        const result = scoreApi().scorePhase(phase, answers);
        try {
            const reply = await askDify(buildPrompt(phase, answers));
            const parsed = extractJson(reply);
            const items = parsed.items || parsed.responses || [];
            if (Array.isArray(items) && items.length) {
                scoreApi().applyAiJudgements(result, items);
                result.assistantReply = reply;
            }
        } catch (error) {
            result.scoredBy = 'rules';
        }
        return result;
    }

    async function submitAut(phase, automatic) {
        if (submitLock) return;
        const button = document.getElementById('autSubmitBtn');
        const answers = collectAnswers(phase);
        if (!hasAnyAnswer(answers)) {
            if (automatic) {
                stopTimer();
                alert(currentLanguage === 'zh' ? '時間到了。請至少寫下一個想法，然後按提交。' : 'Time is up. Write at least one idea, then press Submit.');
                return;
            }
            alert(currentLanguage === 'zh' ? '請至少寫下一個想法。空白的格子可以留空。' : 'Write at least one idea. Empty boxes are okay.');
            return;
        }
        submitLock = true;
        stopTimer();
        if (button) button.disabled = true;
        document.querySelectorAll('#autStage input').forEach(function (input) { input.disabled = true; });
        document.getElementById('autStage').insertAdjacentHTML('beforeend',
            '<div class="aut-checking" id="autChecking">' +
            langPair('The creativity check is reading your ideas...', '創意測試正在閱讀你的想法...') +
            '</div>');
        applyLang();
        const result = await scoreAnswers(phase, answers);
        const record = loadRecord();
        record[phase] = {
            phase: phase,
            savedAt: new Date().toISOString(),
            name: currentUser.name,
            email: currentUser.email,
            answers: answers,
            result: result
        };
        saveRecord(record);
        localStorage.removeItem(draftKey(phase));
        sessionStorage.removeItem(timerKey(phase));
        syncAut(record[phase]);
        renderArchive(phase);
        if (phase === 'pre') showActivityInvite();
        if (phase === 'post') showScoreResult();
    }

    function creativityResultCopy(change) {
        if (!change) {
            return { kind: '', html: '', buttonEn: 'OK', buttonZh: '好的', tryAgain: false };
        }
        if (change.total > 0) {
            return {
                kind: 'up',
                html: langPair(
                    '<p class="aut-result-note up">Great job! Your creativity score has gone up.</p>',
                    '<p class="aut-result-note up">你做得很好！你的創意分數上升了。</p>'
                ),
                buttonEn: 'OK',
                buttonZh: '好的',
                tryAgain: false
            };
        }
        if (change.total < 0) {
            return {
                kind: 'down',
                html: langPair(
                    '<p class="aut-result-note down">Your creativity score went down this time. That is okay. Try the activities again and see what new ideas you can find.</p>',
                    '<p class="aut-result-note down">這次你的創意分數下降了。沒關係。再做一次下面的活動，看看你能想到什麼新主意。</p>'
                ),
                buttonEn: 'Try again',
                buttonZh: '再試一次',
                tryAgain: true
            };
        }
        return {
            kind: 'same',
            html: langPair(
                '<p class="aut-result-note">Your creativity score stayed the same. Try the activities again and see if you can think of even more ideas.</p>',
                '<p class="aut-result-note">你的創意分數和上次一樣。再做一次下面的活動，看看你能不能想到更多主意。</p>'
            ),
            buttonEn: 'Try again',
            buttonZh: '再試一次',
            tryAgain: true
        };
    }

    function showScoreResult() {
        const record = loadRecord();
        const pre = record.pre && record.pre.result;
        const post = record.post && record.post.result;
        const change = scoreApi().improvement(pre, post);
        if (!change) return;
        const copy = creativityResultCopy(change);
        const old = document.getElementById('autScoreResult');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'autScoreResult';
        wrap.className = 'aut-popup-backdrop';
        wrap.innerHTML =
            '<div class="aut-popup ' + copy.kind + '" role="dialog" aria-modal="true">' +
            copy.html +
            '<button class="btn btn-primary" id="autScoreResultOk" type="button">' +
            langSpan(copy.buttonEn, copy.buttonZh) +
            '</button></div>';
        document.body.appendChild(wrap);
        applyLang();
        document.getElementById('autScoreResultOk').addEventListener('click', function () {
            wrap.remove();
            if (typeof showDashboard === 'function') showDashboard();
            if (copy.tryAgain) {
                const cards = document.getElementById('activityCards');
                if (cards) cards.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    function showActivityInvite() {
        const old = document.getElementById('autActivityInvite');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'autActivityInvite';
        wrap.className = 'aut-popup-backdrop';
        wrap.innerHTML =
            '<div class="aut-popup" role="dialog" aria-modal="true">' +
            langPair(
                '<p>Would you like to try some interesting activities and see your creativity improve? Let\'s complete the activities below.</p>',
                '<p>你想試試一些有趣的活動，看看自己的創造力有沒有進步嗎？讓我們完成下面的活動吧。</p>'
            ) +
            '<button class="btn btn-primary" id="autActivityInviteOk" type="button">' +
            langSpan('Let\'s go', '出發吧') +
            '</button></div>';
        document.body.appendChild(wrap);
        applyLang();
        document.getElementById('autActivityInviteOk').addEventListener('click', function () {
            wrap.remove();
            if (typeof showDashboard === 'function') showDashboard();
            const cards = document.getElementById('activityCards');
            if (cards) cards.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    async function syncAut(phasePayload) {
        try {
            if (typeof upsertCurrentUserToBackend !== 'function' || typeof postJson !== 'function') return;
            const userId = await upsertCurrentUserToBackend();
            if (!userId) return;
            await postJson('/api/public/activity-submission', {
                userId: userId,
                activityId: phasePayload.phase === 'pre' ? 101 : 102,
                responses: phasePayload,
                completedActivities: currentUser.completedActivities || [],
                metadata: { type: 'aut', phase: phasePayload.phase }
            });
        } catch (error) {
            // The browser archive is the saved copy when the server is not running.
        }
    }

    function answerLines(objectResult, language) {
        return objectResult.items.map(function (item, index) {
            const label = language === 'zh' ? '答案 ' : 'Answer ';
            if (!item.answer) return label + (index + 1) + ': —';
            return label + (index + 1) + ': ' + item.answer;
        }).join('\n');
    }

    function summaryText(result, language) {
        if (language === 'zh') {
            return '流暢力 ' + result.fluency + '（計入的新用途）\n變通力 ' + result.flexibility + '（不同類別的數目）\n創意總分 ' + result.total + '（流暢力 + 變通力）';
        }
        return 'Fluency ' + result.fluency + ' (valid new uses)\nFlexibility ' + result.flexibility + ' (different categories)\nTotal creativity score ' + result.total + ' (fluency + flexibility)';
    }

    function objectTable(objectResult) {
        const rows = objectResult.items.map(function (item, index) {
            const status = STATUS[item.status] || STATUS.empty;
            const category = item.status === 'valid'
                ? langSpan(esc(item.categoryEn), esc(item.categoryZh))
                : '—';
            return '<tr><td>' + (index + 1) + '</td><td>' + (item.answer ? esc(item.answer) : '—') + '</td><td><span class="aut-status ' +
                esc(item.status) + '">' + langSpan(status.en, status.zh) + '</span></td><td>' + category + '</td></tr>';
        }).join('');
        return '<h4>' + langPair(esc(objectResult.en), esc(objectResult.zh)) + '</h4>' +
            langPair(
                '<p class="aut-note">Fluency ' + objectResult.fluency + ' · Flexibility ' + objectResult.flexibility + ' · Total ' + objectResult.total + '</p>',
                '<p class="aut-note">流暢力 ' + objectResult.fluency + ' · 變通力 ' + objectResult.flexibility + ' · 總分 ' + objectResult.total + '</p>'
            ) +
            '<table class="aut-table"><thead><tr><th>#</th><th>' + langSpan('Answer', '答案') +
            '</th><th>' + langSpan('Record', '紀錄') + '</th><th>' + langSpan('Category', '類別') +
            '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderArchive(selectedPhase) {
        const record = loadRecord();
        const phases = ['pre', 'post'].filter(function (phase) { return record[phase] && record[phase].result; });
        const selected = selectedPhase === 'improvement' && record.pre && record.post
            ? 'improvement'
            : (phases.indexOf(selectedPhase) === -1 ? phases[phases.length - 1] : selectedPhase);
        const list = phases.map(function (phase) {
            const label = phase === 'pre'
                ? langPair('Before training', '訓練前')
                : langPair('After training', '訓練後');
            return '<button type="button" class="aut-archive-item ' + (phase === selected ? 'active' : '') + '" data-phase="' + phase + '">' + label + '</button>';
        }).join('');
        const improvementButton = record.pre && record.post
            ? '<button type="button" class="aut-archive-item ' + (selected === 'improvement' ? 'active' : '') + '" data-phase="improvement">' +
                langPair('Improvement', '進步') + '</button>'
            : '';
        document.getElementById('autStage').innerHTML =
            '<div class="aut-panel"><button class="back-button" id="autBack" type="button"><i class="fas fa-arrow-left"></i></button>' +
            langPair('<h3>Response archive</h3>', '<h3>回答紀錄</h3>') +
            langPair('<p class="aut-note">Every answer is saved here, including boxes that were left empty.</p>',
                '<p class="aut-note">每個答案都會保存在這裡，包括留空的格子。</p>') +
            '<div class="aut-layout"><div class="aut-archive-list">' + list + improvementButton + '</div><div id="autDetail"></div></div>' +
            '<div class="aut-actions"><button class="btn btn-secondary" id="autDownload" type="button"><i class="fas fa-download"></i> ' +
            langPair('Download archive', '下載紀錄') + '</button></div></div>';
        document.getElementById('autBack').addEventListener('click', function () {
            if (typeof showDashboard === 'function') showDashboard();
        });
        document.getElementById('autDownload').addEventListener('click', downloadArchive);
        document.querySelectorAll('.aut-archive-item').forEach(function (button) {
            button.addEventListener('click', function () { renderArchive(button.getAttribute('data-phase')); });
        });
        renderArchiveDetail(selected === 'improvement' ? 'improvement' : selected);
        applyLang();
    }

    function renderArchiveDetail(selected) {
        const detail = document.getElementById('autDetail');
        const record = loadRecord();
        if (selected === 'improvement') {
            const change = scoreApi().improvement(record.pre.result, record.post.result);
            detail.innerHTML = langPair('<h3>Improvement</h3>', '<h3>進步</h3>') +
                langPair('<p class="aut-formula">Improvement = after-training score − before-training score. Total creativity score = fluency + flexibility.</p>',
                    '<p class="aut-formula">進步 = 訓練後分數 − 訓練前分數。創意總分 = 流暢力 + 變通力。</p>') +
                '<div class="aut-total-score">' +
                tile(record.pre.result.total + ' → ' + record.post.result.total, 'Total creativity score', '創意總分', 'total') +
                '</div>' +
                '<div class="aut-score-row aut-score-row-two">' +
                tile(record.pre.result.fluency + ' → ' + record.post.result.fluency, 'Fluency', '流暢力') +
                tile(record.pre.result.flexibility + ' → ' + record.post.result.flexibility, 'Flexibility', '變通力') +
                '</div>' +
                '<div class="aut-score-row">' +
                tile(signed(change.fluency), 'Fluency change', '流暢力變化', changeClass(change.fluency)) +
                tile(signed(change.flexibility), 'Flexibility change', '變通力變化', changeClass(change.flexibility)) +
                tile(signed(change.total), 'Total score change', '總分變化', changeClass(change.total)) +
                '</div>';
            applyLang();
            return;
        }
        const phaseRecord = record[selected];
        const result = phaseRecord.result;
        const chat = result.objects.map(function (objectResult) {
            return '<div class="aut-bubble assistant">' + langPair('Object: ' + esc(objectResult.en), '物件：' + esc(objectResult.zh)) + '</div>' +
                '<div class="aut-bubble user">' + langPair(esc(answerLines(objectResult, 'en')), esc(answerLines(objectResult, 'zh'))) + '</div>';
        }).join('') + '<div class="aut-bubble assistant">' + langPair(esc(summaryText(result, 'en')), esc(summaryText(result, 'zh'))) + '</div>';
        detail.innerHTML = langPair(
            '<h3>' + (selected === 'pre' ? 'Before training' : 'After training') + '</h3>',
            '<h3>' + (selected === 'pre' ? '訓練前' : '訓練後') + '</h3>'
        ) + scoreTiles(result) +
            '<div class="aut-formula">' + langPair(
                'Total creativity score = fluency + flexibility. Counted uses are the fluency score. Different categories are the flexibility score.',
                '創意總分 = 流暢力 + 變通力。計入的用途是流暢力。不同類別的數目是變通力。'
            ) + langPair(
                result.scoredBy === 'dify' ? '<p class="aut-note">Checked by the creativity chatbot.</p>' : '<p class="aut-note">Checked with the creativity scoring rules.</p>',
                result.scoredBy === 'dify' ? '<p class="aut-note">由創意聊天機械人評分。</p>' : '<p class="aut-note">依照創意評分規則計算。</p>'
            ) + '</div><div class="aut-thread">' + chat + '</div>' +
            result.objects.map(objectTable).join('');
        applyLang();
    }

    function downloadArchive() {
        const blob = new Blob([JSON.stringify(readIndex(), null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'aut-creativity-archive.json';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function renderAdminArchive() {
        const mount = document.getElementById('autAdminArchive');
        if (!mount) return;
        const rows = readIndex();
        if (!rows.length) {
            mount.innerHTML = langPair('<p class="aut-note">No creativity checks are saved in this browser yet.</p>',
                '<p class="aut-note">這個瀏覽器還沒有已儲存的創意測試。</p>');
            applyLang();
            return;
        }
        mount.innerHTML = rows.map(function (entry) {
            const pre = entry.pre && entry.pre.result;
            const post = entry.post && entry.post.result;
            const change = pre && post ? scoreApi().improvement(pre, post) : null;
            const scoreLine = function (labelEn, labelZh, result) {
                if (!result) return langPair(labelEn + ': not done', labelZh + '：未完成');
                return langPair(
                    labelEn + ': fluency ' + result.fluency + ', flexibility ' + result.flexibility + ', total ' + result.total,
                    labelZh + '：流暢力 ' + result.fluency + '，變通力 ' + result.flexibility + '，總分 ' + result.total
                );
            };
            return '<article class="aut-admin-record"><h4>' + esc(entry.name || entry.email) + '</h4><p class="aut-note">' + esc(entry.email || '') + '</p>' +
                scoreLine('Before training', '訓練前', pre) + scoreLine('After training', '訓練後', post) +
                (change ? langPair(
                    '<p>Change: fluency ' + signed(change.fluency) + ', flexibility ' + signed(change.flexibility) + ', total ' + signed(change.total) + '</p>',
                    '<p>變化：流暢力 ' + signed(change.fluency) + '，變通力 ' + signed(change.flexibility) + '，總分 ' + signed(change.total) + '</p>'
                ) : '') +
                '</article>';
        }).join('');
        applyLang();
    }

    function ensureAdminPanel() {
        if (document.getElementById('autAdminPanel')) return;
        const admin = document.getElementById('adminDashboardSection');
        if (!admin) return;
        const panel = document.createElement('div');
        panel.id = 'autAdminPanel';
        panel.className = 'aut-admin-panel';
        panel.innerHTML = langPair('<h3>Creativity assessment archive</h3>', '<h3>創意評估紀錄</h3>') +
            langPair('<p class="aut-note">Saved on this browser. Add a Dify API key only if the shared chatbot needs the service API at https://api.dify.ai/v1.</p>',
                '<p class="aut-note">紀錄保存在這個瀏覽器。只有在共用聊天機械人需要 https://api.dify.ai/v1 時，才加入 Dify API 金鑰。</p>') +
            '<div class="aut-key-row"><input id="difyApiKey" type="password" autocomplete="off" placeholder="app-...">' +
            '<button class="btn btn-primary" id="saveDifyKey" type="button">' + langPair('Save key', '儲存金鑰') + '</button>' +
            '<button class="btn btn-secondary" id="downloadAutArchive" type="button">' + langPair('Download archive', '下載紀錄') + '</button></div>' +
            '<div id="autAdminArchive"></div>';
        const header = admin.querySelector('.admin-header');
        if (header && header.nextSibling) admin.insertBefore(panel, header.nextSibling);
        else admin.appendChild(panel);
        const keyInput = document.getElementById('difyApiKey');
        keyInput.value = localStorage.getItem(KEY_STORAGE) || '';
        document.getElementById('saveDifyKey').addEventListener('click', function () {
            const value = keyInput.value.trim();
            if (value) localStorage.setItem(KEY_STORAGE, value);
            else localStorage.removeItem(KEY_STORAGE);
            keyInput.value = value;
        });
        document.getElementById('downloadAutArchive').addEventListener('click', downloadArchive);
    }

    function watchAdmin() {
        const admin = document.getElementById('adminDashboardSection');
        if (!admin) return;
        const observer = new MutationObserver(function () {
            if (admin.style.display === 'block') {
                ensureAdminPanel();
                renderAdminArchive();
            }
        });
        observer.observe(admin, { attributes: true, attributeFilter: ['style'] });
    }

    function installHooks() {
        const originalGenerate = generateActivityCards;
        generateActivityCards = function () {
            applyActivityLocks();
            originalGenerate();
        };

        const originalShow = showDashboard;
        showDashboard = function () {
            applyActivityLocks();
            originalShow();
            renderDashboardCard();
        };

        const originalHide = hideAllSections;
        hideAllSections = function () {
            stopTimer();
            originalHide();
            const section = document.getElementById('autSection');
            if (section) section.style.display = 'none';
        };

        const originalLanguage = updateLanguage;
        updateLanguage = function (lang) {
            originalLanguage(lang);
            renderDashboardCard();
        };

        const originalSubmit = submitActivity;
        submitActivity = function () {
            originalSubmit();
            if (currentActivity === 5 && trainingComplete() && submitActivityBtn && !(loadRecord().post && loadRecord().post.result)) {
                const fresh = submitActivityBtn.cloneNode(true);
                fresh.innerHTML = '<i class="fas fa-clipboard-check"></i> ' +
                    (currentLanguage === 'zh' ? '開始訓練後測試' : 'Start the after-training check');
                fresh.onclick = function () { openAut('post'); };
                submitActivityBtn.replaceWith(fresh);
                submitActivityBtn = fresh;
            }
        };
    }

    installHooks();
    watchAdmin();
    document.addEventListener('DOMContentLoaded', function () {
        const mount = document.getElementById('autDashboardMount');
        if (mount && currentUser && dashboardSection && dashboardSection.style.display === 'block') {
            renderDashboardCard();
        }
    });
})();
