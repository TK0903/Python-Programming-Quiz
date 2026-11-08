import argparse
import csv
import json
import os
import sys
from pathlib import Path
from tempfile import mkstemp


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "python_quiz.csv"
JSON_PATH = PROJECT_ROOT / "web" / "data" / "questions.json"
OFFLINE_PATH = PROJECT_ROOT / "PyPractice.html"
HEADER = ["問題", "A", "B", "C", "D", "ans", "解説"]
ANSWERS = {"A", "B", "C", "D"}


def load_questions(source):
    questions = []
    with source.open(encoding="utf-8-sig", newline="") as file:
        rows = csv.reader(file, strict=True)
        record_number = 1
        start_line = 1

        try:
            if next(rows, None) != HEADER:
                raise ValueError(
                    f"CSVの1レコード目（1行目）の列名は {', '.join(HEADER)} の順にしてください。"
                )

            while True:
                record_number += 1
                start_line = rows.line_num + 1
                row = next(rows, None)
                if row is None:
                    break

                location = f"CSVの{record_number}レコード目（{start_line}行目）"
                if len(row) != len(HEADER):
                    raise ValueError(f"{location}は{len(row)}列です。7列にしてください。")

                empty_columns = [column for column, value in zip(HEADER, row) if not value.strip()]
                if empty_columns:
                    raise ValueError(f"{location}に空欄があります（{', '.join(empty_columns)}）。")

                question, *choices, answer, explanation = row
                if answer not in ANSWERS:
                    raise ValueError(f"{location}の解答は {answer!r} です。A〜Dを指定してください。")

                questions.append({
                    "question": question,
                    "choices": choices,
                    "answer": answer,
                    "explanation": explanation,
                })
        except csv.Error as error:
            raise ValueError(
                f"CSVの{record_number}レコード目（{start_line}行目）を読み取れませんでした（{error}）。"
            ) from error

    if not questions:
        raise ValueError("CSVに問題がありません。2レコード目（2行目）から問題を追加してください。")
    return questions


def write_questions(destination, questions):
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = mkstemp(dir=destination.parent, suffix=".tmp")
    temporary_path = Path(name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
            json.dump(questions, file, ensure_ascii=False, indent=2)
            file.write("\n")
        temporary_path.replace(destination)
    finally:
        temporary_path.unlink(missing_ok=True)


def write_offline_page(questions):
    web = PROJECT_ROOT / "web"
    page = (web / "index.html").read_text(encoding="utf-8")
    styles = (web / "styles.css").read_text(encoding="utf-8")
    script = (web / "app.js").read_text(encoding="utf-8")
    data = json.dumps(questions, ensure_ascii=False).replace("<", r"\u003c")
    page = page.replace('<link rel="stylesheet" href="./styles.css">', f"<style>\n{styles}</style>")
    page = page.replace(
        '<script type="module" src="./app.js"></script>',
        f'<script type="application/json" id="offline-questions">{data}</script>\n'
        f'<script type="module">\n{script}</script>',
    )
    OFFLINE_PATH.write_text(page, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="単体で開けるHTML版も生成します。")
    args = parser.parse_args()

    try:
        questions = load_questions(CSV_PATH)
        write_questions(JSON_PATH, questions)
        if args.offline:
            write_offline_page(questions)
    except (OSError, ValueError) as error:
        print(f"問題データの生成に失敗しました。{error}", file=sys.stderr)
        return 1

    print(f"{len(questions)}問を {JSON_PATH.relative_to(PROJECT_ROOT).as_posix()} に書き出しました。")
    if args.offline:
        print(f"{OFFLINE_PATH.name} を生成しました。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
