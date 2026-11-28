import subprocess
from pathlib import Path


def main() -> None:
    app_directory = Path(__file__).resolve().parent
    repository_root = app_directory.parent.parent
    result = subprocess.run(
        ["vercel", "dev", "--listen", "3002", "--yes", "apps/scrapper"],
        cwd=repository_root,
        check=False,
    )
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
