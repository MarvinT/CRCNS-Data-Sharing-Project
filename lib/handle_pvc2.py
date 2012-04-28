
import math, os, sys, re
import scipy.io
import numpy
from PIL import Image, ImageSequence
from images2gif import writeGif

def read_spike_file(filename) :
    fp = file(filename, 'rb')
    header = fp.read(828)
    if header.startswith('DAN_SPK') :
        pass
    else :
        fp.rewind()
    spikes = numpy.fromfile(fp, dtype=numpy.int32) 
    return spikes

def read_log_file(filename) :
    groups = {}
    for line in file(filename) :
        line = line.strip()
        if not len(line) : continue
        if line[0] == '[' :
            name = re.split('\[|\]', line)[1]
            group = {}
            groups[name] = group
        elif groups :
            words = re.split('\0+', line)
            if len(words) < 2 :
                print 'malformed log entry', line
            else :
                group[words[0]] = words[1:]
        else :
            print 'malformed log entry', line
    return groups

def read_mat_file(filename) :
    m = scipy.io.loadmat(filename)
    return m

def get_bw_image(bitmap) :
    x, y = bitmap.shape
    im = Image.new('1', (x, y))
    for i in range(x) :
        for j in range(y) :
            im.putpixel((i, j), 1 if bitmap[i, j] > 0 else 0)
            print i, j, bitmap[i, j]
    return im

def get_gray_image(bitmap) :
    x, y = bitmap.shape
    im = Image.new('L', (x, y))
    for i in range(x) :
        for j in range(y) :
            im.putpixel((i, j), bitmap[i, j])
    return im

def write_bw_image(filename, bitmap) :
    im = get_bw_image(bitmap)
    im.save(filename + '.png')

def write_gray_movie(filename, bitmap) :
    nf = bitmap.shape[2]
    frames = []
    print 'converting', nf, 'frames'
    for i in range(nf) :
        slice = bitmap[..., ..., i]
        im = get_gray_image(slice)
        frames.append(im)
    print 'writing gif file'
    writeGif(filename + '.gif', frames, duration=0.1, dither=0)
    
#print read_spike_file(sys.argv[1])
#print read_log_file(sys.argv[2])

m = read_mat_file(sys.argv[1])
if 'mov' in m :
    imname = 'mov'
else :
    imname, = [k for k in m.keys() if k[0:2] != '__']
bitmap = m[imname]

if len(bitmap.shape) == 2 :
    write_bw_image("out", bitmap)
else :
    write_gray_movie("out", bitmap)
    




