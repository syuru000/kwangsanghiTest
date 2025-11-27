# 광상희 (Kwang-sang-hui) 웹 게임

장기(Janggi)의 변형 게임인 광상희를 웹 브라우저에서 플레이할 수 있도록 구현한 프로젝트입니다.

## 📌 주요 기능

- 모든 광상희 기물의 행마법 구현
- 기물 선택, 이동, 잡기 등 기본 게임 플레이
- 장군, 게임 종료 등 규칙 적용
- 기보 확인 및 되돌리기, 탐색 기능
- 마우스 우클릭을 이용한 화살표/원 그리기 분석 기능

## 💻 로컬 환경에서 실행하기

이 게임은 로컬 웹 서버를 통해 실행해야 합니다. Python이 설치되어 있다면 아래 방법으로 간단히 실행할 수 있습니다.

1.  **명령 프롬프트(cmd) 또는 PowerShell 실행**

2.  **이 프로젝트 폴더(`KHS_betaWeb`)로 이동합니다.**
    ```shell
    cd C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb
    ```

3.  **아래 명령어로 웹 서버를 실행합니다.**
    ```shell
    python -m http.server
    ```

4.  웹 브라우저를 열고 주소창에 아래 주소를 입력합니다.
    > http://localhost:8000

## 🚀 GitHub Pages로 배포하여 세상에 공개하기

아래 단계를 따라하면 이 게임을 인터넷에 공개하여 다른 사람들도 플레이할 수 있게 할 수 있습니다.

1.  **GitHub에 새로운 저장소(Repository) 생성**
    *   [github.com/new](https://github.com/new) 페이지로 이동하여 새로운 저장소를 만듭니다.
    *   저장소 이름을 원하는 대로 정합니다. (예: `kwang-sang-hui-game`)
    *   'Public'으로 설정하고 다른 옵션은 건드리지 않은 채 `Create repository` 버튼을 누릅니다.

2.  **이 프로젝트 폴더를 Git 저장소로 만들고 GitHub에 업로드**
    *   명령 프롬프트(cmd) 또는 PowerShell에서 아래 명령어들을 **순서대로** 입력합니다.
    *   먼저, 프로젝트 폴더로 이동합니다.
        ```shell
        cd C:\Users\rua06\testBot\discord_Py_game\KHS_betaWeb
        ```
    *   이제 Git 명령어들을 실행합니다. (아래 `[Your-GitHub-Username]`과 `[Your-Repository-Name]` 부분은 회원님의 정보로 바꿔주세요.)
        ```shell
        git init
        git add .
        git commit -m "Initial commit: Kwang-sang-hui game"
        git branch -M main
        git remote add origin https://github.com/[Your-GitHub-Username]/[Your-Repository-Name].git
        git push -u origin main
        ```

3.  **GitHub Pages 활성화**
    *   방금 생성한 GitHub 저장소 페이지로 이동합니다.
    *   `Settings` 탭을 클릭합니다.
    *   왼쪽 메뉴에서 `Pages`를 클릭합니다.
    *   'Build and deployment' 항목 아래의 'Source'에서, Branch를 `main`으로 선택하고 폴더는 `/ (root)`로 둔 채 `Save` 버튼을 누릅니다.

4.  **배포 확인**
    *   잠시(1~2분) 기다린 후, 같은 페이지 상단에 "Your site is live at `https://[Your-GitHub-Username].github.io/[Your-Repository-Name]/`" 와 같은 메시지가 나타납니다.
    *   해당 주소를 클릭하면 배포된 게임을 확인할 수 있습니다!
