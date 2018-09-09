var onscreen = Array();
var current = -1;
var pause = 1;
var timer;
var trackid;
var tasPk;
var interval = 5;

String.prototype.format = function()
{
    var pattern = /\{\d+\}/g;
    var args = arguments;
    return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
}
function merge_tracks(tasPk, traPk, incPk)
{
    microAjax("merge_track.php?tasPk="+tasPk+"&traPk="+traPk+"&incPk="+incPk, function(data) 
        { 
            window.location.href="tracklog_map.html?trackid="+traPk;
        } );
}
function plot_track(jstr)
{
    var track;
    var row;
    var line;
    var body;
    var trklog;
    var polyline;
    var gll;
    var count;
    var color;
    var initials;
    var pngclass;
    var offset;
    var lasLat, lasLon, lasAlt, lasTme;

    count = 1;
    offset = 0;
    body = JSON.parse(jstr)
    plot_track_header(body);
    track = body["track"];
    initials = body["initials"];
    pngclass = body["class"];

    line = Array();
    segments = Array();
    trklog = Array();
    color = (onscreen.length % 7)+1;
    for (row in track)
    {
        lasTme = track[row][0];
        lasLat = track[row][1];
        lasLon = track[row][2];
        lasAlt = (track[row][3]/10);
        if (lasAlt > 255)
        {
            lasAlt = 255;
        }

        if (lasTme < -7200)
        {
            continue;
        }

        //if (count == 1) 
        //{ 
        //    map.setCenter(new google.maps.LatLng(lasLat, lasLon)); 
        //    map.setZoom(13); 
        //}
    
        gll = new L.LatLng(lasLat, lasLon);
        line.push(gll);
        trklog.push(track[row]);
    
        if (count % 10 == 0)
        {
            // color & 0x100 >> 2, color &0x010 >> 1, color &0x001
            //polyline = new google.maps.Polyline(line, sprintf("#%02x%02x%02x",lasAlt,color*32%256,color*128%256), 3, 1);
            polyline = new L.Polyline(line, {   
                    color: sprintf("#%02x%02x%02x",lasAlt*((color&0x4)>>2) ,lasAlt*((color&0x2)>>1),lasAlt*(color&0x1)), 
                    weight: 3, 
                    opacity: 1
                });
            polyline.addTo(map);
            segments.push(polyline);
            line = Array();
            line.push(gll);
        }
        count = count + 1;    
    }

    polyline = new L.Polyline(line, {   
        color: sprintf("#%02x%02x%02x",lasAlt*((color&0x4)>>2) ,lasAlt*((color&0x2)>>1),lasAlt*(color&0x1)), 
        weight: 3, 
        opacity: 1
    });
    polyline.addTo(map);
    //polyline = new google.maps.Polyline(line, sprintf("#%02x%02x%02x",lasAlt*(color&0x100>>2) ,lasAlt*(color&0x010>>1),lasAlt*(color&0x1)), 3, 1);
    //map.addOverlay(polyline);
    //segments.push(polyline);
    document.getElementById("foo").value = trackid;
    onscreen[trackid] = Array();
    onscreen[trackid]["track"] = trklog;
    onscreen[trackid]["segments"] = segments;
    onscreen[trackid]["initials"] = initials;
    onscreen[trackid]["class"] = pngclass;
}
function add_track(comPk, traPk, interval)
{
    new microAjax("get_track.php?comPk="+comPk+"&trackid="+traPk+"&int="+interval, plot_track);
}
function plot_track_bounds(jstr)
{
    var trk;

    plot_track(jstr);
    bounds = new L.LatLngBounds();
    trk = onscreen[trackid]["track"];
    for (row in trk)
    {
        lasLat = trk[row][1];
        lasLon = trk[row][2];
        gll = new L.LatLng(lasLat, lasLon);
        bounds.extend(gll);
    }
    map.fitBounds(bounds);
}
function plot_region(jstr)
{
    var task;
    var track;
    var row;
    var count;
    var pos;
    var sz;

    count = 1;
    document.getElementById("foo").value = "plot_region";
    task = JSON.parse(jstr)
    track = task["region"];
    for (row in track)
    {
        lasLat = track[row][0];
        lasLon = track[row][1];
        cname =  track[row][2];
        crad = track[row][3];

        if (count == 1)
        {
            map.setCenter(new L.LatLng(lasLat, lasLon), 13);
        }
    
        count = count + 1;    

        pos = new L.LatLng(lasLat,lasLon);
        //overlay = new ELabel(map, pos, cname, "waypoint", new google.maps.Size(0,0), 60);
        add_label(map, pos, cname, "waypoint");

        if (crad > 0)
        {
            sz = GSizeFromMeters(map, pos, crad*2,crad*2);
            overlay = new EInsert(map, pos, "circle.png", sz, map.getZoom());
        }

    }

    //document.getElementById("foo").value = trackid;
    return task;
}
function plot_award_task(tasPk, trackid)
{
    // FIX: should show already awarded ones ...
    microAjax("get_track_progress.php?tasPk="+tasPk+"&trackid="+trackid,
    function(data) {
    var task;
    var tps;
    var track;
    var incpk;
    var ovlay;
    var ovhtml;
    var cnt;
    var end = 0;

    var task = JSON.parse(data);
    ovhtml = "<div class=\"htmlControl\"><b>Award Points</b><br><form name=\"trackdown\" method=\"post\">\n";
    track = task["task"];
    tps = 0 + task["turnpoints"];
    incpk = task["merge"];
    cnt = 0;
    plot_waypoints(track);
    // fix to show awarded points - unclick to unaward ..
    for (row in track)
    {
        cnt = cnt + 1;
        if (cnt > tps)
        {
            name = track[row]['rwpName'];
            tawtype = track[row]['tawType'];
            tawPk = track[row]['tawPk'];
            if ((end == 0) && (tawtype == 'endspeed' || tawtype == 'goal'))
            {
                ovhtml = ovhtml +  cnt + ". <input onblur=\"x_award_waypoint(" + tasPk + "," + tawPk + "," + trackid + ",this.value,done)\" type=\"text\" name=\"goaltime\" size=5>&nbsp;" + name + "<br>";
                end = 1;
            }
            else if (tawtype == 'speed')
            {
                ovhtml = ovhtml +  cnt + ". <input onblur=\"x_award_waypoint(" + tasPk + "," + tawPk + "," + trackid + ",this.value,done)\" type=\"text\" name=\"goaltime\" size=5>&nbsp;" + name + "<br>";
            }
            else
            {
                ovhtml = ovhtml +  cnt + ". <input type=\"checkbox\" name=\"turnpoint\" onclick=\"x_award_waypoint(" + tasPk + "," + tawPk + "," + trackid + "," + cnt + ",done)\">&nbsp;" + name + "<br>";
            }
        }
    }
    // add in a 'merge with' option?
    if (incpk > 0)
    {
        ovhtml = ovhtml + "<br><center><input type=\"button\" name=\"domerge\" value=\"Merge "+incpk+"\" onclick=\"merge_tracks("+tasPk+","+trackid+","+incpk+");\"></center>";
    }
    ovhtml = ovhtml + "</form></div>";
    add_panel(map, "bottomright", ovhtml, 'map_control');
    //ovlay = new HtmlControl(ovhtml, { visible:false, selectable:true, printable:true } );
    //ovlay = new HtmlControl('Hello World!', { visible:false, selectable:true, printable:true } );
    //map.addControl(ovlay, new google.maps.ControlPosition(G_ANCHOR_BOTTOM_RIGHT, new GSize(128, 256)));
    //map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(ovlay);
    //map.addControl(ovlay, new google.maps.ControlPosition(G_ANCHOR_BOTTOM_RIGHT, new google.maps.Size(10, 10)));
    //ovlay.setVisible(true);
    });
}
function plot_track_header(body)
{
    var ihtml;
    var ovlay;
    // FIX: should show already awarded ones ...
    ihtml = "<div class=\"trackInfo\"><b>" + body["name"] + "</b><br>\n";
    ihtml = ihtml + body["date"] + "<br>";
    ihtml = ihtml + body["glider"] + "<br>";
    if (body["goal"])
    {
        ihtml = ihtml + body["dist"] + "km<br>Goal: " + body["goal"] + "<br>\n";
    }
    else
    {
        ihtml = ihtml + body["dist"] + "km, " + body["duration"] + "<br>\n";
    }
    if (body["comment"])
    {
        ihtml = ihtml + body["comment"] + "<br>\n";
    }
    ihtml = ihtml + "</div>";
    add_panel(map, "topright", ihtml, 'map_panel');
}
function plot_track_wp(jstr)
{
    var track;
    var row;
    var line;
    var trklog;
    var polyline;
    var gll;
    var count;
    var pos;
    var wpt;

    count = 1;
    track = JSON.parse(jstr)
    line = Array();
    segments = Array();
    trklog = Array();
    bounds = new L.LatLngBounds();
    for (row in track)
    {
        lasLat = track[row][0];
        lasLon = track[row][1];
        cname = "" + count;

        //if (count == 1)
        //{
        //    map.setCenter(new google.maps.LatLng(lasLat, lasLon), 13);
        //}
    
        gll = new L.LatLng(lasLat, lasLon);
        line.push(gll);
        bounds.extend(gll);
        trklog.push(track[row]);
    
        if (count % 10 == 0)
        {
            polyline = new L.Polyline(line, {
                color:"#ff0000", weight:2, opacity:1 });
            polyline.setMap(map);
            segments.push(polyline);
            line = Array();
            line.push(gll);
        }
        count = count + 1;    

        pos = new L.LatLng(lasLat,lasLon);
        //wpt = new ELabel(map, pos, cname, "waypoint", new google.maps.Size(0,0), 60);
        wpt = add_label(map, pos, cname, "waypoint");
    }

    polyline = new google.maps.Polyline({
                path: line, color:"#ff0000", weight:2, opacity:1 });
    polyline.addTop(map);
    segments.push(polyline);
    map.fitBounds(bounds);
    //document.getElementById("foo").value = trackid;
}
function format_seconds(tm)
{
    var h, m, s;

    if (tm < 0) 
    { 
        tm = tm + 86400; 
    }
    h = (tm / 3600) % 24;
    m = (tm / 60) % 60;
    s = tm % 60;

    return sprintf("%02d:%02d:%02d", h, m, s);
}
function plot_glider(glider,lat,lon,alt)
{
    // FIX: plot a point ...
    //var para;
    var mark;
    var html;
    var off;

    //para = new google.maps.Icon();
    //para.image = "pger" + (onscreen[glider]["ic"]%6) + ".png";
    //para.iconAnchor = new google.maps.Point(10,20)

    // load image ...
    html = "<center>" + onscreen[glider]["initials"] + "<br><img src=\"images/" + onscreen[glider]["class"] + (onscreen[glider]["ic"]%7) + ".png\"></img><br>"+Math.floor(alt/10)+"</center>";
    if (alt > 999)
    {
        off = new google.maps.Size(-8,16);
    }
    else
    {
        off = new google.maps.Size(-12,16);
    }

    if (!onscreen[glider]["icon"])
    {
        //mark = new google.maps.Marker(new GLatLng(lat,lon),{ icon: para });
        //map.addOverlay(mark);
        mark = new ELabel(map, new google.maps.LatLng(lat,lon), html, "animate", off, 100);
//
//    if (onscreen[glider]["icon"])
//    {
//        onscreen[glider]["icon"].setMap(null);
//    }
        onscreen[glider]["icon"] = mark;
    }
    else
    {
        onscreen[glider]["icon"].setContents(html);
        onscreen[glider]["icon"].setPosition(new google.maps.LatLng(lat,lon));
    }
}
function animate_update()
{
    var count;
    var lasLat, lasLon, lasAlt, lasTme;
    var flag;
    for (glider in onscreen)
    {
        track = onscreen[glider]["track"];
        count = onscreen[glider]["pos"];
        lasLat = 0;
        if (count < track.length)
        {
            lasTme = track[count][0];
            flag = 1;
            //document.getElementById("foo").value = "l"+lasTme;
            while (lasTme < current && count < track.length)
            {
                lasTme = track[count][0];
                lasLat = track[count][1];
                lasLon = track[count][2];
                lasAlt = track[count][3];
                //lasAlt = (track[row][3]/10)%256;
                count++;
            }
            if (lasLat != 0)
            {
                onscreen[glider]["pos"] = count;
                plot_glider(glider,lasLat,lasLon,lasAlt);
            }
        }
    }
    document.getElementById("foo").value = format_seconds(current * interval);
    current = current + interval;
    //document.getElementById("foo").value = current;
    if (flag == 1 && pause == 0)
    {
        timer=setTimeout("animate_update()",250);
    }
}
function animate_init()
{
    var mintime;
    var ic=0;
    // need some small icons/markers for pgs

    document.getElementById("foo").value = "an1";
    mintime = 999999;
    for (row in onscreen)
    {
        //document.getElementById("foo").value = "a" + row;
        if (onscreen[row]["track"][0][0] < mintime)
        {
            mintime = onscreen[row]["track"][0][0];
        }
        onscreen[row]["pos"] = 0;
        onscreen[row]["icon"] = 0;
        onscreen[row]["ic"] = ic++;
    }
    current = mintime + interval;
    //document.getElementById("foo").value = current;
}
function reset_map()
{
    clearTimeout(timer);
    pause = 1;

    // clear current icons;
    for (glider in onscreen)
    {
        if (onscreen[glider]["icon"])
        {
            onscreen[glider]["icon"].setMap(null);
        }
    }

    animate_init();
    document.getElementById("pause").value = ">>";
    current == -1;
}
function pause_map()
{
    if (pause == 0)
    {
        clearTimeout(timer);
        pause = 1;
        document.getElementById("pause").value = ">>";
    }
    else
    {
        if (current == -1)
        {
            animate_init();
        }
        timer=setTimeout("animate_update()",125);
        pause = 0;
        document.getElementById("pause").value = "=";
    }
}
function forward()
{
    animate_update();
}
function back()
{
    var count;
    var lasLat, lasLon, lasTme, lasAlt;
    var flag;
    current = current - interval;
    for (glider in onscreen)
    {
        track = onscreen[glider]["track"];
        count = onscreen[glider]["pos"];
        lasTme = track[count][0];
        lasLat = 0;
        if (count >= 0)
        {
            //document.getElementById("foo").value = "l"+lasTme;
            while (lasTme > current && count >= 0)
            {
                lasTme = track[count][0];
                lasLat = track[count][1];
                lasLon = track[count][2];
                lasAlt = track[count][3];
                //lasAlt = (track[row][3]/10)%256;
                flag = 1;
                count--;
            }
            if (lasLat != 0)
            {
                onscreen[glider]["pos"] = count;
                plot_glider(glider,lasLat,lasLon,lasAlt);
            }
        }
    }
    document.getElementById("foo").value = format_seconds(current * interval);
    //document.getElementById("foo").value = current;
}
function clear_map()
{
    var segments;

    // Remove line segments ..
    for (row in onscreen)
    {
        segments = onscreen[row]["segments"];
        for (i in segments)
        {
            segments[i].setMap(null);
        }
        if (onscreen[glider]["icon"])
        {
            onscreen[glider]["icon"].setMap(null);
        }
    }

    // clear it ..
    onscreen = Array();
}

