
import os, sys, glob
import json

from pyramid.response import Response

BaseDir = '/home/wayne/crcns'

def HdfFilename(dataset, experiment) :
    return BaseDir + '/' + dataset + '/' + experiment + '.hdf'

def GetStimulus(req) :
    dataset = req.GET.get('dataset')
    experiment = req.GET.get('experiment')
    want_info = int(req.GET.get('info', 0))
    want_all = int(req.GET.get('all', 0))
    
    filename = HdfFilename(dataset, experiment)
    
    if want_info :
        cmd = '%s/crcns_hdf.py --stimulus-image-info --filename %s' % (BaseDir, filename)
    elif want_all :
        pass
    else :
        time = req.GET.get('time')
        cmd = '%s/crcns_hdf.py --stimulus-image --filename %s --cur-ms %s' % (BaseDir, filename, time)
    print cmd
    data = os.popen(cmd).read()
    return Response(body=data, content_type='text/html')


    
