# 한국사 퀴즈

한국사능력검정시험 심화 기출의 출제 포인트를 참고해 새로 작성한 문제로 만든 정적 퀴즈 사이트입니다.

## 구조

```
index.html             화면 구조 (객관식 / OX / 단답형 / 십자말풀이 탭)
style.css              스타일 (라이트/다크 모드)
js/common.js           공통 도구 (데이터 불러오기, 시대 선택, 저장소)
js/mcq.js              객관식 + 오답 노트
js/ox.js               OX 퀴즈
js/short.js            키워드 단답형 (힌트 → 초성 순서로 공개)
js/crossword.js        십자말풀이 (단답형 단어로 매번 새 퍼즐 생성)
js/app.js              탭 전환 (#mcq, #ox, #short, #cross 주소로 바로 열기)
data/questions.json    객관식 500문제
data/ox.json           OX 문장
data/short.json        단답형 문제 (객관식 중 정답이 단어인 문제를 변환, 십자말풀이도 이 데이터를 사용)
```

CSS·JS를 수정한 뒤 배포할 때는 `index.html`의 `?v=` 숫자를 올려 주세요. 브라우저에 남은 예전 파일 대신 새 파일을 받게 됩니다.

## 로컬에서 실행

`index.html`을 더블클릭해서 열면 브라우저 보안 정책 때문에 `questions.json`을 불러오지 못합니다. 로컬 서버로 실행하세요.

```bash
cd korea-history-problem
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 문제 추가

`data/questions.json`에 아래 형식으로 추가합니다. `answer`는 0부터 시작하는 정답 번호입니다 (0 = ①).
`era`에 새 값을 쓰면 시대 필터에 자동으로 추가됩니다. 시대 필터는 파일에 처음 등장하는 순서대로 표시되니, 시대 순서에 맞춰 넣어 주세요.
`hint`가 없는 문제는 힌트 버튼이 비활성화됩니다.

```json
{
  "id": 23,
  "era": "조선 후기",
  "topic": "흥선 대원군",
  "question": "문제 내용",
  "choices": ["보기1", "보기2", "보기3", "보기4", "보기5"],
  "answer": 0,
  "hint": "정답을 직접 말하지 않고 떠올리게 돕는 단서",
  "explanation": "해설"
}
```

## GitHub Pages 배포

1. 이 폴더 내용을 새 GitHub 저장소에 push
2. 저장소 Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`
3. 잠시 후 `https://<아이디>.github.io/<저장소명>/` 에서 확인
