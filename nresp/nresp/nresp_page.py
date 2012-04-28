
import os, sys, glob
import json

from pyramid.response import Response

BaseDir = '/home/wayne/crcns'

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
        cmd = '%s/crcns_hdf.py --list-spiketrains --filename %s' % (BaseDir, filename, )
        opts = [u.strip() for u in os.popen(cmd).readlines()]
    else :
        opts = []
    return FormatAsOptions(opts, units)

def ReadExperiment(dataset, experiment) :
    filename = HdfFilename(dataset, experiment)
    return read_hdf(filename)

def SpiketrainCode(dataset, experiment, units, start_ms, end_ms) :
    filename = HdfFilename(dataset, experiment)
    ret = ""
    for unit in units :
        cmd = '%s/crcns_hdf.py --spiketrain-values --filename %s --unit %s --start-ms %s --end-ms %s' % (BaseDir, filename, unit, start_ms, end_ms)
        print cmd
        times = [int(u) for u in os.popen(cmd).readlines()]
        print len(times), 'times'
        vals = {
            'values' : json.dumps(times),
            'unit' : unit,
            }
        ret += """
<canvas id="%(unit)s_canvas" width="800" height="60"></canvas>
<script>make_spiketime_plot("%(unit)s", %(values)s);</script></br>
""" % vals
    return ret

def SpiketrainMinMax(dataset, experiment, units) :
    filename = HdfFilename(dataset, experiment)
    mint, maxt = None, None
    for unit in units :
        cmd = '%s/crcns_hdf.py --spiketrain-minmax --filename %s --unit %s' % (BaseDir, filename, unit)
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
    
    spiketrain_code = SpiketrainCode(dataset, experiment, units, spiketrain_start_ms, spiketrain_end_ms)
    vals = {
        'dataset_options' : DatasetOptions(dataset),
        'experiment_options' : ExperimentOptions(dataset, experiment),
        'unit_options' : UnitOptions(dataset, experiment, units),
        'spiketrain_code' : spiketrain_code,
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
<script src="/static/nresp_funcs.js"></script>
<script src="/static/jquery.min.js"></script>

<title>Example</title>
</head>
<body>
<h1>Example</h1>
<table border="1">
<tr>
<td>
<form>
Dataset: <select name="dataset">%(dataset_options)s</select><br>
Experiment: <select name="experiment">%(experiment_options)s</select><br>
Units: <select name="unit" multiple>%(unit_options)s</select><br>
<input type=submit value="Reload">
</form>
</td>
<!--
<td>
<h2>Template xxx</h2>
</td>
-->
</tr>
<tr>
<td>
<h2>Spike trains</h2>
%(spiketrain_code)s
<form>
Start ms <input name=spiketrain_start_ms value=%(spiketrain_start_ms)s>
End ms <input name=spiketrain_end_ms value=%(spiketrain_end_ms)s>
Cur ms <input name=spiketrain_cur_ms value=%(spiketrain_cur_ms)s>
<input type=submit value="Update">
<button onclick="play_back()">Play</button>
Speed <input name=play_speed value=%(play_speed)s>
<input type="hidden" name="dataset" value="%(dataset)s">
<input type="hidden" name="experiment" value="%(experiment)s">
<input type="hidden" name="units" multiple value="%(units)s">
</form>
</td>
</tr>
<tr>
<td>
<h2>Stimulus</h2>
<img id="current_stimulus">
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

    
