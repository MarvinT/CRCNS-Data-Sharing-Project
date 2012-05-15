import os, sys, glob
import Image
import h5py


def read_jpeg(filename) :
	img  = Image.open(filename)
	return img

def read_write_frames(folder, group) :
	for imfile in glob.glob(os.path.join(folder, '*.jpeg')) :
		name = os.path.split(imfile)[-1]
		group.create_dataset(name, data=read_jpeg(imfile), 
							 compression='gzip', compression_opts=4)

def read_write_stimuli(path) :
	f = h5py.File('crcns-pvc1-stimuli.hdf', 'w')
	for dir in glob.glob(path + '/*') :
		name = os.path.split(dir)[-1]
		print 'working on ' + name
		frame_group = f.create_group(name)
		read_write_frames(dir, frame_group)
	
if __name__ == "__main__" :
	path = 'crcns-pvc1/crcns-ringach-data/movie_frames'
	read_write_stimuli(path)
	
