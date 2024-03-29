from pyramid.config import Configurator

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(settings=settings)
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_route('home', '/')
    config.add_route('nresp', '/nresp')
    config.add_route('nresp-get-stimulus', '/nresp-get-stimulus')
    config.add_route('nresp-get-spiketimes', '/nresp-get-spiketimes')
    config.scan()
    return config.make_wsgi_app()
