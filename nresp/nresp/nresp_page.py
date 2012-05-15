
import os, sys, glob
import json

from pyramid.response import Response

BaseDir = '/home/wayne/crcns'
CrcnsHdf = BaseDir + '/lib/crcns_hdf.py'

ExperimentCache = {}

def FormatAsOptions(vals, selected) :
    return ' '.join(['<option%s>%s</option>' % (' selected' if v in selected else '', v) for v in vals])

def HdfFilename(dataset, experiment) :
    return BaseDir + '/' + dataset + '/' + experiment + '.hdf'
    
def DatasetOptions(dataset) :
    opts = ['pvc3_cat']
    return FormatAsOptions(opts, dataset)

def ExperimentOptions(dataset, experiment) :
    if dataset :
        opts = [os.path.splitext(os.path.split(f)[1])[0] for f in glob.glob(BaseDir + '/' + dataset + '/*.hdf')]
    else :
        opts = []
    return FormatAsOptions(opts, [experiment])

def UnitOptions(dataset, experiment, units) :
    if dataset and experiment :
        filename = HdfFilename(dataset, experiment)
        cmd = '%s --list-spiketrains --filename %s' % (CrcnsHdf, filename, )
        opts = [u.strip() for u in os.popen(cmd).readlines()]
    else :
        opts = []
    return FormatAsOptions(opts, units)

def ReadExperiment(dataset, experiment) :
    filename = HdfFilename(dataset, experiment)
    return read_hdf(filename)

def SpiketrainMinMax(dataset, experiment, units) :
    filename = HdfFilename(dataset, experiment)
    mint, maxt = None, None
    for unit in units :
        cmd = '%s --spiketrain-minmax --filename %s --unit %s' % (CrcnsHdf, filename, unit)
        print cmd
        minmax1 = [int(v) for v in os.popen(cmd).readlines()]
        if mint == None or minmax1[0] < mint : mint = minmax1[0]
        if maxt == None or minmax1[1] < maxt : maxt = minmax1[1]
    return mint, maxt

def GetPage(req) :
    print 'keys', req.GET.keys()
    dataset = req.GET.get('dataset', 'pvc3_cat') # None)
    experiment = req.GET.get('experiment', 'natural_movie_test') # None)
    units = req.GET.getall('unit')
    if not units :
        units_str = req.GET.get('units')
        if units_str :
            units = units_str.split()
    
    spiketrain_min_ms, spiketrain_max_ms = SpiketrainMinMax(dataset, experiment, units)

    spiketrain_start_ms = req.GET.get('spiketrain_start_ms', spiketrain_min_ms)
    spiketrain_end_ms = req.GET.get('spiketrain_end_ms', spiketrain_max_ms)
    spiketrain_cur_ms = req.GET.get('spiketrain_cur_ms', 0)
    play_speed = req.GET.get('play_speed', 1.0)
    
    vals = {
        'dataset_options' : DatasetOptions(dataset),
        'experiment_options' : ExperimentOptions(dataset, experiment),
        'unit_options' : UnitOptions(dataset, experiment, units),
        'dataset' : dataset,
        'experiment' : experiment,
        'units' : ' '.join(units),
        'spiketrain_start_ms' : spiketrain_start_ms,
        'spiketrain_end_ms' : spiketrain_end_ms,
        'spiketrain_cur_ms' : spiketrain_cur_ms,
        'play_speed' : play_speed,
        }
    
    body = """
<html>
<head>

<meta http-equiv="Content-Type-Script" content="text/javascript">
<meta http-equiv="Pragma" content="no-cache">

<!-- <script src="http://code.jquery.com/jquery-latest.js"></script> -->
<script src="/static/jquery.min.js"></script>
<!-- <script src="/static/jquery.jplayer.min.js"></script> -->
<script src="/static/json2.js"></script>
<script src="/static/JSONRequest.js"></script>
<script src="/static/JSONRequestError.js"></script>
<script src="/static/nresp_funcs.js"></script>

<title>Example</title>
</head>
<body>
<h1>Example</h1>
<table border="1">
<tr>
<td>
<form>
Dataset: <select name="dataset" id="dataset_select">%(dataset_options)s</select><br>
Experiment: <select name="experiment" id="experiment_select">%(experiment_options)s</select><br>
Units: <select name="unit" multiple id="unit_select">%(unit_options)s</select><br>
<input type=submit value="Reload">
</form>
</td>

<td>
<h2 id="stimulus_header">Stimulus</h2>
<video id="stimulus_video">
<source type="video/ogg" />
Stimulus video goes here
</video>
</td>

<!--
<td>
<h2>Template xxx</h2>
</td>
-->
</tr>
<tr>
<td colspan=2>
<h2>Spike trains</h2>
<canvas id="spiketimes_canvas"></canvas>
<script>setup_spiketimes();</script>
<form>
Start ms <input name=spiketrain_start_ms id=spiketrain_start_ms value=%(spiketrain_start_ms)s>
End ms <input name=spiketrain_end_ms id=spiketrain_end_ms value=%(spiketrain_end_ms)s>
Cur ms <input name=spiketrain_cur_ms id=spiketrain_cur_ms value=%(spiketrain_cur_ms)s>
<!-- <input type=submit value="Update"> -->
<input type="hidden" name="dataset" value="%(dataset)s">
<input type="hidden" name="experiment" value="%(experiment)s">
<input type="hidden" name="units" multiple value="%(units)s">
</form>
<br>
<input type="button" id=play_button onclick="play_back()" value="Play">
Speed <input name=play_speed id="play_speed" value=%(play_speed)s>
</td>
</tr>
<!--
<tr>
<td>
<h2>Info</h2>
</td>
<td>
<h2>Annotations</h2>
</td>
</tr>
-->
</table>
</body>
</html>
""" % vals
    return Response(body=body, content_type='text/html')

    
