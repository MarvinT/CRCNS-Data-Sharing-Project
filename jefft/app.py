# This is the main app for the crcns data viewer prototype. 
# It requires Pyramid to be installed in a virtual env
# and data files and stimulus files for the pvc1
# data set (converted to hdf5) stored in the "pvc1" directory.
# It is run by the following two commands:
# . env/bin/activate  -- to activate the virtual env
# python app.py
# Server port (currently 8923) is specified at bottom of thie file.
# written by Jeff Teeters (jteeters@berkeley.edu)


from wsgiref.simple_server import make_server
# from paste.httpserver import serve
from pyramid.config import Configurator
from pyramid.response import Response
from pyramid.view import view_config
import setup_env
import numpy as np
import h5py
from os.path import basename, isfile

from PIL import Image, ImageDraw
import cStringIO

from get_dds import get_dds2


# from:
# http://stackoverflow.com/questions/2257441/python-random-string-generation-with-upper-case-letters-and-digits
import string
import random
def id_gen(size=6, chars=string.ascii_lowercase+string.digits):
    return ''.join(random.choice(chars) for x in range(size))


# later this will need to be selected by the client html page
file_list = ['pvc1/ac1_u004_000.h5',
             'pvc1/ac1_u005_007.h5',
             'pvc1/ac1_u006_004.h5',
             'pvc1/ac1_u009_001.h5',
             'pvc1/ad1_u006_019.h5',
             'pvc1/ad1_u008_004.h5',
            ]

file_ids = []
file_lookup = {}

def setup_file_ids():
    global file_ids, file_list, file_lookup
    for (counter, path) in enumerate(file_list):
        file_name = basename(path)
        # make a unique id for the file
        file_id = 'f' + ("%i" % counter) + id_gen(3)
        file_ids.append( {'id':file_id, 'path':path, 'name':file_name} )
        file_lookup[file_id] = path


# Return dds (hdf5 data descriptor structure)
def get_dds(request):
    file_id = request.matchdict['file_id'];
    path = file_lookup[file_id]
    dds = get_dds2(path)   # in file get_dds
    return dds

# Return dataset when requested
def get_dataset(request):
    # THIS NOT USED ANYMORE. SCRATCH CODE HERE 
    # hdf5_file = request.matchdict['hdf5_file'];
    # if hdf5_file == "":
    # hdf5_file = '/mnt/crcns-ringach-data/neurodata/converted/ad1_u619_new.h5';
    h5f = h5py.File(hdf5_file, 'r')
    dataset_path = request.matchdict['dataset'];
    data = h5f[dataset_path]
    # import pdb; pdb.set_trace()
    # range = request.matchdict['range']
    # if range != '':
    #    start = 0
    #    end = 10
    #    data = data[start:end]
    # make a nested list json encoding
    data = data.value.tolist() 
    return data

# Return spike trains when requested
def get_spiketrains(request):
    global file_lookup
    file_id = request.matchdict['file_id']
    path = file_lookup[file_id]
    h5f = h5py.File(path, 'r')
    channels = request.matchdict['channels'].split(',')
    stim = int(request.matchdict['stim'])  # 1 or 0
    range = request.matchdict['timerange']
    if range != 'all':
        [time_start, time_stop] = range.split(',')
        time_start = int(time_start)
        time_stop = int(time_stop)
        print "found channels=%s, range=%s, time_start=%i, time_stop=%i" % (channels, 
            range, time_start, time_stop)
    data = {}
    for chan in channels:
        ds_path = "/spiketrains/" + chan + "/spike_times"
        ds = h5f[ds_path]
        dsv = ds.value
        if range != 'all':
            [start_index, stop_index] = get_bounds(dsv.view('<u4'), time_start, time_stop)
            dsv = dsv[start_index:stop_index]
        data[chan] = dsv.tolist()
    if stim:
        ds_path = "/events/stimulus/times"
        ds = h5f[ds_path]
        dsv = ds.value
        if range != 'all':
            [start_index, stop_index] = get_bounds(dsv.view('<u4'), time_start, time_stop)
            dsv = dsv[start_index:stop_index]
        data['events'] = {'stimulus' : {'times' : dsv.tolist() } }
        ds_path = "/events/stimulus/values"
        ds = h5f[ds_path]
        dsv = ds.value
        if range != 'all':
            dsv = dsv[start_index:stop_index]
        data['events']['stimulus']['values'] = dsv.tolist()
    return data

def get_bounds(items, time_start, time_stop):
    """Find start_index, stop_index of times in items (monotonically increasing)"""
    if time_start != 0:
        start_index = items.searchsorted(time_start, side='left')
        if start_index > 0:
            start_index -= 1  # make sure include item before
    else:
        start_index = 0
    if time_stop != 0:
        stop_index = items.searchsorted(time_stop, side='right')
        if stop_index < len(items):
            stop_index += 1   # make sure include item after
    else:
        stop_index = len(items)
    return (start_index, stop_index)
    

# Return image when requested
def pvc1_show_image(request):
    # this version uses JPEG image files.  Not used anymore.
    movie_id = int(request.matchdict['movie_id'])
    segment_id = int(request.matchdict['segment_id'])
    frame = int(request.matchdict['frame'])
    image_dir = 'pvc1/movie_frames/movie%03u_%03u.images/' % \
        (movie_id, segment_id)
    image_name = 'movie%03u_%03u_%03u.jpeg' % (movie_id, segment_id, frame)
    path = image_dir + '/' + image_name
    response = Response(content_type='image/jpeg')
    if not isfile(path):
        # missing file, generate one
        img = Image.new("RGB", (320, 220,), "#cccccc"  )
        draw = ImageDraw.Draw(img)
        draw.text((15, 60), image_name + ' missing', fill='#000')
        f = cStringIO.StringIO()
        img.save(f, "jpeg")
        f.seek(0)
        response.app_iter = f
    else:
        response.app_iter = open(path, 'rb')
    return response
    # return Response(path)


def pvc1_show_imageh5(request):
    # Loads JPEG images from hdf5 file
    h5_image_file = 'pvc1/pvc1_movie_frames.h5'
    movie_id = int(request.matchdict['movie_id'])
    segment_id = int(request.matchdict['segment_id'])
    frame = int(request.matchdict['frame'])
    image_dir = 'movie%03u_%03u.images' % (movie_id, segment_id)
    image_name = 'movie%03u_%03u_%03u.jpeg' % (movie_id, segment_id, frame)
    path = image_dir + '/' + image_name
    response = Response(content_type='image/jpeg')
    h5f = h5py.File(h5_image_file, 'r')
    try:
        ds = h5f[path]
    except KeyError: 
        # missing file, generate an image to return
        img = Image.new("RGB", (320, 220,), "#cccccc"  )
        draw = ImageDraw.Draw(img)
        draw.text((15, 60), image_name + ' missing', fill='#000')
        f = cStringIO.StringIO()
        img.save(f, "jpeg")
        f.seek(0)
        response.app_iter = f
    else:
        dsv = ds.value
        response.app_iter = dsv
    h5f.close()
    return response

def hello_world(request):
    return Response('Hello %(name)s' %request.matchdict)

def index_view(request):
    global file_ids
    dict = {'file_list':file_ids}
    return dict

def jstest_view(request):
    return {}

def main():
    # Grab the config, add a view, and make a WSGI app
    setup_file_ids()
    config = Configurator()
    config.add_route('hello', '/hello/{name}')
    config.add_view(hello_world, route_name='hello')
    config.add_route('showimage', '/show_image/{movie_id}/{segment_id}/{frame}')
    config.add_view(pvc1_show_imageh5, route_name='showimage')
    config.add_route('index', '/')
    config.add_view(index_view, route_name='index', renderer='__main__:templates/index.pt')
    config.add_route('dataset', '/get_dataset/{dataset:[^\[]*}{range:.*}')
    config.add_view(get_dataset, route_name='dataset', renderer='json')
    config.add_route('dds', '/get_dds/{file_id}')
    config.add_view(get_dds, route_name='dds', renderer='json')
    config.add_route('spiketrains', '/get_spiketrains/fid={file_id}/channels={channels}/stim={stim}/timerange={timerange:.*}')
    config.add_view(get_spiketrains, route_name='spiketrains', renderer='json')

    config.add_static_view('static', 'static/', cache_max_age=1)
    #                     cache_max_age=86400)
    # config.scan('views');  # no need for this if add_view specifies renderer

    config.add_route('jstest', '/jstest')
    config.add_view(jstest_view, route_name='jstest', renderer='__main__:templates/js_test.pt')

    app = config.make_wsgi_app()
    return app

if __name__ == '__main__':
    # When run from command line, launch a WSGI server and app
    app = main()
    # serve(app, host='0.0.0.0',port='8923')
    server = make_server('0.0.0.0',8923, app)
    server.serve_forever()


