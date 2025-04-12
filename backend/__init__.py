import tornado.web
from backend.handler import AppHandler


def make_app(settings, logger):
    return tornado.web.Application(
        [
            (r"/", AppHandler, dict(logger=logger)),
        ],
        **settings
    )
