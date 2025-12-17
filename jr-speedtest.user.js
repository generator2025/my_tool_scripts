// ==UserScript==
// @name         jr-speedtest
// @version      0.1
// @description  JR 推し旅活动测速
// @author       dio
// @match        https://oshi-tabi.voistock.com/*
// @match        https://dev-oshi-tabi.voistock.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 速度范围：150-360 km/h，转换为 m/s
    // 150 km/h = 41.67 m/s, 360 km/h = 100 m/s
    // 使用 250 km/h = 69.44 m/s 作为模拟速度
    const SPEED_KMH = 250;
    const SPEED_MS = SPEED_KMH * 1000 / 3600; // 约 69.44 m/s

    // 区域定义（从 speedData.object.area 中提取）
    // 格式: [maxLat, maxLon, minLat, minLon]
    const AREAS = [
        [35.683863334565, 139.77174806304, 35.587427290289, 139.71499666664],
        [35.619128059093, 139.73669175729, 35.563681294822, 139.65873588104],
        [35.58778174452, 139.67342595282, 35.085897974228, 139.06126369624],
        [35.186777517963, 139.10427870592, 35.07340070147, 138.54515471095],
        [35.174683636708, 138.70984372566, 34.941670135691, 138.37338855482],
        [35.001511799684, 138.41561221718, 34.776120093547, 138.13740310874],
        [34.796864079388, 138.15789465656, 34.680429930807, 137.710192502],
        [34.99625175818, 137.78421590537, 34.669091161922, 137.13199743711],
        [35.229809095225, 137.27095525593, 34.822903494785, 136.86024659286],
        [35.234371573543, 136.92692741895, 35.115068008934, 136.7759295275],
        [35.39720937408, 136.90013081783, 35.092926515266, 136.49893919092],
        [35.38176559934, 136.67493822315, 35.289346642911, 136.26546613219],
        [35.378480799888, 136.35764679114, 35.127308658171, 136.17467085945],
        [35.190850855942, 136.21261779985, 34.943428547743, 135.90717218843],
        [35.003529158096, 135.97636439926, 34.943016588091, 135.70269114282],
        [34.993446516885, 135.74627448447, 34.890563229195, 135.68768107448],
        [34.930724473397, 135.7277413164, 34.722753124894, 135.49461536496]
    ];

    // 随机选择一个区域（每次watchPosition调用时都会重新选择）
    function selectRandomArea() {
        const randomIndex = Math.floor(Math.random() * AREAS.length);
        return AREAS[randomIndex];
    }

    // 当前使用的区域和边界
    let currentArea = null;
    let maxLat, maxLon, minLat, minLon;

    // 位置历史，用于模拟移动方向
    let positionHistory = [];

    // 初始化区域（每次watchPosition调用时调用）
    function initializeArea() {
        currentArea = selectRandomArea();
        maxLat = currentArea[0];
        maxLon = currentArea[1];
        minLat = currentArea[2];
        minLon = currentArea[3];
        console.log('>>> Selected area:', currentArea);
    }

    // 生成一个在指定区域内的位置
    // 确保位置在区域内：maxLat > lat > minLat && maxLon > lon > minLon
    function getPositionInArea() {
        // 在区域内随机生成位置，但确保在边界内
        const lat = Math.random() * (maxLat - minLat) * 0.8 + minLat + (maxLat - minLat) * 0.1;
        const lon = Math.random() * (maxLon - minLon) * 0.8 + minLon + (maxLon - minLon) * 0.1;

        // 确保在区域内
        const finalLat = Math.max(minLat + 0.0001, Math.min(maxLat - 0.0001, lat));
        const finalLon = Math.max(minLon + 0.0001, Math.min(maxLon - 0.0001, lon));

        return { lat: finalLat, lon: finalLon };
    }

    // 生成有方向性的位置序列（向东移动，经度增加）
    // 这样可以确保方向检查通过（east => up => inbound）
    function getNextPosition() {
        // 如果位置历史为空，从区域西侧开始
        if (positionHistory.length === 0) {
            const startPos = getPositionInArea();
            // 确保从西侧开始（经度较小）
            startPos.lon = minLon + (maxLon - minLon) * 0.1;
            positionHistory.push(startPos);
            return startPos;
        }

        // 获取上一个位置
        const lastPos = positionHistory[positionHistory.length - 1];

        // 向东移动（经度增加），模拟新干线向东行驶
        const lonDelta = (maxLon - minLon) * 0.02; // 每次移动区域宽度的2%
        const latDelta = (maxLat - minLat) * 0.01; // 纬度稍微变化

        let nextLat = lastPos.lat + (Math.random() - 0.5) * latDelta;
        let nextLon = lastPos.lon + lonDelta;

        // 确保仍在区域内
        nextLat = Math.max(minLat + 0.0001, Math.min(maxLat - 0.0001, nextLat));
        nextLon = Math.max(minLon + 0.0001, Math.min(maxLon - 0.0001, nextLon));

        const nextPos = { lat: nextLat, lon: nextLon };
        positionHistory.push(nextPos);

        // 保持位置历史不超过5个点（与checkShinkansenStatus逻辑一致）
        if (positionHistory.length > 5) {
            positionHistory.shift();
        }

        return nextPos;
    }

    function createPosition() {
        const pos = getNextPosition();

        return {
            coords: {
                latitude: pos.lat,
                longitude: pos.lon,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: SPEED_MS
            },
            timestamp: Date.now()
        };
    }


     navigator.geolocation.watchPosition = function(success, error, options) {
        console.log('>>> Replace watchPosition <<<');

        // 每次调用时随机选择一个新区域
        initializeArea();

        // 重置位置历史
        positionHistory = [];

        const firstPosition = createPosition();
        success(firstPosition);
        console.log('>>> First position:', firstPosition.coords);

        // 返回新的位置（向东移动）
        const interval = setInterval(() => {
            const position = createPosition();
            success(position);
            console.log('>>> Position update:', position);
        }, 2000);

        // 返回interval的ID作为watchId
        return interval;
    };

    const originalClearWatch = navigator.geolocation.clearWatch;
     navigator.geolocation.clearWatch = function(watchId) {
        console.log('>>> Replace clearWatch <<<');
        if (typeof watchId === 'number') {
            clearInterval(watchId);
        }
        // 也调用原始方法以防万一
        if (originalClearWatch) {
            originalClearWatch.call(navigator.geolocation, watchId);
        }
    };

    console.log('>>> Script loaded. Speed:', SPEED_KMH, 'km/h (', SPEED_MS.toFixed(2), 'm/s)');
    console.log('>>> Total areas available:', AREAS.length);
 })();
