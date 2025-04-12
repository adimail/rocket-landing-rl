import logging
import os
from backend.settings import settings


class Logger:
    def __init__(
        self, file_name=None, log_dir=None, stream_handler=True, file_handler=True
    ):
        if not file_name:
            raise ValueError("Log file name must be specified.")

        self.log_dir = log_dir or settings["log_dir"]
        os.makedirs(self.log_dir, exist_ok=True)

        self.logger = logging.getLogger(file_name)
        self.logger.setLevel(logging.DEBUG)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        if file_handler:
            file_path = os.path.join(self.log_dir, file_name)
            fh = logging.FileHandler(file_path)
            fh.setLevel(logging.DEBUG)
            fh.setFormatter(formatter)
            self.logger.addHandler(fh)

        if stream_handler:
            sh = logging.StreamHandler()
            sh.setLevel(logging.DEBUG)
            sh.setFormatter(formatter)
            self.logger.addHandler(sh)

    def get_logger(self):
        return self.logger
