import setup_env   
import h5py
# import pprint
import unicodedata
import json

dds = {}  # like opendap "Dataset Descriptor Structure"

# Return dataset discriptor when requested
def get_dds2(hdf5_file):
    global dds;
    dds = {}  # should find a way to not use global variable
    h5f = h5py.File(hdf5_file, 'r')
    h5f.visititems(func)
    return dds


def add_to_dds(obj, path, shape, type):
    global dds
    node = dds
    for p in path[:-1]:
        if p not in node:
            node[p] = {}
        node = node[p]
    dset_name = path[-1]
    if dset_name == 'metadata':
        str = obj.value[0][0]  # json encoded metadata
        info = json.loads(str) # decode json
    else:
        info = {'shape':shape, 'type':type}
    node[dset_name] = info

#   import pdb; pdb.set_trace()

def func(name, obj): 
    if isinstance(obj, h5py.Dataset):
        name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore')
        path = name.strip('/').split('/')
        shape = obj.shape
        dtype = obj.dtype
        if len(dtype) == 0:
            # not compond type 
            name_types = dtype.name  # will be like uint32
        else:
            # compond type, build array of field names and types
            names = dtype.names  # header names for compond type
            name_types = []
            for i in range(len(names)):
                dname = dtype[i].name  # will be like int16
                name_types.append( ( names[i], dname ) )
        info = {'path': path, 'shape': shape, 'type':name_types }
        add_to_dds(obj, path, shape, name_types)
