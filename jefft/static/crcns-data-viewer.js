$(function() {

    var buf = {};  // for storing all data fetched from the server

    // following executed by clicking on load file button
    $('#file_select button').click(function () {
        var file_id = $('#file_list').val();
        var page_size = $('#file_select [name=page_size]').val();
        buf = {};  // clear any previous stored data
        buf['current_status'] = {};
        buf['current_status']['file_id'] = file_id;
        buf[file_id] = {};
        get_dds_and_data(file_id, page_size);
    });

    // following executed by clicking on view_select button
    $('#view_select button').click(function () {
        // get time specified in current_time text box, save for display, also move slider
        var current_time = $('#view_select [name=current_time]').val();
        var file_id = buf['current_status']['file_id'];
        var time_per_page = buf[file_id]['dds_x']['time_per_page'];
        var slider_val = current_time * 10000.0 / time_per_page;
        $("#scroll_slider").slider( "option", "value", slider_val );
        save_current_time(current_time);
        get_data();  // get data and display it
    });

    function save_current_time(current_time) {
        // called when either view_select button clicked, or slider moved
        // saves current time (seconds in current page) and starting_sample (all pages)
        var file_id = buf['current_status']['file_id'];
        buf[file_id]['dds_x']['current_time'] = current_time;
        var sampling_rate = buf[file_id]['dds']['metadata']['sampling_rate'];
        var samples_per_page = buf[file_id]['dds_x']['samples_per_page'];
        var page = $('#page_select').val();
        var starting_sample = samples_per_page * (page - 1) + (current_time * sampling_rate);
        buf[file_id]['dds_x']['starting_sample'] = starting_sample;
    }

    function get_dds_and_data(file_id, page_size) {
        $.getJSON('/get_dds/' + file_id, function(data) {
            buf[file_id]['dds'] = data;  // save dds in buffer (global variable)
            build_dds_x(file_id);
            calculate_number_pages(file_id, page_size);
            add_page_menu(file_id);
            add_channel_menu(file_id);
            update_window_size();
            get_data();        // now that have dds, get the data and display it
        });
    }


    function add_page_menu(file_id) {
        var npages = buf[file_id]['dds_x']['number_pages'];
        var output = [];
        for (var i=1; i<=npages; i++) {
            output.push('<option value="'+ i +'">'+ i +'</option>');
        }
        $('#page_select').html(output.join(''));
    }

    function add_channel_menu(file_id) {
        var channels = buf[file_id]['dds_x']['channels'];
        var container = $('#channel_checkboxes');
        container.empty();  // remove any previous menu items
        // add new
        var ch_name, label;
        // adapted from:
        // http://stackoverflow.com/questions/579135/creating-checkbox-elements-on-the-fly-with-jquery-odd-ie-behavior
        for (var i =0; i<channels.length; i++) {
           ch_name = channels[i];
           label = "cbx_" + ch_name;
           container.append(
               $(document.createElement("input")).attr({
                        type:  'checkbox'
                        ,id:   label
                        ,name:  'disp_chan'
                        ,value: ch_name
                        ,checked:true
               })
               .click( function( event )
               {
                        // var cbox = $(this)[0];
                        // alert( cbox.value );
                        // redisplay since different channel selected
                        display_data();
               } )
           )
           .append(
                $(document.createElement('label')).attr({
                        'for':  label
                })
                .text( ch_name + " " )
           )
        }
    }

    function build_dds_x(file_id) {
        // extract useful information from dds (total number of spikes)
        var ldds = buf[file_id]['dds']['spiketrains'];
        var channels = Object.keys(ldds);
        var total_spikes = 0;
        var ch_name;
        for (var i=0; i<channels.length; i++) {
            ch_name = channels[i];
            total_spikes += ldds[ch_name]['spike_times']['shape'][0];
        }
        buf[file_id]['dds_x'] = {'total_spikes': total_spikes}
        buf[file_id]['dds_x']['channels'] = channels.sort();
    }

    function get_data() {
        var file_id = buf['current_status']['file_id'];
        var page = $('#page_select').val();
        page_key = 'p' + page;
        if(!buf[file_id][page_key]) {
            // Don't have data, get it so can display
            var channels = buf[file_id]['dds_x']['channels'].join(',');  // list of channels
            var samples_per_page = buf[file_id]['dds_x']['samples_per_page'];
            var range_start = (page - 1) * samples_per_page;
            var range_end = range_start + samples_per_page;
            var time_range = range_start + "," + range_end;
            var url = "/get_spiketrains/fid=" + file_id + "/channels=" + channels +
                "/stim=1/timerange=" + time_range;
            // get data for page
            $.getJSON(url, function(data) {
                buf[file_id][page_key] = data;  // save data globally
                display_all();
                // var str = JSON.stringify(data, undefined, 2);
                // $('#info_area').html("<pre>\n" + msg + "\n" + str + "</pre>\n");
                // $('#info_area').html("<pre>\n" + msg + "</pre>\n");
                });
        } else {
           // already have data, display it
           display_all();
        }
    }

/*
<g id="text">
  <text id="cur_time" x="30" y="80" font-size="12" fill="black">Time area</text>
</g>
<g id="spikes">
<line id="ch01" x1="0" y1="50" x2="0" y2="50" stroke-width="25"
  stroke="black" stroke-dasharray="0"/>
</g>

*/
/*
       ctx.fillStyle = "red";  
       ctx.beginPath();  
       ctx.moveTo(0, 0);  
       // canvas_width = 120;
       // canvas_height = 100;
       ctx.lineTo(canvas_width - 1, canvas_height - 1);
       ctx.lineTo(canvas_width - 1, 0);  
       ctx.lineTo(0, canvas_height - 1);
       ctx.fill();  
       var msg;
       msg = "canvas_height=" + canvas_height + ", canvas_width=" + canvas_width;
       alert(msg);
       return;
*/

    // binary search from
    // http://www.nczonline.net/blog/2009/09/01/computer-science-in-javascript-binary-search/
    function binarySearch(items, value, side){
        // side == 'left' to return index of item <= value
        // side == 'right' to return index of item >= value
    var startIndex  = 0,
        num_items   = items.length - 1,
        stopIndex   = num_items,
        middle      = Math.floor((stopIndex + startIndex)/2);
    while(items[middle] != value && startIndex < stopIndex){
        //adjust search area
        if (value < items[middle]){
            stopIndex = Math.max(middle - 1, startIndex);  // max to make sure never less than startIndex 
        } else if (value > items[middle]){
            startIndex = Math.min(middle + 1, stopIndex);  // min to make sure never greater than stopIndex
        }
        //recalculate middle
        middle = Math.floor((stopIndex + startIndex)/2);
    }
    //make sure it's the right value
    if(side == 'left') {
        //want to return index of element that is <= value
        if (items[middle] > value && middle > 0) middle -= 1;
    } else {
        //want to return index of element that is >= value
        if (items[middle] < value && middle < num_items - 1) middle += 1;
    }
    return middle;
    }

    function find_starting_index(ch_data, starting_sample, side) {
        return binarySearch(ch_data, starting_sample, side);
    }


    var loading_image = false;
    var wait_count = 0;
    var same_count = 0;
    var image_shown = false;

    function update_image (movie_id, segment_id, frame) {
        if (loading_image) {
            wait_count++;
            $('#path_message').html('waiting... ' + wait_count);
            // don't load this now because previous load did not finish
            return ;
        }
        var new_src = '/show_image/' + movie_id + '/' + segment_id + '/' + frame;
        var old_src = $('#stimulus img').attr("src");
        if (new_src == old_src) {
            // nothing to do, image did not change
            same_count++;
            $('#path_message').html('No Change... ' + same_count);
            return;        
        }
        loading_image = true;  // flag loading image
        // Add callback for onload (called when image loaded)
        $('#stimulus img').one('load', function() {
            // called after image is loaded
            loading_image = false;
            if (!image_shown) {
               update_window_size();  // update window sizes when displaying first image
               image_shown = true;
               display_data();    // redraw data screen if needed
            }
            display_stimulus();  // see if have to load another one
        })
        .attr("src", new_src); // set attribute to start loading new image
        $('#path_message').html('Loading... ' + new_src);
    }

    function display_all() {
        if($('#stimulus').is(":visible"))
            display_stimulus();
        if($('#neuro_data').is(":visible"))
            display_data();
    }


    function display_stimulus() {
        var file_id = buf['current_status']['file_id'];
        var page = $('#page_select').val();
        page_key = 'p' + page;
        var stimulus_times = buf[file_id][page_key]['events']['stimulus']['times'];
        var stimulus_values = buf[file_id][page_key]['events']['stimulus']['values'];
        if(stimulus_times == undefined || stimulus_values == undefined ) {
            alert('stimulus times or values not found for file_id=' + file_id + ', page_key=' + page_key);
        }
        var starting_sample = buf[file_id]['dds_x']['starting_sample'];  // current_time in number of samples
        var idx = find_starting_index(stimulus_times, starting_sample, 'left');
        var movie_id = stimulus_values[idx][0];
        var segment_id = stimulus_values[idx][1];
        var segment_start_sample = stimulus_times[idx];
        var sample_delay = starting_sample - segment_start_sample;
        var sampling_rate = buf[file_id]['dds']['metadata']['sampling_rate'];
        var time_delay = sample_delay / sampling_rate;  // time in seconds since segment started
        var frame = Math.floor(time_delay * 30.0);   // 30 frames per second
        var b = buf;  // so visiable in debugger
        msg = 'time_delay=' + time_delay + ', movie_id=' + movie_id + ', segment_id=' + segment_id + ', frame=' + frame;
        $('#info_area').html("<pre>\n" + msg + "\n" + "</pre>\n");
        update_image(movie_id, segment_id, frame);
    }


    function display_data() {
       var canvas = document.getElementById("nd_canvas");  
       var ctx = canvas.getContext("2d"); 
       ctx.font = "bold 12px Arial, Helvetica, sans-serif";  // for channel labels
       ctx.lineWidth = 1;
       var canvas_width = canvas.width;
       var canvas_height = canvas.height;
       ctx.clearRect ( 0, 0, canvas_width, canvas_height );
       var channels = new Array();
       $('#channel_checkboxes input:checked').each(function() {
          channels.push($(this).attr('value'));
       });
       var chan_height = canvas_height / channels.length;
       // if (chan_height > 30) chan_height = 30;  // maximum height of spike train display
       var x_pos = 5;
       var y_pos; 
       var label_width = 5*15;  // a guess, based on 5 chars of 12 point font
       // var str = "";
       // var container = $('#svg_text');
       var chan_mid_height = Math.round(chan_height / 2);
       var chan_stroke_width = Math.round(chan_height * .85);
       for (var i=0; i<channels.length; i++) {
           ch_name = channels[i];
           y_pos = Math.round((i+1) * chan_height) - chan_mid_height;
           // draw channel name
           ctx.fillText(ch_name, x_pos, y_pos);
           // Now add in neuro data (spikes)
           draw_channel_spikes(ctx, ch_name, x_pos + label_width, y_pos, chan_height, canvas_width);
       }
       // var a = document.getElementById('svg_text');
       // a.innerHTML = str;
       // var msg = 'svg_width_pix=' + svg_width_pix + ', svg_height_pix=' + svg_height_pix;
       // $('#info_area').html("<pre>\n" + msg + "\n" + "</pre>\n");
       // $('form #mycheckbox').is(':checked');
    }

    function draw_channel_spikes(ctx, ch_name, x_min, y_cen, chan_height, x_max) {
        // finally, routine that actually draws spikes using canvas
        var spike_height = Math.round(chan_height * 0.45);
        var y_max = y_cen + spike_height;
        var y_min = y_cen - spike_height;
        var file_id = buf['current_status']['file_id'];
        var page = $('#page_select').val();
        page_key = 'p' + page;
        var ch_data = buf[file_id][page_key][ch_name];
        if(ch_data == undefined) {
            alert('data not found for file_id=' + file_id + ', page_key=' + page_key);
        }
        var start_time = buf[file_id]['dds_x']['current_time'];  // start of window in sec, within page
        var view_width = $('#view_select [name=view_width_sec]').val();
        // var samples_per_page = buf[file_id]['dds_x']['samples_per_page'];  // not used?
        var starting_sample = buf[file_id]['dds_x']['starting_sample'];
        var sampling_rate = buf[file_id]['dds']['metadata']['sampling_rate'];
        var ending_sample = starting_sample + (view_width * sampling_rate);
        var view_width_pix = x_max - x_min;
        var view_width_sample = ending_sample - starting_sample;
        var scale_factor = view_width_pix / view_width_sample;
        var start_data_index = find_starting_index(ch_data, starting_sample, 'right');

        // variables used in loop
        var spike_sample;  // sample number of spike
        var spike_pix;  // pixel value corresponding to spike
        var pixel_position = -1;  // current pixel position
        var spike_count;          // number spikes at current pixel
        var idx = start_data_index;
        // finally, start filling in spikes, loop through data
        while (idx < ch_data.length && ch_data[idx] <= ending_sample) {
            spike_sample = ch_data[idx] - starting_sample;  // sample number of spike, relative to view
            idx++;
            spike_pix = Math.round(spike_sample * scale_factor);
            if(spike_pix == pixel_position) {
                spike_count += 1;  // advance spike count for this pixel
            } else {
                if(pixel_position > -1) {
                    // draw spike_count spikes at pixel pixel_position
                    draw_spike(ctx, x_min + pixel_position, y_min, y_max, spike_count);
                }
                // move to new pixel position
                pixel_position = spike_pix;
                spike_count = 1;
            }
        }
        if(pixel_position > -1) {
            // draw final spike_count spikes at pixel pixel_position
            draw_spike(ctx, x_min + pixel_position, y_min, y_max, spike_count);
        }
       // var cur_time = Math.round(starting_time_sec*100)/100;
       // $('svg #cur_time').html(cur_time);
       // $('#info_area').html('window_width=' + view_width_pix + ', overlap_pixel_count=' + overlap_pixel_count);
    }

    function draw_spike(ctx, x_pos, y_min, y_max, spike_count) {
        var colors = ["black", "green", "blue", "orange", "red"];
        var color_index = Math.min(spike_count - 1, colors.length - 1);
        ctx.strokeStyle = colors[color_index];
        ctx.beginPath();
        ctx.moveTo(x_pos + 0.5, y_min + 0.5);
        ctx.lineTo(x_pos + 0.5, y_max + 0.5);
        ctx.stroke();
    }


    function calculate_number_pages(file_id, page_size) {
        var total_spikes = buf[file_id]['dds_x']['total_spikes'];
        // used to determine about maximum data to store at once in each page (mb)
        var buf_size = page_size * 1024 * 1024;
        var npages = Math.round(total_spikes * 4 / buf_size);
        if (npages == 0) npages = 1;  // make sure at least one page
        var last_sample_number = buf[file_id]['dds']['metadata']['last_sample_number'];
        var samples_per_page = Math.round(last_sample_number / npages);
        buf[file_id]['dds_x']['number_pages'] = npages;
        buf[file_id]['dds_x']['samples_per_page'] = samples_per_page;
        // specify time per page in viewer
        var time_per_page = samples_per_page /  buf[file_id]['dds']['metadata']['sampling_rate'];
        buf[file_id]['dds_x']['time_per_page'] = time_per_page;
        $('#total_time').html(Math.round(time_per_page));
        var current_time = 0;   // initially, current_time is zero
        save_current_time(current_time);
    }

    // global, saved because width of #neuro_data seems to change, is unreliable after first call
    // if show stimulus toggled
    var width_offset = 0;

    function update_window_size() {
        $('#page_content').show();   // display page content if not already shown
        var win_height = window.innerHeight;
        var win_width = window.innerWidth;
        var h1 = $('#file_select').height();
        var h2 = $('#view_select').height();
        var stimulus = $('#stimulus');
        var h3;
        if (stimulus.is(":visible"))
           h3 = $('#stimulus').height();
        else
           h3 = 0;
        var h4 = $('#scroll_slider').height();
        var h5 = $('#nd_heading').height();
        var h6 = $('#channel_checkboxes').height();
        var sum = h1+h2+h3+h4+h5+h6;
        sum = sum + h2;  // Not sure why, need to remove more space
        var left_over = win_height - sum;
        var canvas_width;
        if(width_offset == 0) {
            width_offset = win_width - $('#neuro_data').width();  // computed first time
        }
        var neuro_data_width = win_width - width_offset;  // container above canvas
        // var neuro_data_width = $('#neuro_data').width();  // container above canvas

        // var neuro_data_window = document.getElementById("neuro_data");  // container window
        // var ndw_js = neuro_data_window.innerWidth;
        // var ndw_js = neuro_data_window.clientWidth;
        // var ctx = nd_canvas.getContext("2d");  
        // ctx.canvas.height = window.left_over;
        var nd_canvas = document.getElementById("nd_canvas");  // canvas inside neuro_data div
        var new_canvas_height = left_over;
        nd_canvas.style.height = new_canvas_height + "px";
        var new_canvas_width = neuro_data_width - 10;  // set width of canvas area, minus margin
        nd_canvas.style.width = new_canvas_width + "px";
        // var msg = "neuro_data_width=" + neuro_data_width + ", width_offset=" + width_offset + ", win_width=" + win_width; 
        // var msg = "h1=" + h1 + ", h2=" + h2 + ", h3=" + h3 + ", h5=" + h5 + 
                  ", h6=" + h6 + ", sum=" + sum + ", win_height=" + win_height;
        // alert( msg );
        var ctx = nd_canvas.getContext("2d"); 
        ctx.canvas.width  = new_canvas_width;
        ctx.canvas.height = new_canvas_height;
    }

    $('#view_select [name=show_type]').click(function () {
        var cbox = $(this)[0];
        var div = cbox.value;   // will be "stimulus" or "neuro_data"
        var cv = cbox.checked;  // will be true or false
        if (cv)
            $('#' + div).show();  // show div
        else
            $('#' + div).hide();  // hide div
        update_window_size();
        display_all();
    });

    function slide_event(event, ui) {
        var slider_val = ui.value;
        var file_id = buf['current_status']['file_id'];
        var time_per_page = buf[file_id]['dds_x']['time_per_page'];
        var current_time = Math.round(slider_val * time_per_page / 1000) / 10;
        $('#view_select [name=current_time]').val(current_time);
        save_current_time(current_time);
        display_all();
    }

    $("#scroll_slider").slider( {max: 10000, slide: slide_event});


/*****************

// scratch
        buf['current_status']['page_size'] = page_size;
        load_and_display_data();

    function load_and_display_data() {
        // main routine, loads all data related to file_id and page_size
        var file_id = buf['current_status']['file_id'];
        var page_size = buf['current_status']['page_size'];
    }



    // *** svg display data, not canvas version
    function display_data() {
       return;
       // var svg_window = document.getElementById("svg_window");
       var nd_window = $("#neuro_data");
       var svg_width_pix = nd_window.width();  // view width in pixels
       var svg_height_pix = nd_window.height() - 8;  // view width in pixels, e.g. 208 - 8
       // var file_id = $('#file_list').val();
       // get list of selected channels
       var channels = new Array();
       $('#channel_checkboxes input:checked').each(function() {
          channels.push($(this).attr('value'));
       });
       // var channels = buf[file_id]['dds_x']['channels'];
       var chan_height = svg_height_pix / channels.length;
       if (chan_height > 30) chan_height = 30;  // maximum height of spike train display
       var x_pos = 5;
       var y_pos; 
       // var str = "";
       // var container = $('#svg_text');
       var svg_text = document.getElementById('svg_text');
       var svg_spikes = document.getElementById('svg_spikes');
       var te, tn;
       var xmlns = "http://www.w3.org/2000/svg";
       while ( svg_text.childNodes.length >= 1 ) {
           svg_text.removeChild( svg_text.firstChild );       
       } 
       while ( svg_spikes.childNodes.length >= 1 ) {
           svg_spikes.removeChild( svg_spikes.firstChild );       
       } 
       var chan_mid_height = Math.round(chan_height / 2);
       var chan_stroke_width = Math.round(chan_height * .85);
       for (var i=0; i<channels.length; i++) {
           ch_name = channels[i];
           y_pos = Math.round((i+1) * chan_height) - 3;  // shift up three pixels so not at bottom
           // display channel name
           te = document.createElementNS (xmlns, "text");
           te.setAttributeNS(null, 'x', x_pos);
           te.setAttributeNS(null, 'y', y_pos);
           te.setAttributeNS(null, 'font-size', '12');
           tn = document.createTextNode(ch_name);
           te.appendChild(tn);
           svg_text.appendChild(te);
           // Now add in neuro data (spikes)
           te = document.createElementNS (xmlns, "line");
           te.setAttributeNS(null, 'x1', x_pos + 20);
           te.setAttributeNS(null, 'y1', y_pos - chan_mid_height);
           te.setAttributeNS(null, 'x2', svg_width_pix);
           te.setAttributeNS(null, 'y2', y_pos - chan_mid_height);
           te.setAttributeNS(null, 'stroke-width', chan_stroke_width);
           te.setAttributeNS(null, 'stroke', 'black');
           te.setAttributeNS(null, 'stroke-dasharray', "8,3,2,18");
           svg_spikes.appendChild(te);
       }
       // var a = document.getElementById('svg_text');
       // a.innerHTML = str;
       var msg = 'svg_width_pix=' + svg_width_pix + ', svg_height_pix=' + svg_height_pix;
       $('#info_area').html("<pre>\n" + msg + "\n" + "</pre>\n");
       // $('form #mycheckbox').is(':checked');
    }




    function initialize_file(file_id) {
        var file_id = file_id;  
        var page_size = $('#top_select [name=page_size]').val();
        current_status['page_size'] = page_size;
        current_status['file_id'] = file_id;
        get_dds();
        // alert('Initialize page_size=' + page_size + ', id=' + id + ', path=' + path)
    }

    var loading_image = false;
    var wait_count = 0;
    var same_count = 0;

    function update_image () {
        if (loading_image) {
            wait_count++;
            $('#path_message').html('waiting... ' + wait_count);
            // don't load this now because previous load did not finish
            return ;
        }
        var mid = $('#mid').val();
        var movie_id = $('#ui_spec [name=movie_id]').val();
        var segment_id = $('#ui_spec [name=segment_id]').val();
        var frame = $('#ui_spec [name=frame]').val();
        var new_src = '/show_image/' + movie_id + '/' + segment_id + '/' + frame;
        var old_src = $('#img_loc img').attr("src");
        if (new_src == old_src) {
            // nothing to do, image did not change
            same_count++;
            $('#path_message').html('No Change... ' + same_count);
            return;        
        }
        loading_image = true;  // flag loading image
        // Add callback for onload (called when image loaded)
        $('#img_loc img').one('load', function() {
            // called after image is loaded
            loading_image = false;
            update_image();  // see if have to load another one
        })
        .attr("src", new_src); // set attribute to start loading new image
        $('#path_message').html('Loading... ' + new_src);
    }

    var dds;  // global variable (in jquery) for dds info

    function get_dds_js(file_id) {
        if (hdf5_cache[file_id]['dds']) {
           // have dds structure, no need to fetch it again
           initialize_file(file_id);
           return;
        }
        $.getJSON('/get_dds/' + file_id, function(data) {
        hdf5_cache[file_id]['dds'] = data;  // save dds in cache (global variable)
           initialize_file(file_id);
        });
    }

    function initialize_file(file_id) {
        
        extract_page_info();  // adds total_spikes to dds structure
        show_channel_menu();

        dds = data;  // save in global variable
        var sampling_rate = data['metadata']['sampling_rate'];
        var last_sample_number = data['metadata']['last_sample_number'];
        // must call these from this function because they depend on dds being already returned
        var msg = "sampling_rate=" + sampling_rate + ", last_sample_number=" + last_sample_number;
        var str = JSON.stringify(dds, undefined, 2);
        $('#info_area').html("<pre>\n" + msg + "\n" + str + "</pre>\n");

    function extract_page_info() {
        // calculate total number of spikes for all channels, using the dds structure
        var ldds = dds['spiketrains'];
        var channels = Object.keys(ldds);
        var total_spikes = 0;
        var ch_name;
        for (var i=0; i<channels.length; i++) {
            ch_name = channels[i];
            total_spikes += ldds[ch_name]['spike_times']['shape'][0];
        }
        dds['total_spikes'] = total_spikes;
        var max_nspikes = $('#ui_spec [name=max_nspikes]').val();   // maximum number of spikes
        // used to determine how much data to store at once in each page
        var npages = Math.round(total_spikes / max_nspikes);
        if (npages == 0) npages = 1;  // make sure at least one page
        var last_sample_number = dds['metadata']['last_sample_number'];
        var samples_per_page = Math.round(last_sample_number / npages);
        dds['npages'] = npages;
        dds['samples_per_page'] = samples_per_page;
    }

    function show_channel_menu() {
        var ldds = dds['spiketrains'];
        var channels = Object.keys(ldds).sort();
        var container = $('#menu_area');
        var ch_name, label;
        // adapted from:
        // http://stackoverflow.com/questions/579135/creating-checkbox-elements-on-the-fly-with-jquery-odd-ie-behavior
        for (var i =0; i<channels.length; i++) {
           ch_name = channels[i];
           label = "cbx_" + ch_name;
           container.append(
               $(document.createElement("input")).attr({
                        type:  'checkbox'
                        ,id:   label
                        ,name:  'disp_chan'
                        ,value: ch_name
                        ,checked:true
               })
               .click( function( event )
               {
                        var cbox = $(this)[0];
                        alert( cbox.value );
               } )
           )
           .append(
                $(document.createElement('label')).attr({
                        'for':  label
                })
                .text( ch_name )
           )
        }
    }
*/
/**
    function make_page_menu() {
        pm = $('#page_menu');
        if(pm.html() != "") {
            alert('page menu already made.');
            return;
        }
        pm.append(
            $(

Show: <input type="checkbox" name="show_type" value="stimulus" /> Stimulus
<input type="checkbox" name="show_type" value="neurodata" /> Neurodata &nbsp;
Time (sec) <input type="text" name="start_time" value="0" size="6" />
of <span id="total_time"></span>. &nbsp;
<span id="page_select"></span>
<button type="button" name="Load">Load</button>

**/
/*
    // From: http://stackoverflow.com/questions/2998784/how-to-output-integers-with-leading-zeros-in-javascript
    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length-size);
    }

    var ch_data;  // global variable for storing channel data

    function get_data() {
        // choose a random channel
        channel_names = Object.keys(dds['spiketrains']);
        num_channels = channel_names.length;
        random_channel_i = Math.floor(Math.random()*num_channels); 
        random_channel = channel_names[random_channel_i]
        alert("num_channels=" + num_channels + ", random_channel=" + random_channel)
        dataset_path = 'spiketrains/' + random_channel + '/spike_times';
        $.getJSON('/get_dataset/' + dataset_path, function(data) {
        ch_data = data;  // save data globally
        data_length = data.length;
        var sampling_rate = dds['metadata']['sampling_rate'];
        var last_sample_number = dds['metadata']['last_sample_number'];
        var msg = "dataset_path='" + dataset_path + "', Length=" + data_length + 
                  "\nsampling_rate=" + sampling_rate + ", last_sample_number=" + last_sample_number;
        // var str = JSON.stringify(data, undefined, 2);
        // $('#info_area').html("<pre>\n" + msg + "\n" + str + "</pre>\n");
        $('#info_area').html("<pre>\n" + msg + "</pre>\n");
        });
    }

    function initialize_file(file_id) {
        var file_id = file_id;  
        var page_size = $('#top_select [name=page_size]').val();
        current_status['page_size'] = page_size;
        current_status['file_id'] = file_id;
        get_dds();
        // alert('Initialize page_size=' + page_size + ', id=' + id + ', path=' + path)
    }


    $('#ui_spec submit').click(function () {
        update_image();
    });

    $('#ui_spec a').click(function () {
        update_image();
    });

    $('#get_dds').click(function () {
        get_dds_js();
    });

    $('#get_data').click(function () {
        get_data();
    });


    // following called when a new file is selected
    $('#file_list').change(function(event) {
        target = event.target
        file_id = target.value
        // alert('Handler for .change() called. val=' + val);
        // call main starting code to load data for file
        initialize_file(file_id);
    });




    function slide_event(event, ui) {
       var slider_val = ui.value;
       $('#ui_spec [name=frame]').val(slider_val);
       update_image();
    }

    // binary search from
    // http://www.nczonline.net/blog/2009/09/01/computer-science-in-javascript-binary-search/
    function binarySearch(items, value){
    var startIndex  = 0,
        num_items   = items.length - 1,
        stopIndex   = num_items,
        middle      = Math.floor((stopIndex + startIndex)/2);
    while(items[middle] != value && startIndex < stopIndex){
        //adjust search area
        if (value < items[middle]){
            stopIndex = middle - 1;
        } else if (value > items[middle]){
            startIndex = middle + 1;
        }
        //recalculate middle
        middle = Math.floor((stopIndex + startIndex)/2);
    }
    //make sure it's the right value
    //want to return index of element that is >= value
    if (items[middle] < value && middle < num_items - 1) middle += 1;
    return middle;
    }

    function find_starting_index(starting_sample) {
        return binarySearch(ch_data, starting_sample);
    }

    var updating_svg = false;
    function mv_svg_event(event, ui) {
       if (updating_svg) {
           // not sure what to do here, return, flag?
       }
       var sampling_rate = dds['metadata']['sampling_rate'];
       var view_width_pix = $('#svg_window').width();  // view width in pixels
       var view_width_sec = $('#ui_spec [name=view_width_sec]').val();   // view width in seconds
       var view_width_sample = view_width_sec * sampling_rate;
       var last_sample = dds['metadata']['last_sample_number'];  // max possible sample number
       var slider_width = 1000;
       var slider_val = ui.value;
       var starting_sample = (last_sample - view_width_sample) * slider_val / slider_width;
       var starting_time_sec = starting_sample / sampling_rate;
       var ending_sample = starting_sample + view_width_sample;
       var scale_factor = view_width_pix / view_width_sample;
       var start_data_index = find_starting_index(starting_sample);

       // variables used in loop
       var spike;  // sample number of spike
       var spike_pix;  // pixel value corresponding to spike
       var stroke_dasharray = [];
       var stroke_width = 1;
       var idx = start_data_index;
       var pixel_position = 0;
       var overlap_pixel_count = 0;
       var gap;
       // finally, start filling in spikes, loop through data
       while (idx < ch_data.length && ch_data[idx] <= ending_sample) {
           spike = ch_data[idx] - starting_sample;  // sample number of spike, relative to view
           idx++;
           spike_pix = Math.floor(spike * scale_factor + 0.5);
           if (stroke_dasharray.length == 0) {
              // first value, see if spike lands in first pixel position
              if (spike_pix == 0) {
                 stroke_dasharray.push(stroke_width);  // turn on for first spike
                 pixel_position += stroke_width;
                 continue;
              } else {
                 stroke_dasharray.push(0);  // turn on for zero pixels (no spike at first pixel)
              }
           }
           if (spike_pix < pixel_position) {
              overlap_pixel_count++;
              continue;  // skip this spike
           }
           gap = spike_pix - pixel_position;
           if(gap == 0) {
              // this spike next to previous one.  Make previous wider
              stroke_dasharray[stroke_dasharray.length - 1] += stroke_width;
              pixel_position += stroke_width;
           } else {
              // need gap
              stroke_dasharray.push(gap);           // turn off for gap pixels
              stroke_dasharray.push(stroke_width);  // turn on for spike
              pixel_position += gap + stroke_width;
           }
       }
       var str = stroke_dasharray.join(',');
       var line_length_pix = pixel_position;
       // set attributes for new line
       $('svg #ch01').attr("stroke-dasharray", str).attr('x2',line_length_pix);
       var cur_time = Math.round(starting_time_sec*100)/100;
       $('svg #cur_time').html(cur_time);
       $('#info_area').html('window_width=' + view_width_pix + ', overlap_pixel_count=' + overlap_pixel_count);
    }

    function mv_svg_event_old(event, ui) {
       var window_width = $('#svg_window').width();
       var content_width = 20000;  // future, maybe: $('#spikes').width();
       var slider_width = 1000;
       var slider_val = ui.value;
       var wanted_offset = (content_width - window_width) * slider_val / slider_width
       // $('#circle1').attr("cx", slider_val);
       $('#spikes').attr("transform", "translate(-" + wanted_offset + ")" );
       $('#info_area').html('window_width=' + window_width);
    }


    $("#slider").slider( {max: 900, slide: slide_event});

    $("#slider2").slider( {max: 1000, slide: mv_svg_event});
*/
});

/***  
   What is in html 
<div id="img_loc">
  <img src="" />
</div>
<br />
<p id="path_message">
Loading movie_id, segment_id
</p>
<form id="ui_spec" action="#">
  Movie-id:  <input name="movie_id" type="text">,
  Segment-id: <input name="segment_id" type="text">,
  Frame:  <input name="frame" type="text"><br />
  <input type="submit">
</form>
***/
