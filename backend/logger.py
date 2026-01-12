import logging
import os
import json
import sys
from backend.settings import settings


class JsonFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after parsing the LogRecord.
    """

    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        # If 'extra' data was passed, include it (excluding standard keys)
        if hasattr(record, "props"):
            log_record.update(record.props)

        return json.dumps(log_record)


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

        formatter = JsonFormatter(datefmt="%Y-%m-%d %H:%M:%S")

        if file_handler:
            file_path = os.path.join(self.log_dir, file_name)
            fh = logging.FileHandler(file_path)
            fh.setLevel(logging.DEBUG)
            fh.setFormatter(formatter)
            self.logger.addHandler(fh)

        if stream_handler:
            sh = logging.StreamHandler(sys.stdout)
            sh.setLevel(logging.DEBUG)
            sh.setFormatter(formatter)
            self.logger.addHandler(sh)

    def get_logger(self):
        return self.logger
