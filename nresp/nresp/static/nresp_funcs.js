
function make_spiketime_plot(uname, spiketimes)
{
    // What is the min and max spike time..  Assume spiketimes is sorted
    var mintime = spiketimes[0];
    var maxtime = spiketimes[spiketimes.length - 1];
    
    var canv = document.getElementById(uname + "_canvas");
    var ctx = canv.getContext("2d");

    var width = canv.width;
    var height = canv.height;
    var margin = 5;
    canv.margin = 5;
    var datawidth = width - margin * 2;
    var dataheight = height - margin * 2;
    canv.mintime = mintime;
    canv.maxtime = maxtime;

    ctx.fillStyle = "#FFEEEE";
    ctx.fillRect(margin, margin, datawidth, dataheight);
    var tfactor = datawidth / (maxtime - mintime);
    for (var i = 0; i < spiketimes.length; i++) {
        var x = (spiketimes[i] - mintime) * tfactor;
        ctx.moveTo(x + margin, margin);
        ctx.lineTo(x + margin, dataheight + margin);
        ctx.stroke();
    }

    canv.addEventListener("click", spiketime_click, false);
}

function spiketime_click(event)
{
    var x = event.clientX;
    var y = event.clientY;
    var width = this.width;
    var height = this.height;
    var margin = this.margin;
    var datawidth = width - margin * 2;
    var dataheight = height - margin * 2;
    var frac = (x - margin) / datawidth;
    var curtime = this.mintime + (this.maxtime - this.mintime) * frac;
//    alert("x: " + x + " y: " + y + " " + this + " frac " + frac + " curtime " + curtime);
    var cur_ent = document.getElementsByName("spiketrain_cur_ms")[0];
    cur_ent.value = Math.floor(curtime);

    stimulus_download();
    //stimulus_update();
}

function stimulus_download()
{
    var dataset = document.getElementsByName("dataset")[0].value;
    var experiment = document.getElementsByName("experiment")[0].value;

    // download them all...
    var url = "http://localhost:6543/nresp-get-stimulus?dataset=" + dataset + "&experiment=" + experiment + "&info=1";
    var val = jQuery.ajax(url);
    alert(val);
}

function stimulus_update()
{
    var stim_img = document.getElementById("current_stimulus");
    var cur_ent = document.getElementsByName("spiketrain_cur_ms")[0];
    var time = cur_ent.value;
    var dataset = document.getElementsByName("dataset")[0].value;
    var experiment = document.getElementsByName("experiment")[0].value;
    var url = "http://localhost:6543/nresp-get-stimulus?dataset=" + dataset + "&experiment=" + experiment + "&time=" + time;
    stim_img.src = url;
}

function play_back()
{
    var cur_ent = document.getElementsByName("spiketrain_cur_ms")[0];
    var start_time = parseFloat(document.getElementsByName("spiketrain_start_ms")[0].value);
    var end_time = parseFloat(document.getElementsByName("spiketrain_end_ms")[0].value);
    var play_speed = parseFloat(document.getElementsByName("play_speed")[0].value);
    cur_ent.value = start_time;
    //alert("start " + start_time + " end " + end_time + " speed " + play_speed + " cur " + cur_ent.value);
    play_back_step();
}

function play_back_step()
{
    var cur_ent = document.getElementsByName("spiketrain_cur_ms")[0];
    var end_time = parseFloat(document.getElementsByName("spiketrain_end_ms")[0].value);
    var play_speed = parseFloat(document.getElementsByName("play_speed")[0].value);

    var t = parseFloat(cur_ent.value);
    t += play_speed * 1e3;
    if (t > end_time) t = end_time;
    cur_ent.value = Math.floor(t);
    stimulus_update();
    if (t < end_time) {
        alert("play back step");
        setTimeout("play_back_step()", 1000); // play_speed * 1e3);
    } else
        alert("all done");
}
