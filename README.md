# 트립노선 (가칭)

누구와, 어디로 가는지에 맞춰 **갈 곳 → 숙소 동네 → 날짜별 일정**을 정해 주는 여행 계획 앱 시제품이에요.
지금은 도쿄만 지원해요. 입력한 일정은 쓰는 사람의 기기 안에만 저장돼요.

프로젝트 배경, 결정 사항, 로드맵, 작업 규칙은 [CLAUDE.md](CLAUDE.md)에 정리돼 있어요.

## 내 컴퓨터에서 실행하기

필요한 것: Python 3 (서버), Node.js 18 이상 (테스트). 설치할 패키지는 없어요.

```bash
npm run dev     # 또는: python3 -m http.server 5173
```

브라우저에서 http://localhost:5173 을 열어요. 파일을 더블클릭해서 열면 동작하지 않아요(ES 모듈이라 서버가 필요해요).

폰에서 보려면 PC와 같은 와이파이에 연결하고 `http://<PC의 IP 주소>:5173` 으로 들어가요.

```bash
npm test        # 일정·추천 로직 테스트
```

## Claude Code로 이어서 작업하기

**VS Code(내 컴퓨터)**: 이 폴더를 VS Code로 열고, 터미널에서 `claude` 를 실행해요. Claude Code가 `CLAUDE.md` 를 먼저 읽고 작업해요.

**Claude Code 웹 버전**: GitHub 저장소가 필요해요. 아래 "GitHub에 올리기"를 먼저 해 두고, Claude Code 웹에서 그 저장소를 선택해요.

첫 요청 예시
- "CLAUDE.md 읽고 현재 상태랑 로드맵 요약해 줘"
- "로드맵 1번, 구글 지도 공유 링크로 장소를 담는 기능을 어떻게 만들지 계획부터 세워 줘"
- "숙소 동네 화면에서 1순위 이유를 한 줄로 더 눈에 띄게 보여 줘"

## GitHub에 올리기

이 폴더는 이미 git 저장소로 초기화돼 있고 첫 커밋이 들어 있어요. GitHub에서 빈 저장소(README 없이)를 만든 뒤:

```bash
git remote add origin https://github.com/<내 아이디>/tripnoseon.git
git push -u origin main
```

## 폰에서 앱처럼 쓰기 (배포)

GitHub 저장소 → Settings → Pages → Branch를 `main`, 폴더를 `/ (root)` 로 저장하면 몇 분 뒤 `https://<내 아이디>.github.io/tripnoseon/` 주소가 생겨요.
폰 브라우저로 열고 "홈 화면에 추가"를 누르면 앱 아이콘이 생기고, 한 번 열어 두면 인터넷이 없어도 열려요.
