// ====================================================
// 🔑 브이월드 키 설정 (동적 로드)
// ====================================================
let VWORLD_KEY = "";
// 📌 도메인 자동 감지: localhost에서도, 배포 서버에서도 자동 작동
const VWORLD_DOMAIN = window.location.host || "127.0.0.1:5500";

// API 키 로드 (Secrets 폴더에서 또는 localStorage에서)
async function loadVWorldKey() {
    // 1순위: localStorage에 저장된 키
    const savedKey = localStorage.getItem('vworld_key');
    if (savedKey) {
        VWORLD_KEY = savedKey;
        console.log('✅ VWorld 키 로드됨 (localStorage)');
        return;
    }
    // 2순위: 파일에서 로드 시도
    try {
        const res = await fetch('../Secrets/vworldKey.txt');
        if (res.ok) {
            VWORLD_KEY = (await res.text()).trim();
            localStorage.setItem('vworld_key', VWORLD_KEY);
            console.log('✅ VWorld 키 로드됨 (파일)');
        }
    } catch (e) {
        console.warn('⚠️ VWorld 키 파일 로드 실패, 기본값 사용');
        VWORLD_KEY = "15B4EE93-674B-3CFD-BD35-8679895739AC"; // fallback
    }
}

// 📌 관심 땅 localStorage 저장/복원 기능
const INTEREST_STORAGE_KEY = 'interest_lands_data';

function saveInterestToLocalStorage() {
    const interestData = {};
    for (let pnu in myLandsDB) {
        if (myLandsDB[pnu].owner === '관심') {
            interestData[pnu] = myLandsDB[pnu];
        }
    }
    localStorage.setItem(INTEREST_STORAGE_KEY, JSON.stringify(interestData));
    console.log('💾 관심 땅 자동 저장됨:', Object.keys(interestData).length, '개');
}

function loadInterestFromLocalStorage() {
    const saved = localStorage.getItem(INTEREST_STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            for (let pnu in data) {
                myLandsDB[pnu] = data[pnu];
            }
            console.log('✅ 관심 땅 복원됨:', Object.keys(data).length, '개');
        } catch (e) {
            console.warn('관심 땅 복원 실패:', e);
        }
    }
}


// 1. 지도 초기화
var map = L.map('map', { zoomControl: false, maxZoom: 22 }).setView([36.4526, 126.8202], 12);
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 22 }).addTo(map);
L.Control.geocoder().addTo(map);

// UI 요소
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const closeBtn = document.getElementById('close-sidebar');
const mainSwitch = document.getElementById('toggle-family-land');
const priceSwitch = document.getElementById('toggle-price');
const bgSwitch = document.getElementById('show-bg-map');
const statusMsg = document.getElementById('status-msg');
const listCountEl = document.getElementById('list-count');
const landListEl = document.getElementById('land-list');

const saveInterestBtn = document.getElementById('save-interest-btn');
const loadInterestBtn = document.getElementById('load-interest-btn');
const saveExcelBtn = document.getElementById('save-excel-btn');
const fileInput = document.getElementById('file-input');
const copyCodeBtn = document.getElementById('copy-full-code-btn');
const checkAll = document.getElementById('check-all');
const ownerCheckboxes = document.getElementsByName('ownerCheckbox');

menuBtn.addEventListener('click', () => sidebar.classList.add('open'));
closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

// 2. 데이터 (가족 땅 리스트)
const initialList = [
    { jibun: "1", owner: "나" }, { jibun: "4-5", owner: "나" }, { jibun: "5", owner: "나" },
    { jibun: "5-1", owner: "엄마" }, { jibun: "5-2", owner: "엄마" }, { jibun: "5-3", owner: "엄마" },
    { jibun: "5-4", owner: "엄마" }, { jibun: "5-6", owner: "엄마" }, { jibun: "5-7", owner: "엄마" },
    { jibun: "5-8", owner: "엄마" }, { jibun: "5-9", owner: "엄마" }, { jibun: "6", owner: "나" },
    { jibun: "8-1", owner: "나" }, { jibun: "8-2", owner: "나" }, { jibun: "8-3", owner: "나" },
    { jibun: "9", owner: "나" }, { jibun: "10-1", owner: "나" }, { jibun: "10-2", owner: "나" },
    { jibun: "10-3", owner: "나" }, { jibun: "11-1", owner: "아우" }, { jibun: "11-2", owner: "아우" },
    { jibun: "12-1", owner: "엄마" }, { jibun: "12-2", owner: "엄마" }, { jibun: "12-3", owner: "엄마" },
    { jibun: "13", owner: "아우" }, { jibun: "13-2", owner: "아우" }, { jibun: "17", owner: "엄마" },
    { jibun: "18", owner: "엄마" }, { jibun: "19-2", owner: "엄마" }, { jibun: "23", owner: "엄마" },
    { jibun: "23-2", owner: "나" }, { jibun: "23-3", owner: "나" },
    { jibun: "산51-1", owner: "나/아우" }, { jibun: "산51-9", owner: "나/아우" }, { jibun: "산53-1", owner: "엄마" }
];

let myLandsDB = {};
let geoJsonLayer;
let isFetching = false;

// 유틸 함수
function getCleanDisplayJibun(fullAddr) {
    const match = fullAddr.match(/(산)?\s*\d+(-\d+)?/);
    return match ? match[0].trim() : fullAddr;
}
function parseAddress(addr) {
    let isSan = addr.includes("산");
    let numPart = addr.replace(/[^0-9\-]/g, "");
    let parts = numPart.split("-");
    return { isSan: isSan, main: parseInt(parts[0] || 0), sub: parseInt(parts[1] || 0) };
}
function matchAddress(fullAddr) {
    if (!fullAddr) return null;
    let cleanKey = getCleanDisplayJibun(fullAddr).replace(/\s+/g, "");
    for (let item of initialList) {
        if (cleanKey === item.jibun.replace(/\s+/g, "")) return item.owner;
    }
    return null;
}
function getOwnerColor(owner) {
    if (owner === "나") return "#3b82f6";
    if (owner === "엄마") return "#ec4899";
    if (owner === "아우") return "#10b981";
    if (owner && (owner.includes("/") || owner === "공동")) return "#8b5cf6";
    if (owner === "관심") return "#f59e0b";
    return "#64748b";
}
function formatAreaString(m2) {
    const pyeong = Math.round(m2 / 3.3058);
    return `${m2.toLocaleString()}m² (${pyeong.toLocaleString()}평)`;
}

// ====================================================
// 3. API 통신
// ====================================================
function jsonpOnce(url, callbackParam = "callback", timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const cb = "vw_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        const script = document.createElement("script");
        const sep = url.includes("?") ? "&" : "?";
        let timer = null;
        window[cb] = (data) => { cleanup(); resolve(data); };
        function cleanup() {
            if (timer) clearTimeout(timer);
            try { delete window[cb]; } catch (_) { window[cb] = undefined; }
            if (script.parentNode) script.parentNode.removeChild(script);
        }
        script.onerror = () => { cleanup(); reject(new Error("JSONP error")); };
        script.src = url + sep + callbackParam + "=" + encodeURIComponent(cb);
        timer = setTimeout(() => { cleanup(); reject(new Error("Timeout")); }, timeoutMs);
        document.body.appendChild(script);
    });
}

function getFirstNumber(obj, keys) {
    const stack = [obj];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        for (const k of keys) {
            if (Object.prototype.hasOwnProperty.call(cur, k)) {
                const num = Number(String(cur[k]).replace(/,/g, ""));
                if (!Number.isNaN(num)) return num;
            }
        }
        for (const v of Object.values(cur)) { if (v && typeof v === 'object') stack.push(v); }
    }
    return null;
}

// ✅ [추가] 지목(텍스트) 찾기 함수
function getFirstString(obj, keys) {
    const stack = [obj];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        for (const k of keys) {
            if (Object.prototype.hasOwnProperty.call(cur, k)) {
                const val = String(cur[k]);
                if (val && val.trim() !== "") return val;
            }
        }
        for (const v of Object.values(cur)) { if (v && typeof v === 'object') stack.push(v); }
    }
    return null;
}

async function getLandData(pnu, type) {
    const endpoint = type === 'price'
        ? "https://api.vworld.kr/ned/data/getIndvdLandPriceAttr"
        : "https://api.vworld.kr/ned/data/getLandCharacteristics";

    // 지목은 'char' 요청에서만 나옴
    const keys = type === 'price'
        ? ["pblntfPclnd", "pann_giga", "jiga"]
        : ["lndpclAr", "rnes_area", "area"];

    const startYear = new Date().getFullYear();
    for (let y = startYear; y >= 2018; y--) {
        const url = `${endpoint}?key=${VWORLD_KEY}&domain=${VWORLD_DOMAIN}&pnu=${pnu}&stdrYear=${y}&format=json`;
        try {
            const data = await jsonpOnce(url, "callback", 10000);
            const val = getFirstNumber(data, keys);

            // ✅ [수정] 값뿐만 아니라 원본 데이터(raw)도 리턴해서 지목을 찾을 수 있게 함
            if (val !== null) return { year: y, value: val, raw: data };
        } catch (e) { /* continue */ }
    }
    return null;
}

async function fetchAllDetails() {
    if (isFetching) return;
    isFetching = true;
    statusMsg.innerHTML = `<span style="color:#3b82f6;">📡 데이터 수신 중...</span>`;
    const keys = Object.keys(myLandsDB);
    let done = 0;
    for (const pnu of keys) {
        if (!priceSwitch.checked) break;
        if (myLandsDB[pnu].apiData) continue;
        updateSideList();
        try {
            const [priceRes, areaRes] = await Promise.all([
                getLandData(pnu, 'price'),
                getLandData(pnu, 'char')
            ]);

            const price = priceRes ? priceRes.value : 0;
            const area = areaRes ? areaRes.value : 0;
            const year = priceRes ? priceRes.year : "-";

            // ✅ [핵심] 지목 데이터 추출 (우선순위: indcgrCodeNm > indcgrNm > jimok)
            let jimok = "-";
            if (areaRes && areaRes.raw) {
                jimok = getFirstString(areaRes.raw, ["indcgrCodeNm", "indcgrNm", "jimok"]) || "-";
            }

            myLandsDB[pnu].apiData = {
                priceRaw: price,
                areaRaw: area,
                year: year,
                jimok: jimok, // 지목 저장
                totalPrice: price * area
            };
        } catch (e) { console.error(e); }
        done++;
        statusMsg.innerText = `수신 중 (${done}/${keys.length})`;
        updateSideList();
        await new Promise(r => setTimeout(r, 200));
    }
    isFetching = false;
    statusMsg.innerHTML = `<span style="color:#10b981;">✅ 조회 완료</span>`;
    updateSideList();
}

function updateSideList() {
    landListEl.innerHTML = "";
    let activeFilters = [];
    if (mainSwitch.checked) ownerCheckboxes.forEach(cb => { if (cb.checked) activeFilters.push(cb.value); });

    let lands = [];
    let totalAreaSum = 0;
    let totalValueSum = 0;

    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(layer => {
            const pnu = layer.feature.properties.PNU;
            if (myLandsDB[pnu]) {
                const item = myLandsDB[pnu];
                let isVisible = false;
                if (mainSwitch.checked) {
                    if (activeFilters.includes(item.owner)) isVisible = true;
                    if (activeFilters.includes("공동") && (item.owner.includes("/") || item.owner === "공동")) isVisible = true;
                }
                if (isVisible) {
                    let area = Math.round(turf.area(layer.feature));
                    let isOfficial = false;
                    let price = 0;
                    let totalPrice = 0;
                    let jimok = "";

                    if (item.apiData) {
                        if (item.apiData.areaRaw > 0) { area = item.apiData.areaRaw; isOfficial = true; }
                        price = item.apiData.priceRaw;
                        totalPrice = item.apiData.totalPrice;
                        jimok = item.apiData.jimok;
                    }
                    totalAreaSum += area;
                    totalValueSum += totalPrice;
                    lands.push({ pnu, jibun: item.jibun, owner: item.owner, area, isOfficial, price, totalPrice, apiData: item.apiData, jimok });
                }
            }
        });
    }

    lands.sort((a, b) => {
        let pA = parseAddress(a.jibun);
        let pB = parseAddress(b.jibun);
        if (pA.isSan !== pB.isSan) return pA.isSan ? 1 : -1;
        if (pA.main !== pB.main) return pA.main - pB.main;
        return pA.sub - pB.sub;
    });

    const areaStr = formatAreaString(totalAreaSum);
    const valueStr = totalValueSum > 0 ? `💰 총액: ${totalValueSum.toLocaleString()}원` : "";

    listCountEl.innerHTML = `
        <span style="color:#64748b;">총 ${lands.length}필지</span><br>
        <strong style="color:#334155;">${areaStr}</strong><br>
        <strong style="color:#d97706;">${valueStr}</strong>`;

    lands.forEach(land => {
        const li = document.createElement('li');
        li.className = "land-item";
        const color = getOwnerColor(land.owner);
        const areaStr = formatAreaString(land.area);
        const officialBadge = land.isOfficial ? "<span style='color:#3b82f6; font-size:11px;'>공부상</span>" : "";
        // 지목 표시 (데이터 있으면)
        const jimokBadge = (land.jimok && land.jimok !== "-")
            ? `<span style='background:#f1f5f9; color:#475569; padding:2px 5px; border-radius:4px; font-size:11px; margin-left:5px;'>${land.jimok}</span>`
            : "";

        let priceHtml = "";
        if (priceSwitch.checked) {
            if (land.apiData) {
                priceHtml = `<div class="price-tag">${land.totalPrice.toLocaleString()}원 <span style="font-weight:400; opacity:0.8;">(${land.apiData.year})</span></div>`;
            } else if (isFetching) {
                priceHtml = `<div style="font-size:12px; color:#94a3b8; margin-top:4px;">⏳ 조회 중...</div>`;
            }
        }

        li.innerHTML = `
            <div class="land-info" onclick="zoomToLand('${land.pnu}')">
                <span class="land-jibun">${getCleanDisplayJibun(land.jibun)} ${jimokBadge}</span>
                <span class="land-area">${areaStr} ${officialBadge}</span>
                ${priceHtml}
            </div>
            <span class="owner-badge" style="background:${color};">${land.owner}</span>
            <button class="btn-delete-item" onclick="event.stopPropagation(); deleteLand('${land.pnu}');" title="목록에서 제외">✕</button>
        `;
        landListEl.appendChild(li);
    });
}

function zoomToLand(targetPnu) {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        if (layer.feature.properties.PNU === targetPnu) {
            map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 19 });
            layer.openPopup();
            if (window.innerWidth < 600) sidebar.classList.remove('open');
        }
    });
}

function getFeatureStyle(feature) {
    const pnu = feature.properties.PNU;
    const owner = myLandsDB[pnu] ? myLandsDB[pnu].owner : null;
    const invisibleStyle = { color: 'transparent', weight: 0, fillOpacity: 0 };
    const bgStyle = { color: '#94a3b8', weight: 1, opacity: 0.3, fillOpacity: 0 };

    if (owner) {
        let isVisible = false;
        if (mainSwitch.checked) {
            let activeFilters = [];
            ownerCheckboxes.forEach(cb => { if (cb.checked) activeFilters.push(cb.value); });
            if (activeFilters.includes(owner)) isVisible = true;
            if (activeFilters.includes("공동") && (owner.includes("/") || owner === "공동")) isVisible = true;
        }
        if (!isVisible) return invisibleStyle;
        const color = getOwnerColor(owner);
        return { color: color, weight: 2, opacity: 1, fillColor: color, fillOpacity: 0.6 };
    }
    return bgSwitch.checked ? bgStyle : invisibleStyle;
}

// 5. 초기화 및 파일 로드
fetch('ungok_full.geojson')
    .then(res => res.json())
    .then(data => {
        statusMsg.innerHTML = "지도 데이터 준비됨";
        data.features.forEach(f => {
            const owner = matchAddress(f.properties.JIBUN);
            if (owner) myLandsDB[f.properties.PNU] = { owner: owner, jibun: f.properties.JIBUN };
        });

        // 📌 localStorage에서 관심 땅 복원
        loadInterestFromLocalStorage();

        // 📌 API 키 로드
        loadVWorldKey();

        // 📌 가족땅만 모아보기 디폴트 ON 강제 적용
        mainSwitch.checked = true;

        geoJsonLayer = L.geoJSON(data, {
            style: getFeatureStyle,
            onEachFeature: (feature, layer) => {
                const pnu = feature.properties.PNU;

                layer.on('click', (e) => {
                    if (e.originalEvent) e.originalEvent.preventDefault();
                    const item = myLandsDB[pnu];
                    const owner = item ? item.owner : null;

                    let popupContent = `<div style="text-align:center; font-family:'Noto Sans KR';">
                        <div style="font-size:16px; font-weight:700; color:#1e293b; margin-bottom:5px;">
                            ${getCleanDisplayJibun(item?.jibun || feature.properties.JIBUN)}
                        </div>`;

                    if (item && item.apiData) {
                        // 팝업에도 지목 표시
                        let jimokStr = (item.apiData.jimok && item.apiData.jimok !== "-") ? `(${item.apiData.jimok})` : "";
                        popupContent += `<div style="font-size:13px; color:#475569;">면적: ${formatAreaString(item.apiData.areaRaw)} ${jimokStr}</div>`;
                        popupContent += `<div style="background:#eff6ff; color:#2563eb; padding:8px; border-radius:8px; margin-top:8px; font-weight:700;">
                            총 ${item.apiData.totalPrice.toLocaleString()}원
                            <div style="font-size:11px; font-weight:400; margin-top:2px;">(단가: ${item.apiData.priceRaw.toLocaleString()}원 / ${item.apiData.year})</div>
                        </div>`;
                    } else {
                        popupContent += `<div style="font-size:13px; color:#94a3b8;">공시지가 정보 없음</div>`;
                    }
                    popupContent += `</div>`;

                    if (owner) {
                        let isInterest = owner === "관심";
                        let label = isInterest ? "👀 관심 땅" : owner;
                        let btnText = isInterest ? "💔 관심 해제" : "🗑️ 목록에서 제외";
                        let btnColor = isInterest ? "#ef4444" : "#64748b";
                        let btnBg = isInterest ? "#fee2e2" : "#f1f5f9";

                        popupContent += `<div style="margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                            <span style="background:${getOwnerColor(owner)}; color:white; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${label}</span>
                            <button onclick="deleteLand('${pnu}')" style="background:${btnBg}; color:${btnColor}; border:none; padding:6px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600;">${btnText}</button>
                        </div>`;
                    } else {
                        popupContent += `<div style="margin-top:10px; text-align:center;">
                            <button onclick="addLand('${pnu}', '${feature.properties.JIBUN}', '관심')" style="background:#f59e0b; color:white; border:none; padding:8px 16px; border-radius:6px; font-size:13px; cursor:pointer; font-weight:bold;">👀 관심 등록</button>
                        </div>`;
                    }
                    layer.bindPopup(popupContent).openPopup();
                });

                layer.on('mouseover', function () {
                    const data = myLandsDB[pnu];
                    if (data && data.owner) {
                        let label = getCleanDisplayJibun(feature.properties.JIBUN);
                        layer.bindTooltip(label, { sticky: true }).openTooltip();
                    }
                });
            }
        }).addTo(map);

        updateSideList();
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch(error => { console.error('Error:', error); statusMsg.innerHTML = `<span style="color:#ef4444;">지도 로드 실패</span>`; });

window.addLand = function (pnu, jibun, who) {
    myLandsDB[pnu] = { owner: who, jibun: jibun };
    geoJsonLayer.setStyle(getFeatureStyle);
    map.closePopup();
    updateSideList();
    if (who === '관심') saveInterestToLocalStorage(); // 📌 자동 저장
};
window.deleteLand = function (pnu) {
    const wasInterest = myLandsDB[pnu]?.owner === '관심';
    delete myLandsDB[pnu];
    geoJsonLayer.setStyle(getFeatureStyle);
    map.closePopup();
    updateSideList();
    if (wasInterest) saveInterestToLocalStorage(); // 📌 자동 저장
};

if (priceSwitch) priceSwitch.addEventListener('change', () => { if (priceSwitch.checked) fetchAllDetails(); else updateSideList(); });

// ✅ [엑셀 저장 최종 수정] 날짜 변환 방지 + 지목 컬럼 분리
saveExcelBtn.addEventListener('click', () => {
    // 엑셀 한글 깨짐 방지용 BOM 추가
    let csv = "\uFEFFPNU,주소,지목,면적(m2),평수,공부상여부,공시지가(원/m2),총공시가(원),기준년도,소유자\n";

    geoJsonLayer.eachLayer(layer => {
        const pnu = layer.feature.properties.PNU;
        if (myLandsDB[pnu]) {
            const item = myLandsDB[pnu];
            let area = Math.round(turf.area(layer.feature));
            let isOfficial = "지도상";
            let price = 0, total = 0, year = "-";
            let jimok = "-"; // 기본값

            if (item.apiData) {
                if (item.apiData.areaRaw) { area = item.apiData.areaRaw; isOfficial = "공부상"; }
                price = item.apiData.priceRaw;
                total = item.apiData.totalPrice;
                year = item.apiData.year;
                // API에서 가져온 지목 사용
                if (item.apiData.jimok) jimok = item.apiData.jimok;
            }
            const pyeong = Math.round(area / 3.3058);

            // 💡 [엑셀 날짜 변환 방지] 주소 앞뒤에 ="..." 처리를 해서 강제 텍스트화
            // 지번은 item.jibun (순수 주소) 사용
            let safeAddr = `="${item.jibun}"`;
            let safePnu = `="${pnu}"`;

            // 컬럼 순서: PNU, 주소, 지목, 면적...
            csv += `${safePnu},${safeAddr},"${jimok}",${area},${pyeong},"${isOfficial}",${price},${total},"${year}","${item.owner}"\n`;
        }
    });

    const link = document.createElement("a");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "토지대장_상세_V4.7.csv";
    link.click();
    URL.revokeObjectURL(url);
});

saveInterestBtn.addEventListener('click', () => {
    const data = {}; for (let k in myLandsDB) if (myLandsDB[k].owner === "관심") data[k] = myLandsDB[k];
    if (!Object.keys(data).length) return alert("관심 땅이 없습니다.");
    const a = document.createElement("a"); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data)); a.download = "interest.json"; a.click();
});

loadInterestBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = JSON.parse(evt.target.result);
        for (let k in data) myLandsDB[k] = data[k];
        geoJsonLayer.setStyle(getFeatureStyle); updateSideList(); alert("불러오기 완료");
    };
    reader.readAsText(e.target.files[0]);
});

copyCodeBtn.addEventListener('click', () => {
    const list = []; for (let k in myLandsDB) list.push({ jibun: getCleanDisplayJibun(myLandsDB[k].jibun), owner: myLandsDB[k].owner });
    navigator.clipboard.writeText(JSON.stringify(list, null, 2)).then(() => alert("코드 복사 완료"));
});

mainSwitch.addEventListener('change', () => { geoJsonLayer.setStyle(getFeatureStyle); updateSideList(); });
bgSwitch.addEventListener('change', () => { geoJsonLayer.setStyle(getFeatureStyle); });
checkAll.addEventListener('change', function () { ownerCheckboxes.forEach(cb => cb.checked = this.checked); geoJsonLayer.setStyle(getFeatureStyle); updateSideList(); });
ownerCheckboxes.forEach(cb => cb.addEventListener('change', () => { geoJsonLayer.setStyle(getFeatureStyle); updateSideList(); }));