
import os, sys, glob
import json

from pyramid.response import Response

BaseDir = '/home/wayne/crcns'
CrcnsHdf = BaseDir + '/lib/crcns_hdf.py'

def HdfFilename(dataset, experiment) :
    return BaseDir + '/' + dataset + '/' + experiment + '.hdf'

def GetSpiketimes(req) :
    dataset = req.GET.get('dataset')
    experiment = req.GET.get('experiment')
    unit = req.GET.get('unit')
    start_ms = req.GET.get('start_ms')
    end_ms = req.GET.get('end_ms')
    
    filename = HdfFilename(dataset, experiment)
    cmd = '%s --spiketrain-values --filename %s --unit %s --start-ms %s --end-ms %s' % (CrcnsHdf, filename, unit, start_ms, end_ms)
    print cmd
    times = [int(u) for u in os.popen(cmd).readlines()]
    print len(times), 'times'
    data = json.dumps(times)
    print 'sending', len(data)
    return Response(body=data, content_type='application/jsonrequest')
