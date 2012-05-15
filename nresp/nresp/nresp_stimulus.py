
import os, sys, glob
import json

from pyramid.response import Response

BaseDir = '/home/wayne/crcns'
CrcnsHdf = BaseDir + '/lib/crcns_hdf.py'

def HdfFilename(dataset, experiment) :
    return BaseDir + '/' + dataset + '/' + experiment + '.hdf'

def MovieFilename(dataset, experiment, format, scale) :
    return '%s/pyramid-env/nresp/nresp/static/%s-%s-stimulus-x%s.%s' % (BaseDir, dataset, experiment, scale, format)

def GetStimulus(req) :
    dataset = req.GET.get('dataset')
    experiment = req.GET.get('experiment')
    want_info = int(req.GET.get('info', 0))
    want_all = int(req.GET.get('all', 0))
    format = req.GET.get('format', 'none')
    scale = req.GET.get('scale', 1)
    
    print dataset, experiment, want_info, want_all, format
    filename = HdfFilename(dataset, experiment)
    
    if want_info :
        cmd = '%s --stimulus-image-info --filename %s' % (CrcnsHdf, filename)
        print cmd
        data = [int(n) for n in os.popen(cmd).read().strip().split()]
        use_json = True
    elif want_all :
        mfile = MovieFilename(dataset, experiment, format, scale)
        if not os.access(mfile, os.F_OK) :
            cmd = '%s --stimulus-image-movie --filename %s --format %s --scale %s --outfile %s ' % (CrcnsHdf, filename, format, scale, mfile)
            print cmd
            os.system(cmd)
        print mfile
        data = '/static/' + os.path.split(mfile)[1]
        use_json = True
    else :
        time = req.GET.get('time')
        cmd = '%s --stimulus-image --filename %s --cur-ms %s' % (CrcnsHdf, filename, time)
        print cmd
        data = os.popen(cmd).read()
        use_json = False
    if use_json :
        data = json.dumps(data)
        ctype = "application/jsonrequest"
    else :
        ctype = "text/html"
    print data
    #print 'sending', len(data)
    return Response(body=data, content_type=ctype)


    
