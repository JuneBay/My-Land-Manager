# 내 토지 관리 지도 시스템

가족 토지 정보를 지도에서 시각적으로 관리하고, VWorld API를 통해 공시지가 및 상세 정보를 조회하는 웹 애플리케이션입니다.

## 📁 프로젝트 구조

```
Copy/RunTime/
├── index.html              # 통합 페이지 (지도 + 상세조회 탭 전환)
├── indexv3.html            # 지도 대시보드 (Leaflet 기반)
├── api_test.html           # 상세 데이터 조회 (PNU 일괄 조회)
├── map_scriptV3_local.js   # 지도 로직 (로컬 실행용, CORS 우회)
├── map_scriptV3.js         # 지도 로직 (서버 실행용)
├── ungok_data.js           # GeoJSON 데이터 (JavaScript 변수로 임베드)
├── ungok_full.geojson      # 운곡면 지적도 원본 데이터
└── Secrets/
    └── vworldKey.txt       # VWorld API 키 (git 제외)
```

## ✅ 완료된 작업 (2024-12-24)

### 1. 로컬 실행 환경 구축 (CORS 문제 해결)
- `file://` 프로토콜에서 GeoJSON 로드 불가 문제 해결
- `ungok_data.js`로 GeoJSON 데이터를 JavaScript 변수로 변환
- `map_scriptV3_local.js` 생성 (fetch 대신 직접 변수 참조)

### 2. UI/UX 개선
- **통합 페이지 (index.html)**: 지도↔상세조회 탭 전환 기능
- **메뉴 버튼 스타일 개선**: 파란색 그라데이션, 더 눈에 띄게
- **사이드바 열 때 버튼 숨김**: 메뉴 타이틀 가림 문제 해결
- **경계선 강화**: 선택된 땅 (weight: 3), 배경 지번 (weight: 1.5, opacity: 0.7)

### 3. PNU 목록 복사 기능 추가
- 지도에서 보이는 가족땅/관심 땅의 PNU 리스트를 클립보드에 복사
- 복사된 PNU를 상세조회 페이지에 붙여넣어 일괄 조회 가능
- PNU만 복사 (지번 정보 제외)

### 4. 가족땅 모아보기 기능 수정
- 페이지 로드 시 "가족 땅만 모아보기" 기본 ON
- `mainSwitch.checked = true` 명시적 설정

## 🔧 다음 작업 (TODO)

### 1. VWorld API 설정 수정
- [ ] VWorld 포털에서 로컬 도메인 재등록 필요
  - 현재 등록: `127.0.0.1:5500`
  - 추가 등록 필요: `localhost`, 실제 IP 등
- [ ] `api_test.html`의 Domain 입력 필드 기본값 수정
- [ ] VWorld Key 입력 UX 개선 (저장/불러오기 명확화)

### 2. PNU 기반 추가 데이터 연동
- [ ] **토지이음** (eum.go.kr): 토지이용계획확인서 연결
  - 현재: 링크 버튼만 제공
  - 개선: 데이터 직접 로드 검토
- [ ] **산야로** (forestland.kr): 산지 정보 조회
  - 산지 구분, 산지전용 가능 여부 등
- [ ] **NEINS** (환경영향평가): 환경성 검토
- [ ] **부동산 실거래가**: 국토교통부 API 연동

### 3. 추가 개선 사항
- [ ] 공시지가 조회 결과 엑셀 다운로드 기능
- [ ] 지도에서 직접 필지 클릭 → 상세조회 연동
- [ ] 관심 땅 그룹 관리 기능

## 🚀 실행 방법

### 로컬 실행 (권장)
```
파일 탐색기에서 Copy/RunTime/index.html 더블클릭
```

### Live Server 실행 (VS Code)
```
1. VS Code에서 폴더 열기
2. Live Server 확장 설치
3. index.html 우클릭 → Open with Live Server
```

## 📌 사용 방법

1. **지도 대시보드**
   - "☰ 토지 목록" 버튼으로 사이드바 열기
   - 가족 구성원별 필터링 가능
   - 💰 공시지가 확인 ON 시 VWorld API 조회
   - "📋 PNU 목록 복사" 버튼으로 일괄 조회용 데이터 복사

2. **상세 데이터 조회**
   - VWorld Key와 Domain 입력
   - PNU 목록 붙여넣기 (한 줄에 하나씩)
   - "조회 시작" 버튼으로 일괄 조회
   - 상세 버튼으로 모든 필드 확인 가능

## 🔑 VWorld API 키 발급
1. [VWorld 오픈API](https://www.vworld.kr/dev/v4api.do) 접속
2. 회원가입 및 API 키 발급
3. 인증키 도메인에 사용할 도메인 등록
   - 로컬: `127.0.0.1:5500`, `localhost`
   - 배포: 실제 도메인

---

*마지막 업데이트: 2024-12-24*
