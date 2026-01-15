import asyncio
import signal
import sys
from backend import make_app
from backend.config import Config
from backend.settings import settings
from backend.logger import Logger

config = Config()


async def watch_stdin(shutdown_event: asyncio.Event, logger):
    """Listens for 'q' key press in the terminal to trigger shutdown."""
    logger.info("Terminal controller active. Press 'q' then Enter to quit.")
    loop = asyncio.get_running_loop()

    while not shutdown_event.is_set():
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if line.strip().lower() == "q":
            logger.info("'q' pressed. Initiating shutdown...")
            shutdown_event.set()
            break


async def main():
    logger_instance = Logger(file_name="app.log")
    logger = logger_instance.get_logger()

    app = make_app(settings, logger)

    port = config.get("app.PORT") or 8080
    server = app.listen(port)
    logger.info(f"Application started on http://localhost:{port}")

    shutdown_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    # ✅ Add signal handlers only on non-Windows platforms
    if sys.platform != "win32":
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, shutdown_event.set)

    input_task = asyncio.create_task(watch_stdin(shutdown_event, logger))

    # Wait for shutdown signal (q / Ctrl+C)
    await shutdown_event.wait()

    logger.info("Shutting down application...")

    server.stop()
    input_task.cancel()

    try:
        await input_task
    except asyncio.CancelledError:
        pass

    # Allow a brief moment for final IO/Logging flushes
    await asyncio.sleep(0.5)

    logger.info("Shutdown complete.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # ✅ Ctrl+C fallback (Windows-safe)
        pass
