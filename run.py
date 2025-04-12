import asyncio
import signal
from backend import make_app
from backend.config import Config
from backend.settings import settings
from backend.logger import Logger

config = Config()


async def main():
    logger_instance = Logger(file_name="app.log")
    logger = logger_instance.get_logger()

    app = make_app(settings, logger)

    port = int(config.get("app.PORT") or 8000)
    app.listen(port)
    logger.info(f"Application started on http://localhost:{port}")

    shutdown_event = asyncio.Event()

    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT, shutdown_event.set)

    await shutdown_event.wait()
    logger.info("Shutting down application.")


if __name__ == "__main__":
    asyncio.run(main())
