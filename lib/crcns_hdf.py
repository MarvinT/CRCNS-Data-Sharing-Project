#!/usr/bin/python
# -*- coding: utf-8 -*-

# http://crcns.org/data-sets/vc/pvc-3/downloads/crcns-pvc3-usersguide.pdf

import math, os, sys, re, glob, argparse
import scipy.io
import numpy
import matplotlib.pyplot as plt
from PIL import Image, ImageSequence
from images2gif import writeGif

os.environ['HDF5_DISABLE_VERSION_CHECK'] = '2' # my setup is a bit messed up -Wayne
import h5py

class Experiment :
    def __init__(self, group, name) :
        self.group = group
        self.name = name
        self.spikesets = {}
        self.metadata = {}
        self.images = {}
        self.stim_info = {}
        self.stim_data = {}
        self.stim_din = {}
        self.stim_movie = None
        self.stim_movie_frame_ms = None

class SpikeSet :
    def __init__(self, name, spk, interval, tem) :
        self.name = name
        self.interval = interval
        self.spk = spk # numpy array of int64 or hdf5 dataset
        self.tem = tem # numpy 2d array of int32 or hdf5 dataset

# -----------------------

def write_hdf(filename, experiment) :
    # /spiketrains
    #             /t00
    #                 /interval (dataset w/1 float)
    #                 /spike_times (dataset)
    #                 /template (dataset)
    # /events
    #        /stimulus
    #                 /times (dataset)
    #                 /values (dataset)
    if os.access(filename, os.F_OK) :
        os.unlink(filename)
        
    f = h5py.File(filename, 'w')
    
    sg = f.create_group('spiketrains')
    for spikeset in experiment.spikesets.values() :
        ug = sg.create_group(spikeset.name)
        ug.create_dataset('interval', data=spikeset.interval)
        ug.create_dataset('spike_times', data=spikeset.spk)
        ug.create_dataset('template', data=spikeset.tem)
        
    eg = f.create_group('events')
    esg = eg.create_group('stimulus')
    m = experiment.stim_movie
    if m != None :
        esg.create_dataset('times', data=experiment.stim_movie_frame_ms)
        esg.create_dataset('values', data=experiment.stim_movie)

# -----------------------

def read_hdf(filename) :
    ex = Experiment('group', 'name')
    
    f = h5py.File(filename, 'r')
    sg = f['/spiketrains']
    for uname, unit in sg.iteritems() :
        si = unit['interval'][...]
        st = unit['spike_times']
        tm = unit['template']
        ss = SpikeSet(uname, st, si, tm)
        ex.spikesets[uname] = ss
    eg = f['/events']
    sg = eg['stimulus']
    if 'times' in sg :
        ex.stim_movie_frame_ms = sg['times']
        ex.stim_movie = sg['values']
    return ex

# -------------------------

if __name__ == "__main__" :
    parser = argparse.ArgumentParser()
    parser.add_argument('--list-spiketrains', action='store_true') # todo - make a single var
    parser.add_argument('--spiketrain-values', action='store_true')
    parser.add_argument('--spiketrain-minmax', action='store_true')
    parser.add_argument('--stimulus-image', action='store_true')
    parser.add_argument('--stimulus-image-info', action='store_true')
    parser.add_argument('--filename')
    parser.add_argument('--start-ms', type=int, default=-1)
    parser.add_argument('--end-ms', type=int, default=-1)
    parser.add_argument('--cur-ms', type=int, default=-1)
    parser.add_argument('--unit')
    args = parser.parse_args()
    
    if args.list_spiketrains :
        ex = read_hdf(args.filename)
        for u in ex.spikesets.keys() :
            print u
            
    elif args.spiketrain_values :
        ex = read_hdf(args.filename)
        st = ex.spikesets[args.unit]
        for v in st.spk :
            v = int(v * st.interval * 1e3)
            if args.start_ms >= 0 and v < args.start_ms : continue
            if args.end_ms >= 0 and v > args.end_ms : continue
            print v
            
    elif args.spiketrain_minmax :
        ex = read_hdf(args.filename)
        st = ex.spikesets[args.unit]
        print int(st.spk[0] * st.interval * 1e3)
        print int(st.spk[-1] * st.interval * 1e3)
        
    elif args.stimulus_image :
        ex = read_hdf(args.filename)
        n, x, y = ex.stim_movie.shape
        times = ex.stim_movie_frame_ms
        for fr in range(times.shape[0]) :
            if times[fr] > args.cur_ms :
                if fr > 0 : fr -= 1
                break
        im = Image.new('L', (x, y))
        for i in range(x) :
            for j in range(y) :
                im.putpixel((i, j), ex.stim_movie[fr, i, j])
        #print n, x, y
        #print args.cur_ms
        #print fr, times
        im.save(sys.stdout, format='png')
        
    elif args.stimulus_image_info :
        ex = read_hdf(args.filename)
        n, x, y = ex.stim_movie.shape
        ms = ex.stim_movie_frame_ms
        print n, x, y, ' '.join([str(m) for m in ms])
        
