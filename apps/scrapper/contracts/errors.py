class MetadataRequestError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


class UpstreamResponseError(Exception):
    def __init__(self, status: int):
        super().__init__(f"The target page returned HTTP {status}.")
        self.status = status
