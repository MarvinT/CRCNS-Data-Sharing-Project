
$(document).ready(function() {
    get_spiketimes();
    
    st = get_state();
    var url = "/nresp-get-stimulus?all=1&scale=4&dataset=" + st.dataset + "&experiment=" + st.experiment + "&format=ogv";
    JSONRequest.get(url, function(reqno, value, exception) {
        if (value) {
            var video = document.getElementById("stimulus_video");
            var sources = video.getElementsByTagName("source");
            sources[0].src = value;
            video.load();
        } else
            alert(exception);
    })
});

var spiketimes = {};
var spiketime_requests = new Array();
var spiketime_units = new Array();

function get_cur_ms()
{
    return parseFloat(document.getElementById("spiketrain_cur_ms").value);
}

function set_cur_ms(curtime)
{
    document.getElementById("spiketrain_cur_ms").value = Math.floor(curtime);
}

function get_state()
{
    var ret = {}
    ret.start_ms = parseFloat(document.getElementById("spiketrain_start_ms").value);
    ret.end_ms = parseFloat(document.getElementById("spiketrain_end_ms").value);
    ret.speed = parseFloat(document.getElementById("play_speed").value);
    ret.dataset = document.getElementById("dataset_select").value;
    ret.experiment = document.getElementById("experiment_select").value;
    var unit_select = document.getElementById("unit_select");
    ret.units = unit_select.options;
    ret.diff_ms = ret.end_ms - ret.start_ms;
    return ret;
}

function setup_spiketimes()
{
    var canv = document.getElementById("spiketimes_canvas");
    canv.oneheight = 60;
    canv.height = 1;
    canv.width = 800;
    canv.xleft = 100;
    canv.yspace = 10;
//    canv.mintime = -1;
//    canv.maxtime = -1;
    canv.addEventListener("click", spiketime_click, false);
}

function get_spiketimes()
{
    var st = get_state();
    var url = "/nresp-get-spiketimes?dataset=" + st.dataset + "&experiment=" + st.experiment +
        "&start_ms=" + st.start_ms + "&end_ms=" + st.end_ms;
    
    // First resize the canvas - this operation clears it also
    var canv = document.getElementById("spiketimes_canvas");
    var allheight = canv.yspace;
    for (var i = 0; i < st.units.length; i++)
        if (st.units[i].selected)
            allheight += canv.oneheight + canv.yspace;
    canv.height = allheight;

    spiketime_requests = new Array();
    spiketime_units = new Array();
    spiketimes = {};
    var pno = 0;
    for (var i = 0; i < st.units.length; i++) {
        if (st.units[i].selected) {
            var url1 = url + "&unit=" + st.units[i].value;
            spiketime_units[pno] = i;
            spiketime_requests[pno] = JSONRequest.get(url1, function(reqno, value, exception) {
                if (value)
                    put_spiketimes(reqno, value, i);
                else
                    alert(exception);
            })
            pno++;
        }
    }
}

function put_spiketimes(reqno, value)
{
    for (var i = 0; i < spiketime_requests.length; i++)
        if (spiketime_requests[i] == reqno) {
            spiketimes[i] = value;
            draw_spiketime_plot(i);
            return;
        }
}

function draw_spiketime_plot(plotnum)
{
    var st = get_state();
    var len = spiketimes[plotnum].length;
    
    var canv = document.getElementById("spiketimes_canvas");
    var ctx = canv.getContext("2d");
    
    var width = canv.width;
    var xleft = canv.xleft;
    var oneheight = canv.oneheight;
    var datawidth = width - xleft;
    var starty = canv.yspace + (oneheight + canv.yspace) * plotnum;

    var label = st.units[spiketime_units[plotnum]].value;
    ctx.fillStyle = "#000000";
    ctx.font = "20px sans-serif";
    ctx.fillText(label, 10, starty + oneheight - 20);

    ctx.fillStyle = "#FFEEEE";
    ctx.fillRect(canv.xleft, starty, datawidth, oneheight);
    var tfactor = datawidth / st.diff_ms;
    for (var i = 0; i < len; i++) {
        var x = (spiketimes[plotnum][i] - st.start_ms) * tfactor;
        ctx.moveTo(x + xleft, starty);
        ctx.lineTo(x + xleft, starty + oneheight);
    }
    ctx.stroke();
    put_spiketime_indicator();
}

function put_spiketime_indicator()
{
    var st = get_state();
    var canv = document.getElementById("spiketimes_canvas");
    var ctx = canv.getContext("2d");
    var numplots = (canv.height - canv.yspace) / canv.oneheight;
    var cur_ms = get_cur_ms();
    var oneheight = canv.oneheight;
    var datawidth = canv.width - canv.xleft;
    var tfactor = datawidth / st.diff_ms;
    var x = (cur_ms - st.start_ms) * tfactor;
    var ys = parseFloat(canv.yspace);
    var xl = parseFloat(canv.xleft);

//    alert("clearing " + xl + " " + 0 + " " + datawidth + " " + ys);
    ctx.clearRect(xl, 0, datawidth, ys);

    ctx.fillStyle = "#FF0000";
    ctx.moveTo(xl + x - ys / 3, 0);
    ctx.lineTo(xl + x + ys / 3, 0);
    ctx.lineTo(xl + x, ys);
    ctx.fill();
}

function spiketime_click(event)
{
    var st = get_state();
    var x = event.clientX;
    var y = event.clientY;
    var width = this.width;
    var height = this.height;
    var xl = this.xleft;
    var datawidth = width - xl;
    var frac = (x - xl) / datawidth;
    var curtime = st.start_ms + st.diff_ms * frac;
    set_cur_ms(curtime);

    stimulus_update();
}

function stimulus_update()
{
    var stim_img = document.getElementById("stimulus_video");
    var stim_hdr = document.getElementById("stimulus_header");
    var st = get_state();

    var ct = get_cur_ms();
    stim_img.currentTime = ct / 1000.0;
    stim_hdr.value = "Stimulus @ " + ct + "ms"

    put_spiketime_indicator();
}

var start_date;
var is_running = false;

function play_back()
{
    var play_but = document.getElementById("play_button");
    var st = get_state();
    if (!is_running) {
        set_cur_ms(st.start_ms);
        start_date = new Date();
        play_but.value = "Stop";
        is_running = true;
        play_back_step();
    } else {
        is_running = false;
        play_but.value = "Play";
    }
}

function play_back_step()
{
    if (!is_running) return;

    var st = get_state();
    var cur_date = new Date();
    var diff_ms = cur_date.getTime() - start_date.getTime();
    var cur_ms = st.start_ms + diff_ms * st.speed;
    var stop = false;
    if (cur_ms >= st.end_ms) {
        cur_ms = st.end_ms;
        stop = true;
    }
    set_cur_ms(cur_ms);
    stimulus_update();
    if (!stop) {
        setTimeout("play_back_step()", 1); // play_speed * 1e3);
    }
}
