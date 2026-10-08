# 한국사 퀴즈

한국사능력검정시험 심화 기출의 출제 포인트를 참고해 새로 작성한 문제로 만든 정적 퀴즈 사이트입니다.

## 구조

```
index.html             화면 구조
style.css              스타일 (라이트/다크 모드)
script.js              퀴즈 로직, 오답 노트(localStorage)
data/questions.json    문제 데이터
```

## 로컬에서 실행

`index.html`을 더블클릭해서 열면 브라우저 보안 정책 때문에 `questions.json`을 불러오지 못합니다. 로컬 서버로 실행하세요.

```bash
cd korea-history-problem
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 문제 추가

`data/questions.json`에 아래 형식으로 추가합니다. `answer`는 0부터 시작하는 정답 번호입니다 (0 = ①).
`era`에 새 값을 쓰면 시대 필터에 자동으로 추가됩니다.

```json
{
  "id": 23,
  "era": "조선 후기",
  "topic": "흥선 대원군",
  "question": "문제 내용",
  "choices": ["보기1", "보기2", "보기3", "보기4", "보기5"],
  "answer": 0,
  "explanation": "해설"
}
```

## GitHub Pages 배포

1. 이 폴더 내용을 새 GitHub 저장소에 push
2. 저장소 Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`
3. 잠시 후 `https://<아이디>.github.io/<저장소명>/` 에서 확인
