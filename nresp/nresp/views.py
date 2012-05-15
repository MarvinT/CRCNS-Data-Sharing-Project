from pyramid.view import view_config

import nresp_page
import nresp_stimulus
import nresp_spiketimes

@view_config(route_name='home', renderer='templates/mytemplate.pt')
def my_view(request):
    return {'project':'nresp'}

@view_config(route_name='nresp')
def nresp_view(request):
    return nresp_page.GetPage(request)

@view_config(route_name='nresp-get-stimulus')
def nresp_get_stimulus(request):
    return nresp_stimulus.GetStimulus(request)

@view_config(route_name='nresp-get-spiketimes')
def nresp_get_spiketimes(request):
    return nresp_spiketimes.GetSpiketimes(request)
