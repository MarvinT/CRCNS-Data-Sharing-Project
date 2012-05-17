import sys

# This adds directories to python search path
# so Pyramid (which is run in env virtualenv) can import
# some needed modules from the system python.  These were
# installed on debian.

# following for scipy
# /usr/local/lib/python2.6/dist-packages/scipy
sys.path.append('/usr/local/lib/python2.6/dist-packages')

# following for numpy
# /usr/local/lib/python2.6/dist-packages/numpy
# (Same as scipy, no need to append again)
# sys.path.append('/usr/local/lib/python2.6/dist-packages')

# following for latest h5py
sys.path.append('/usr/local/lib/python2.6/dist-packages/h5py-2.0.1-py2.6-linux-i686.egg')

# following for python imaging library
sys.path.append('/usr/share/pyshared')
sys.path.append('/usr/lib/python2.6/dist-packages/PIL')

