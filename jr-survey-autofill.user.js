// ==UserScript==
// @name         jr-survey-autofill
// @version      0.1
// @description  JR 推し旅问卷自动填写
// @author       dio
// @match        https://oshi-tabi.voistock.com/*
// @match        https://dev-oshi-tabi.voistock.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 车站列表（按从东到西的顺序）
    const STATIONS = [
        '東京', '品川', '新横浜', '小田原', '熱海', '三島', '新富士',
        '静岡', '掛川', '浜松', '豊橋', '三河安城', '名古屋',
        '岐阜羽島', '米原', '京都', '新大阪以西'
    ];

    // 乘车人数选项
    const PASSENGER_COUNTS = ['１', '２', '３', '４', '５', '６以上'];

    // 是否因为这个企划而乘车的选项
    const MOTIVATED_OPTIONS = [
        'はい',
        'はい（移動手段を新幹線に変えた）',
        'いいえ'
    ];


    // 过去是否参加过的选项
    const PARTICIPATED_BEFORE_OPTIONS = ['はい', 'いいえ'];

    // 如何知道这个企划的选项
    const HOW_DID_YOU_KNOW_OPTIONS = [
        'JR東海のプレスリリース',
        '推し旅公式Xまたは公式サイト',
        'バンドリ！公式X',
        'バンドリ！LIVE TV',
        'ライブ会場のブースまたはチラシ',
        '車内テロップ',
        '車内ポスター',
        '駅告知ポスター等',
        'EXサービス会員メルマガ',
        'その他'
    ];


    // 随机生成符合逻辑的答案
    function generateRandomAnswers() {
        // 随机选择乘车站（可以选任意车站，但倾向于选择前面的车站）
        const boardingIndex = Math.floor(Math.random() * Math.min(STATIONS.length - 3, 10));
        const boardingStation = STATIONS[boardingIndex];

        // 下车站应该在乘车站之后（向东方向），但也可以随机选择
        // 70%的概率选择在乘车站之后的车站，30%的概率随机选择
        let alightingStation;
        if (Math.random() < 0.7 && boardingIndex < STATIONS.length - 1) {
            // 选择在乘车站之后的车站
            const minAlightingIndex = boardingIndex + 1;
            const maxAlightingIndex = Math.min(boardingIndex + 5, STATIONS.length - 1);
            const alightingIndex = Math.floor(Math.random() * (maxAlightingIndex - minAlightingIndex + 1)) + minAlightingIndex;
            alightingStation = STATIONS[alightingIndex];
        } else {
            // 随机选择任意车站
            const alightingIndex = Math.floor(Math.random() * STATIONS.length);
            alightingStation = STATIONS[alightingIndex];
        }

        // 随机选择乘车人数（倾向于1-3人，更符合实际情况）
        const passengerCountIndex = Math.random() < 0.7
            ? Math.floor(Math.random() * 3)  // 70%概率选择1-3人
            : Math.floor(Math.random() * PASSENGER_COUNTS.length);  // 30%概率选择任意人数
        const passengerCount = PASSENGER_COUNTS[passengerCountIndex];
        const passengerCountNum = passengerCountIndex + 1; // 转换为数字（1-6）

        // 使用车内限定内容的人数应该小于等于乘车人数
        // 80%的概率是全部或大部分人都使用，20%的概率是部分人使用
        let contentUsersNum;
        if (Math.random() < 0.8) {
            // 大部分或全部使用
            contentUsersNum = Math.random() < 0.5
                ? passengerCountNum  // 全部使用
                : Math.max(1, passengerCountNum - 1);  // 大部分使用
        } else {
            // 部分人使用
            contentUsersNum = Math.max(1, Math.floor(Math.random() * (passengerCountNum - 1)) + 1);
        }
        const contentUsers = contentUsersNum >= 6 ? '６以上' : PASSENGER_COUNTS[contentUsersNum - 1];

        // 随机选择是否因为这个企划而乘车（倾向于"はい"）
        let motivatedByCampaign;
        if (Math.random() < 0.6) {
            // 60%概率选择"はい"
            motivatedByCampaign = MOTIVATED_OPTIONS[0];
        } else if (Math.random() < 0.5) {
            // 20%概率选择"はい（移動手段を新幹線に変えた）"
            motivatedByCampaign = MOTIVATED_OPTIONS[1];
        } else {
            // 20%概率选择"いいえ"
            motivatedByCampaign = MOTIVATED_OPTIONS[2];
        }

        // 随机选择如何知道这个企划（倾向于社交媒体和官方渠道）
        const howDidYouKnow = HOW_DID_YOU_KNOW_OPTIONS[
            Math.floor(Math.random() * HOW_DID_YOU_KNOW_OPTIONS.length)
        ];

        // 随机选择过去是否参加过（倾向于"いいえ"）
        const participatedBefore = Math.random() < 0.7
            ? PARTICIPATED_BEFORE_OPTIONS[1]  // 'いいえ'
            : PARTICIPATED_BEFORE_OPTIONS[0]; // 'はい'

        // 自由填写（30%概率填写，70%概率留空）
        const freeText = Math.random() < 0.3
            ? generateRandomFreeText()
            : '';

        return {
            boardingStation,
            alightingStation,
            passengerCount,
            contentUsers,
            motivatedByCampaign,
            howDidYouKnow,
            participatedBefore,
            freeText
        };
    }

    // 生成随机自由填写文本
    function generateRandomFreeText() {
        const templates = [
            'また参加したいです！',
            '楽しかったです。',
            '次回も楽しみにしています。',
            '素晴らしい企画でした。',
            'ありがとうございました。',
            'また機会があれば参加したいです。',
            'とても良い体験でした。',
            ''
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    // 等待问卷弹窗出现并自动填写
    function autoFillSurvey() {
        // 查找所有下拉选择框
        const dropdowns = document.querySelectorAll('.dropDownSelector');

        if (dropdowns.length === 0) {
            // 如果还没有找到，等待一下再试
            return false;
        }

        console.log('>>> Found', dropdowns.length, 'dropdown questions');

        // 生成随机答案
        const answers = generateRandomAnswers();
        console.log('>>> Generated random answers:', answers);

        // 填写第一个问题：乘车站
        if (dropdowns[0]) {
            dropdowns[0].value = answers.boardingStation;
            dropdowns[0].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled boarding station:', answers.boardingStation);
        }

        // 填写第二个问题：下车站
        if (dropdowns[1]) {
            dropdowns[1].value = answers.alightingStation;
            dropdowns[1].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled alighting station:', answers.alightingStation);
        }

        // 填写第三个问题：乘车人数
        if (dropdowns[2]) {
            dropdowns[2].value = answers.passengerCount;
            dropdowns[2].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled passenger count:', answers.passengerCount);
        }

        // 填写第四个问题：使用车内限定内容的人数
        if (dropdowns[3]) {
            dropdowns[3].value = answers.contentUsers;
            dropdowns[3].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled content users:', answers.contentUsers);
        }

        // 填写第五个问题：是否因为这个企划而乘车
        if (dropdowns[4]) {
            dropdowns[4].value = answers.motivatedByCampaign;
            dropdowns[4].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled motivated by campaign:', answers.motivatedByCampaign);
        }

        // 填写第六个问题：如何知道这个企划
        if (dropdowns[5]) {
            dropdowns[5].value = answers.howDidYouKnow;
            dropdowns[5].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled how did you know:', answers.howDidYouKnow);
        }

        // 填写第七个问题：过去是否参加过
        if (dropdowns[6]) {
            dropdowns[6].value = answers.participatedBefore;
            dropdowns[6].dispatchEvent(new Event('change', { bubbles: true }));
            console.log('>>> Filled participated before:', answers.participatedBefore);
        }

        // 填写自由填写文本框（可选）
        const textarea = document.querySelector('#question-68e29h0b11e9a');
        if (textarea && answers.freeText) {
            textarea.value = answers.freeText;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            console.log('>>> Filled free text:', answers.freeText);
        }

        // 检查提交按钮并启用
        const submitButton = document.querySelector('#survey-submit');
        if (submitButton) {
            // 等待一小段时间确保所有值都已设置
            setTimeout(() => {
                // 检查按钮是否仍然被禁用
                if (submitButton.disabled) {
                    // 尝试移除disabled属性
                    submitButton.removeAttribute('disabled');
                    submitButton.disabled = false;
                    console.log('>>> Submit button enabled');
                } else {
                    console.log('>>> Submit button already enabled');
                }
            }, 100);
        }

        return true;
    }

    // 使用MutationObserver监听DOM变化，当问卷弹窗出现时自动填写
    function observeSurveyModal() {
        const observer = new MutationObserver(function(mutations) {
            // 检查是否有问卷表单出现
            const surveyForm = document.querySelector('#survey-form');
            if (surveyForm && surveyForm.querySelectorAll('.dropDownSelector').length > 0) {
                // 如果找到了问卷表单，尝试自动填写
                if (autoFillSurvey()) {
                    console.log('>>> Survey auto-filled successfully');
                    // 可以在这里选择是否自动提交（取消注释下面的代码）
                    // const submitButton = document.querySelector('#survey-submit');
                    // if (submitButton && !submitButton.disabled) {
                    //     setTimeout(() => {
                    //         submitButton.click();
                    //         console.log('>>> Survey submitted automatically');
                    //     }, 500);
                    // }
                }
            }
        });

        // 开始观察整个文档的变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('>>> Survey auto-fill observer started');
    }

    // 页面加载完成后开始观察
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeSurveyModal);
    } else {
        observeSurveyModal();
    }

    // 也尝试立即检查一次（如果问卷已经存在）
    setTimeout(() => {
        const surveyForm = document.querySelector('#survey-form');
        if (surveyForm) {
            autoFillSurvey();
        }
    }, 1000);

    console.log('>>> Survey auto-fill script loaded');
})();

