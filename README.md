# PyPractice

PyPractice は、PC とスマホのブラウザで使える Python の4択クイズです。バージョン1では全886問から重複なしで10問を出題し、回答ごとに正誤と解説を表示します。結果画面で正答数を確認し、間違えた問題を復習できます。

[公開版を開く](https://tk0903.github.io/Python-Programming-Quiz/)

## ローカルでの起動

サーバーを使わずに試す場合は、プロジェクト直下の `PyPractice.html` を Edge や Chrome で開きます。ファイルがない場合や、問題・画面を更新した場合は `python scripts/build_questions.py --offline` で生成できます。

Python 3.13 の標準ライブラリを使います。プロジェクトのルートで次を実行し、PC のブラウザで [ローカル版](http://127.0.0.1:8000/) を開きます。サーバーを終了するときは PowerShell で Ctrl+C を押します。

```powershell
python scripts/build_questions.py
python -m http.server 8000 --bind 127.0.0.1 --directory web
```

接続できない場合は、PowerShell に `Serving HTTP on 127.0.0.1 port 8000` と表示されているか確認し、そのウィンドウを開いたまま、同じPCの Edge や Chrome のアドレス欄に `http://127.0.0.1:8000/` を入力します。

## 問題の更新

[`python_quiz.csv`](python_quiz.csv) を編集し、`python scripts/build_questions.py` を再実行します。CSV は UTF-8 で保存し、列は `問題, A, B, C, D, ans, 解説` の順にします。変換時に列・空欄・解答を検証し、コードの改行とインデントを保ったまま `web/data/questions.json` を生成します。

## GitHub Pages へのデプロイ

[`deploy.yml`](.github/workflows/deploy.yml) が GitHub Actions で CSV を検証して JSON を生成し、`web/` を配信します。公開後は同じ URL を PC とスマホで開けます。

1. このプロジェクトを GitHub リポジトリに push する。
2. リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選ぶ。
3. **Actions → Deploy quiz to GitHub Pages → Run workflow** からデフォルトブランチで初回デプロイを実行する。
4. ワークフローの実行結果に表示された URL を開き、出題・採点・解説表示を確認する。以後はデフォルトブランチへの push で再配信される。

配信する JSON には正解と解説も含まれます。 [GitHub Pages の公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 作業履歴

作業を終えるたびに、日付・実施内容・確認結果を [作業ログ](docs/WORK_LOG.md) に追記します。継続して対応する事項があれば、残作業も記録します。
