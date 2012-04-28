#!/usr/bin/python
# -*- coding: utf-8 -*-

# http://crcns.org/data-sets/vc/pvc-3/downloads/crcns-pvc3-usersguide.pdf

import math, os, sys, re, glob
import scipy.io
import numpy
import matplotlib.pyplot as plt
from PIL import Image, ImageSequence
from images2gif import writeGif

from crcns_hdf import Experiment, SpikeSet, write_hdf, read_hdf

def read_spk(filename) :
    # txx.spk files contain spike times for an individual neuron,
    # indexed by template id (e.g. t00.spk, t18.spk, etc.).
    # Timestamps are in microseconds with 10µs precision and stored as
    # binary 64-bit signed integers.
    fp = file(filename, 'rb')
    spikes = numpy.fromfile(fp, dtype=numpy.int64) 
    return spikes, 1e-6

def read_tem(filename) :
    # txx.tem contain the multi-channel spike waveform template for an
    # individual spike-sorted unit, indexed by template id (e.g. t00,
    # t18, t26). The template comprises a 1ms average spike waveform
    # from each channel in the electrode array, up-sampled to 100kHz,
    # and stored as 54x100 32-bit real numbers (in millivolts). The
    # data are stored in ascending order by channel, using the channel
    # numbering scheme defined in polytrode_x.pas.
    fp = file(filename, 'rb')
    tem = numpy.fromfile(fp, dtype=numpy.dtype((numpy.float32, (100, ))))
    return tem

def read_info_txt(filename) :
    # spk_info.txt is a text file with additional metadata describing
    # the .spk files.
    data = {}
    for line in file(filename) :
        line = line.strip()
        i = line.find('#')
        if line.startswith('#') or i < 0 : continue
        name = line[:i].strip()
        val = line[i+1:].strip()
        data[name] = val
    return data

def read_py_settings(filename) :
    # .py files are text files with additional metadata describing the
    # stimulus.  They are actual Python scripts that, if executed in
    # conjunction with Vision Egg & DimStim, will display the original
    # stimulus presented in the recording session.
    globals = {}
    locals = {}
    exec 'class Movie : pass' in globals
    execfile(filename, globals, locals)
    return locals
    

def read_din(filename) :
    # .din files contain the timing information for the stimulus, one
    # entry for every vertical frame refresh of the stimulus CRT
    # (i.e. 200Hz, so every 5ms). These are binary files comprising
    # consecutive pairs of 64-bit timestamps/64-bit condition indices.
    # For the drifting bar stimulus, the condition index indicates the
    # orientation of the bar; refer to the relevant .py file for the
    # mapping between condition index and bar orientation.  For the
    # spatiotemporal white noise and dynamic natural scene movies the
    # condition index refers to the (zero-based) frame index of the .m
    # file (see below) that was displayed on that refresh.  Since the
    # movie frames were updated at 50Hz, and the CRT refresh was
    # 200Hz, there are four repeating entries per frame.  As with the
    # spin microseconds, stored as 64-bit signed integers.
    fp = file(filename, 'rb')
    din = numpy.fromfile(fp, dtype=numpy.dtype((numpy.int64, (2, ))))
    return din
    
def read_movie_file(filename) :
    # .m files contain the stimulus movie sequences. Both the
    # spatiotemporal white noise and the dynamic natural scene movies
    # are 64 x 64 pixels, with a resolution of 0.2º/pixel, subtending
    # 12.8º of visual angle. Pixels are 8 bit grayscale, stored
    # uncompressed as bytes (unsigned integers).  The movies were
    # displayed at a frame rate of 50Hz, and run for 2 minutes each,
    # thus each movie sequence is 6000 frames long.  Note that there
    # is no movie for the drifting bar stimulus; this was generated
    # ‘on the fly’ by Vision Egg.
    fp = file(filename, 'rb')
    mov = numpy.fromfile(fp, dtype=numpy.dtype((numpy.int8, (64, 64, ))))
    nframes = mov.shape[0]
    mframes = [20 * i for i in range(nframes)]
    return mov, mframes
    
# -----------------------

# polytrode_xx.pas is a text file with metadata describing the
# polytrode used in the recordings, and specifies the mapping between
# channel number and electrode site coordinates (in microns).  The
# file is Object Pascal code, but it should be trivial to parse and
# extract the relevant metadata.

# .edf files are native Eyelink II files and contain binocular
# eye-tracking data for the monkey recordings, sampled every 2ms
# (500Hz).
        
# .eye files are tab-delimited text files exported from the original
# .edf files.  The data are arranged in columns, for example:

def process_dirs(base) :
    group = os.path.split(base)[-1]
    experiments = []
    for dir in glob.glob(base + '/*') :
        name = os.path.split(dir)[-1]
        experiment = Experiment(group, name)
        
        txt = dir + '/spike_data/spk_info.txt'
        if os.access(txt, os.F_OK) :
            experiment.metadata = read_info_txt(txt)
        else :
            print 'Warning: no file', txt
        
        # .tif image files: polytrode2a.tif is an image of the probe
        # showing the recording site configuration;
        # spk_templates_olay.tif shows the templates used for spike
        # sorting.
        for imfile in ['polytrode2a.tif', 'spk_templates_olay.tif'] :
            impath = dir + '/' + imfile
            if os.access(impath, os.F_OK) :
                im = Image.open(impath)
                experiment.images[imfile] = im
                print imfile, im.format, im.size, im.mode
            else :
                print 'Warning: no file', impath
        
        for spk in glob.glob(dir + '/spike_data/*.spk') :
            spkname = os.path.splitext(os.path.split(spk)[-1])[0]
            spkdata, spkinter = read_spk(spk)
            experiment.spikesets[spkname] = SpikeSet(spkname, spkdata, spkinter, None)
            #print spkname, 'spk ->', spkdata.shape
        
        for tem in glob.glob(dir + '/spike_data/*.tem') :
            temname = os.path.splitext(os.path.split(tem)[-1])[0]
            temdata = read_tem(tem)
            experiment.spikesets[temname].tem = temdata
            #print temname, 'tem ->', temdata.shape
        for sp in experiment.spikesets.values() :
            if sp.tem == None :
                print 'Warning: no template found for spike set', sp.name
        
        txt = dir + '/stimulus_data/stim_info.txt'
        if os.access(txt, os.F_OK) :
            experiment.stim_info = read_info_txt(txt)
            print 'stim_info', len(experiment.stim_info)
        else :
            print 'Warning: no file', txt
        
        dinp = dir + '/stimulus_data/*.din'
        dins = glob.glob(dinp)
        if len(dins) == 1 :
            experiment.stim_din = read_din(dins[0])
            print 'din', experiment.stim_din.shape
        else :
            print 'Warning: no file', dinp
        
        pyp = dir + '/stimulus_data/*.py'
        pys = glob.glob(pyp)
        if len(pys) == 1 :
            experiment.stim_data = read_py_settings(pys[0])
            print 'stim_data', len(experiment.stim_data)
        else :
            print 'Warning: no file', pyp
        
        movp = dir + '/stimulus_data/*.m'
        movs = glob.glob(movp)
        if len(movs) == 1 :
            experiment.stim_movie, experiment.stim_movie_frame_ms = read_movie_file(movs[0])
            print 'movie', experiment.stim_movie.shape
        else :
            print 'Warning: no file', movp
        
        experiments.append(experiment)
    
    return experiments

experiments = process_dirs('crcns_pvc3_cat_recordings')
n = 1
nc = len(experiments)
nr = max([len(exp.spikesets) for exp in experiments])
for experiment in experiments :
    hfile = experiment.name + '_test.hdf'
    write_hdf(hfile, experiment)
    ex2 = read_hdf(hfile)
    if False :
        print ex2
        for spikeset in experiment.spikesets.values() :
            n += 1
            plt.subplot(nr, nc, n)
            plt.plot(spikeset.tem)
        plt.show()
    
