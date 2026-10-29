/*
 * Alternative Uses Test scoring.
 * Fluency = number of valid uses.
 * Flexibility = number of different categories among valid uses.
 * Total creativity score = fluency + flexibility.
 * Empty answers are kept and are not scored.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.AutScore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const OBJECTS = {
        pre: [
            { id: 'book', en: 'Book', zh: '書' },
            { id: 'sticky', en: 'Sticky Note', zh: '便利貼' }
        ],
        post: [
            { id: 'brick', en: 'Brick', zh: '磚塊' },
            { id: 'newspaper', en: 'Newspaper', zh: '報紙' }
        ]
    };

    const MAIN_USES = {
        book: [
            'read', 'reading', 'reads', 'to read', 'for reading', 'used for reading',
            'read a book', 'reading a book', 'read books', 'reading books', 'read the book',
            'reading the book', 'study', 'studying', 'learn', 'learning', 'look at the book',
            '閱讀', '看書', '讀書', '唸書', '閱讀書籍', '用來閱讀', '用來看書', '用來讀書', '看故事', '閱讀圖書'
        ],
        sticky: [
            'take notes', 'taking notes', 'take note', 'taking note', 'write notes',
            'write a note', 'writing notes', 'note taking', 'notes', 'jot down notes',
            'write reminders', 'write a reminder', 'reminders',
            '寫筆記', '做筆記', '記事', '寫便條', '貼便條', '用來寫筆記', '用來記事', '記錄事情', '寫便條紙'
        ],
        brick: [
            'build', 'building', 'construction', 'construct', 'build a wall', 'build a house',
            'build walls', 'build houses', 'building a wall', 'building a house',
            'construct a wall', 'construct a house', 'masonry', 'lay bricks',
            '砌牆', '建房子', '蓋房子', '建築', '砌磚', '用來建屋', '用來砌牆', '用來建築'
        ],
        newspaper: [
            'read', 'reading', 'read the news', 'reading the news', 'read news', 'reading news',
            'read the newspaper', 'reading the newspaper', 'read newspaper', 'reading a newspaper',
            '看新聞', '讀報', '看報', '看報紙', '閱讀報紙', '閱讀新聞', '用來閱讀', '用來看看新聞'
        ]
    };

    const VAGUE = new Set([
        'useful', 'useful thing', 'useful things', 'a useful thing', 'for fun', 'fun',
        'something special', 'something', 'stuff', 'thing', 'things', 'a thing', 'good',
        'nice', 'cool', 'awesome', 'special', 'interesting', 'whatever', 'anything',
        'i dont know', 'i do not know', 'idk', 'dont know', 'no idea', 'yes', 'no', 'ok', 'okay',
        'use it', 'using it', 'useful item', 'good thing', 'nice thing', 'fun thing',
        '有用', '有用的東西', '有用東西', '好玩', '為了好玩', '用來玩', '特別', '特別的東西',
        '有趣', '好東西', '東西', '不知道', '沒有', '任意', '隨便', '好玩的東西', '有趣的東西'
    ]);

    const IMPOSSIBLE = [
        'teleport', 'time travel', 'time machine', 'fly to the moon', 'fly to mars',
        'fly to space', 'go to the moon', 'go to space', 'fly people to', 'magic portal',
        'become invisible', 'turn into a person', 'come alive', 'resurrect',
        '瞬移', '穿越時空', '時光機', '飛到月球', '飛去月球', '飛到太空', '魔法傳送', '復活', '變成活人'
    ];

    const CATEGORIES = [
        { id: 'support', en: 'Household tool', zh: '家居工具', keys: ['doorstop', 'door stopper', 'door stop', 'wedge the door', 'hold the door', 'stop the door', 'prop the door', '門擋', '頂門', '門塞', '擋住門', '頂住門'] },
        { id: 'fitness', en: 'Fitness', zh: '健身', keys: ['paperweight', 'paper weight', 'dumbbell', 'exercise', 'workout', 'fitness', 'weight lifting', 'weight for exercise', '鎮紙', '紙鎮', '啞鈴', '健身', '鍛鍊'] },
        { id: 'workspace', en: 'Workspace tool', zh: '工作工具', keys: ['laptop stand', 'computer stand', 'monitor stand', 'phone stand', 'book stand', 'raise the', 'riser', 'shim', 'straight edge', 'ruler', '支架', '墊高', '電腦架', '架高', '直尺'] },
        { id: 'gardening', en: 'Gardening', zh: '園藝', keys: ['plant press', 'press flower', 'press flowers', 'flower press', 'garden', 'planter', 'flower pot', 'flowerpot', 'seed', 'soil', 'garden border', 'garden edge', '壓花', '壓植物', '花園', '花盆', '種植', '種子', '花槽', '園藝'] },
        { id: 'decoration', en: 'Decoration', zh: '裝飾', keys: ['decoration', 'decorate', 'ornament', 'display', 'centerpiece', '裝飾', '擺設', '佈置'] },
        { id: 'art', en: 'Art and craft', zh: '手工藝', keys: ['collage', 'craft', 'origami', 'draw on', 'drawing', 'paint', 'painting', 'mosaic', 'confetti', 'papier mache', 'paper mache', 'papier-mache', 'scrapbook', '手工', '摺紙', '拼貼', '畫畫', '彩紙', '紙漿', '剪紙'] },
        { id: 'container', en: 'Container', zh: '容器', keys: ['container', 'storage', 'pencil case', 'hold pencils', 'box for', '收納', '盒子', '容器', '筆盒'] },
        { id: 'wrapping', en: 'Wrapping', zh: '包裝', keys: ['gift wrap', 'wrapping', 'wrap a', 'wrap the', 'package', 'packing', '包裝', '包禮物', '包住'] },
        { id: 'cleaning', en: 'Cleaning', zh: '清潔', keys: ['wipe', 'clean windows', 'cleaning', 'dust', 'window cleaner', '擦窗', '清潔', '抹布', '擦拭', '擦桌子'] },
        { id: 'fan', en: 'Cooling', zh: '扇涼', keys: ['fan', '扇子', '扇風', '扇涼'] },
        { id: 'bookmark', en: 'Bookmark', zh: '書籤', keys: ['bookmark', 'mark a page', 'mark the page', '書籤', '夾頁'] },
        { id: 'play', en: 'Play', zh: '遊戲', keys: ['toy', 'game', 'puppet', 'paper hat', 'hat', 'boat', 'paper plane', 'paper airplane', 'aeroplane', 'airplane', 'fort', 'sword', 'crown', 'mask', 'kite', 'pretend', 'dress up', 'castle', 'shield', '紙飛機', '紙船', '帽子', '玩具', '遊戲', '木偶', '堡壘', '面具', '風箏', '皇冠'] },
        { id: 'music', en: 'Music', zh: '音樂', keys: ['drum', 'instrument', 'shaker', '鼓', '樂器', '沙鈴'] },
        { id: 'signal', en: 'Message', zh: '傳遞訊息', keys: ['flag', 'signal', 'message', 'pass a note', 'secret code', '旗幟', '信號', '傳話', '傳訊息', '密碼'] },
        { id: 'animal', en: 'Animal care', zh: '動物照顧', keys: ['pet bed', 'hamster', 'bird cage liner', 'for my pet', 'for a pet', '寵物', '倉鼠', '墊寵物'] },
        { id: 'coaster', en: 'Table helper', zh: '桌面輔助', keys: ['coaster', 'level the table', 'balance a table', '杯墊', '墊平', '墊桌子'] },
        { id: 'shade', en: 'Shade', zh: '遮陽', keys: ['shade', 'block the sun', 'sunshade', '遮陽', '擋太陽', '遮太陽'] },
        { id: 'step', en: 'Step', zh: '踏腳', keys: ['step stool', 'step', 'stool', 'doorstep', '踏腳', '凳子', '墊腳'] },
        { id: 'warmth', en: 'Warmth', zh: '保暖', keys: ['keep warm', 'insulation', 'insulate', 'line a coat', '保暖', '隔熱'] },
        { id: 'fire', en: 'Fire starter', zh: '生火', keys: ['kindling', 'start a fire', 'fire starter', 'light a fire', '生火', '引火'] },
        { id: 'label', en: 'Label', zh: '標籤', keys: ['label', 'name tag', 'sticker for', '標籤', '姓名貼', '標記罐子'] },
        { id: 'splint', en: 'Support', zh: '支撐', keys: ['splint', 'brace', '夾板', '固定'] }
    ].map(function (category) {
        return Object.assign({}, category, {
            keys: category.keys.slice().sort(function (a, b) { return b.length - a.length; })
        });
    });

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[.,!?;:'"“”‘’()[\]{}]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function duplicateKey(value) {
        return normalize(value)
            .replace(/\b(a|an|the|to|for|as|my|some)\b/g, ' ')
            .replace(/[\s\-]+/g, '');
    }

    function includesKey(text, key) {
        const needle = normalize(key);
        if (!needle) return false;
        if (/[\u4e00-\u9fff]/.test(needle)) return text.includes(needle);
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
        return new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)').test(text);
    }

    const SHORT_REAL_WORDS = {
        fan: true, hat: true, cup: true, box: true, bag: true, toy: true, mat: true,
        lid: true, pen: true, art: true, rug: true, map: true, pin: true, pot: true,
        pan: true, mug: true, bow: true, net: true, rod: true, wax: true, drum: true,
        flag: true, boat: true, kite: true, mask: true, tent: true, sign: true, card: true,
        tray: true, jar: true, bin: true, mop: true, rag: true, pad: true, stool: true
    };

    const GIBBERISH = {
        fav: true, asdf: true, asdfg: true, asdfgh: true, qwer: true, qwert: true,
        qwerty: true, zxcv: true, hjkl: true, blah: true, blahblah: true, abc: true,
        abcd: true, test: true, testing: true, lol: true, haha: true, hahaha: true,
        xxx: true, zzz: true, na: true, idk: true, hmm: true, hmmm: true, okk: true
    };

    function isMeaningless(text) {
        if (!text || VAGUE.has(text) || GIBBERISH[text]) return true;
        const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
        const latin = text.replace(/[^a-z]/g, '');
        if (cjk && cjk.length < 2 && !latin) return true;
        if (!latin && !cjk) return true;
        if (!latin) return false;
        if (/(.)\1{2,}/.test(latin)) return true;
        if (!/[aeiouy]/.test(latin)) return true;
        const words = text.split(' ').filter(Boolean);
        if (words.length === 1 && latin.length < 4 && !SHORT_REAL_WORDS[latin]) return true;
        return false;
    }

    function isVague(text) {
        return isMeaningless(text);
    }

    function isImpossible(text) {
        return IMPOSSIBLE.some(function (phrase) {
            return text.includes(normalize(phrase));
        });
    }

    function isMainUse(objectId, text) {
        const phrases = MAIN_USES[objectId] || [];
        if (phrases.indexOf(text) !== -1) return true;
        const stripped = text.replace(/^(used for|use it for|use for|using it for|using|to|for|用來|拿來)\s+/, '').trim();
        return phrases.indexOf(stripped) !== -1;
    }

    function categorize(text) {
        let best = null;
        let bestLength = 0;
        CATEGORIES.forEach(function (category) {
            category.keys.forEach(function (key) {
                if (key.length > bestLength && includesKey(text, key)) {
                    best = category;
                    bestLength = key.length;
                }
            });
        });
        if (best) {
            return { id: best.id, en: best.en, zh: best.zh };
        }
        return { id: 'other', en: 'Other idea', zh: '其他想法' };
    }

    function scoreObject(objectId, answers) {
        const seen = new Set();
        const items = (answers || []).slice(0, 6).map(function (answer) {
            const original = String(answer || '').trim();
            const text = normalize(original);
            if (!original) {
                return { answer: '', status: 'empty', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            const key = duplicateKey(original);
            if (seen.has(key)) {
                return { answer: original, status: 'duplicate', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            seen.add(key);
            if (isMainUse(objectId, text)) {
                return { answer: original, status: 'main_use', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            if (isImpossible(text)) {
                return { answer: original, status: 'impossible', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            if (VAGUE.has(text)) {
                return { answer: original, status: 'vague', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            if (isMeaningless(text)) {
                return { answer: original, status: 'nonsense', categoryId: '', categoryEn: '', categoryZh: '' };
            }
            const category = categorize(text);
            return {
                answer: original,
                status: 'valid',
                categoryId: category.id,
                categoryEn: category.en,
                categoryZh: category.zh
            };
        });

        while (items.length < 6) {
            items.push({ answer: '', status: 'empty', categoryId: '', categoryEn: '', categoryZh: '' });
        }

        const valid = items.filter(function (item) { return item.status === 'valid'; });
        const categories = new Set(valid.map(function (item) { return item.categoryId; }));
        const fluency = valid.length;
        const flexibility = categories.size;
        return {
            items: items,
            fluency: fluency,
            flexibility: flexibility,
            total: fluency + flexibility
        };
    }

    function recompute(objectResults) {
        const fluency = objectResults.reduce(function (sum, objectResult) { return sum + objectResult.fluency; }, 0);
        const flexibility = objectResults.reduce(function (sum, objectResult) { return sum + objectResult.flexibility; }, 0);
        return { fluency: fluency, flexibility: flexibility, total: fluency + flexibility };
    }

    function scorePhase(phase, answersByObject) {
        const definitions = OBJECTS[phase] || [];
        const objects = definitions.map(function (definition) {
            const answers = (answersByObject && answersByObject[definition.id]) || [];
            const scored = scoreObject(definition.id, answers);
            return {
                id: definition.id,
                en: definition.en,
                zh: definition.zh,
                items: scored.items,
                fluency: scored.fluency,
                flexibility: scored.flexibility,
                total: scored.total
            };
        });
        const totals = recompute(objects);
        return {
            phase: phase,
            objects: objects,
            fluency: totals.fluency,
            flexibility: totals.flexibility,
            total: totals.total,
            scoredBy: 'rules'
        };
    }

    function canonicalObjectId(value) {
        const text = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
        if (text === 'book') return 'book';
        if (text === 'sticky' || text === 'stickynote') return 'sticky';
        if (text === 'brick') return 'brick';
        if (text === 'newspaper') return 'newspaper';
        return String(value || '').toLowerCase();
    }

    function applyAiJudgements(scored, judgements) {
        if (!scored || !Array.isArray(judgements)) return scored;
        const byKey = {};
        judgements.forEach(function (judgement) {
            if (!judgement) return;
            const objectId = canonicalObjectId(judgement.objectId || judgement.object || '');
            const answer = normalize(judgement.answer || '');
            if (!objectId || !answer) return;
            byKey[objectId + '|' + answer] = judgement;
        });

        scored.objects.forEach(function (objectResult) {
            objectResult.items.forEach(function (item) {
                if (!item.answer || item.status === 'empty' || item.status === 'duplicate') return;
                if (item.status === 'main_use' || item.status === 'impossible') return;
                if (item.status === 'nonsense' || isMeaningless(normalize(item.answer))) {
                    item.status = 'nonsense';
                    item.categoryId = '';
                    item.categoryEn = '';
                    item.categoryZh = '';
                    return;
                }
                const judgement = byKey[canonicalObjectId(objectResult.id) + '|' + normalize(item.answer)];
                if (!judgement) return;
                const reason = String(judgement.reason || judgement.status || '').toLowerCase();
                const valid = judgement.valid === true || reason === 'valid';
                if (!valid) {
                    const status = ['main_use', 'impossible', 'vague', 'nonsense', 'duplicate'].indexOf(reason) !== -1 ? reason : 'vague';
                    item.status = status;
                    item.categoryId = '';
                    item.categoryEn = '';
                    item.categoryZh = '';
                    return;
                }
                const categoryEn = String(judgement.category || judgement.categoryEn || '').trim();
                const categoryZh = String(judgement.categoryZh || '').trim();
                if (!categoryEn || /^(other|other idea|null|n\/a|none|其他|其他想法|其他用途)$/i.test(categoryEn)) {
                    return;
                }
                item.status = 'valid';
                if (/^(other|other idea|其他|其他想法|其他用途)$/i.test(categoryEn)) {
                    item.categoryId = 'other';
                    item.categoryEn = 'Other idea';
                    item.categoryZh = '其他想法';
                } else {
                    item.categoryId = 'ai:' + normalize(categoryEn);
                    item.categoryEn = categoryEn;
                    item.categoryZh = categoryZh || categoryEn;
                }
            });

            const valid = objectResult.items.filter(function (item) { return item.status === 'valid'; });
            const categories = new Set(valid.map(function (item) { return item.categoryId; }));
            objectResult.fluency = valid.length;
            objectResult.flexibility = categories.size;
            objectResult.total = objectResult.fluency + objectResult.flexibility;
        });

        const totals = recompute(scored.objects);
        scored.fluency = totals.fluency;
        scored.flexibility = totals.flexibility;
        scored.total = totals.total;
        scored.scoredBy = 'dify';
        return scored;
    }

    function improvement(pre, post) {
        if (!pre || !post) return null;
        return {
            fluency: post.fluency - pre.fluency,
            flexibility: post.flexibility - pre.flexibility,
            total: post.total - pre.total
        };
    }

    return {
        OBJECTS: OBJECTS,
        normalize: normalize,
        scoreObject: scoreObject,
        scorePhase: scorePhase,
        applyAiJudgements: applyAiJudgements,
        improvement: improvement
    };
});

if (typeof module !== 'undefined' && require.main === module) {
    const score = module.exports;
    const book = score.scoreObject('book', [
        'Reading',
        'Door stopper',
        'Laptop stand',
        'Weight for exercise',
        'Decoration',
        'Plant press'
    ]);
    const excluded = score.scoreObject('book', [
        'Useful thing',
        'For fun',
        'Something special',
        'Fly to the moon',
        '',
        ''
    ]);
    const sticky = score.scoreObject('sticky', ['Taking notes', 'Bookmark', 'Confetti', 'Tiny fan', '', '']);
    const phase = score.scorePhase('pre', {
        book: ['Reading', 'Door stopper', 'Laptop stand', 'Weight for exercise', 'Decoration', 'Plant press'],
        sticky: ['Taking notes', 'Bookmark', '', '', '', '']
    });
    const checks = [
        ['book fluency excludes reading', book.fluency === 5],
        ['book flexibility is 5 categories', book.flexibility === 5],
        ['book total is fluency + flexibility', book.total === 10],
        ['vague and impossible are excluded', excluded.fluency === 0],
        ['empty stays empty', excluded.items[4].status === 'empty'],
        ['sticky main use excluded', sticky.items[0].status === 'main_use' && sticky.fluency === 3],
        ['phase sums both objects', phase.fluency === 6 && phase.flexibility === 6]
    ];
    let failed = 0;
    checks.forEach(function (check) {
        if (!check[1]) {
            failed += 1;
            console.error('FAIL', check[0]);
        }
    });
    if (failed) {
        console.error(JSON.stringify({ book: book, excluded: excluded, sticky: sticky, phase: phase }, null, 2));
        process.exit(1);
    }
    console.log('AUT scoring checks passed');
}
