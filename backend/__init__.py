import tornado.web
from backend.handler import AppHandler, SimulationSpeedHandler
from backend.handler.websocket_handler import RocketWebSocketHandler


def make_app(settings, logger):
    return tornado.web.Application(
        [
            (r"/", AppHandler, dict(logger=logger)),
            (r"/ws", RocketWebSocketHandler, dict(logger=logger)),
            (r"/api/speed", SimulationSpeedHandler, dict(logger=logger)),
            (
                r"/(.*)",
                tornado.web.StaticFileHandler,
                {"path": settings["static_path"]},
            ),
        ],
        **settings
    )
