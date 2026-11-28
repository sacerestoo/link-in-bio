from wsgiref.simple_server import make_server

from api.metadata import handler


def main() -> None:
    with make_server("0.0.0.0", 3002, handler) as server:
        print("Scrapper listening at http://localhost:3002")
        server.serve_forever()


if __name__ == "__main__":
    main()
