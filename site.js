//===========================================================
// site.js - main javascript for site page
//===========================================================
/* globals main, util, data, Dygraph, L */ // for jshint

/*
!!! [ ] summary info - FINISH
        - "info" button shows dialog with table
        - table has row for each model shown
        - columns are: Min (units), Max (units), Volume (acre-feet)
            - no volume for lakes
            - toby will provide volume computation for streams
        - on the fly these things are computed for the time period being shown
        - need to put start end dates at top
        - disable "info" button when viewing differences
*/

// create module object
if(!window.main) window.main = {};


//-----------------------------------------------------------
// init
//   startup
main.init = () => {
    const funcName = "main [init]:";
    console.log(funcName);

    // get id from url
    const id = util.getUrlVal("id");
    if(id === undefined) {
        main.error("Incorrect Usage", 'URL parameter "ID" is required.');
        return;
    }

    // get site info
    const feature = data.sites.features.filter(
        f => f.properties.Id === id
    );
    if(feature.length !== 1) {
        main.error("Site Unavailable", `A site with id "${id}" does not exist.`);
        return;
    }
    main.site = feature[0].properties;
    main.site.latlng = [feature[0].geometry.coordinates[1], feature[0].geometry.coordinates[0]];

    // insert values
    $(".insert-SiteName").html((main.site.SiteNumber ? main.site.SiteNumber : "") + " " + main.site.SiteName);
    $(".insert-SiteType").html(main.site.SiteType === "ST" ? "STREAMFLOW" : "LAKE ELEVATION");
    $(".insert-UnitLabel").html(main.site.SiteType === "ST" ? "feet<sup>3</sup>/second" : "feet");

    // set all series hidden
    let visibility = [];
    for(const modelId in data.models) {
        data.models[modelId].visible = false;
        visibility.push(false);
    }

    // startup: show 1st (baseline)
    data.models["0"].visible = true;
    visibility[0] = true;

    // get plot data
    $.ajax({
        url: `./data/plot/${main.site.Id}.csv.gz`,
        dataType: "text",
        error: err => {
            console.warn(`${funcName} error retrieving data: (${err.status}) ${err.statusText}`);
            main.error();
        },
        success: csv => {

            // create plot
            main.plot = new Dygraph(document.getElementById("plot"), csv, {
                // ...axis display...
                axisLabelFontSize: 12,
                axisLineColor: "#ccc",
                axisLineWidth: 1,
                // ...callbacks...
                underlayCallback: (canvas, area) => {
                    // set plot area fill color
                    canvas.fillStyle = "#fff";
                    canvas.fillRect(area.x, area.y, area.w, area.h);
                    // draw plot area outline
                    canvas.strokeStyle = "#ccc";
                    canvas.strokeRect(area.x, area.y, area.w, area.h);
                },
                // ...data line display...
                strokeWidth: 2,
                visibility: visibility,
                // ...data series colors...
                colors: [
                    "Maroon", "Peru", "Crimson", "DarkSlateGray", "Purple", "DarkGoldenRod", "GoldenRod", "LightSeaGreen", "SteelBlue", "Orange", "Fuchsia", "DarkSeaGreen",
                    "MediumAquaMarine", "Indigo", "DarkOliveGreen", "Black", "SlateGray", "DimGray", "MediumVioletRed", "Cyan", "DarkSalmon", "SandyBrown", "MediumSeaGreen",
                    "DeepSkyBlue", "Tan", "RosyBrown", "MediumSlateBlue", "YellowGreen", "DarkGreen", "Olive", "LightCoral", "RoyalBlue", "CadetBlue", "LimeGreen", "CornflowerBlue",
                    "SaddleBrown", "Navy", "BlueViolet", "DarkSlateBlue", "MediumOrchid", "DodgerBlue", "Orchid", "MediumPurple", "Brown", "DeepPink", "Chocolate", "DarkTurquoise",
                    "MediumBlue", "OliveDrab", "Turquoise", "DarkGray", "SlateBlue", "Teal", "Red", "RebeccaPurple", "SeaGreen", "Sienna", "DarkKhaki", "Gold"
                ],
                // ...grid...
                gridLineColor: "#ccc",
                gridLineWidth: 1,
                // ...interactive elements...
                highlightCircleSize: 5,
                interactionModel: Dygraph.defaultInteractionModel,
                // ...legend...
                legend: "always",
                legendFormatter: o => {
                    let html = "";
                    o.series.forEach(series => {
                        if(series.isVisible) {
                            let entry = `${series.dashHTML} <span style="font-weight:bold; color:${series.color}">${data.models[series.label].Name}</span>`; // look up model id => name
                            if(series.yHTML) entry += ": " + series.yHTML;
                            html += `<div class="mb-1">${entry}</div>`;
                        }
                    });
                    if(o.x) html += `<b>${(new Date(o.x)).toDateString()}</b>`;
                    return html;
                },
                // ...range selector...
                showRangeSelector: true
            });

            // set flags
            main.plot.isDifference = false;
            main.plot.units = "imperial";

            // remove loading
            setTimeout(() => {
                $("#loading").fadeOut(400, () => $("#loading").remove());
            }, 20);

        }
    });

}; // init


//-----------------------------------------------------------
// setModels
//   show dialog with list of models to show/hide in the plot
main.setModels = () => {
    const funcName = "main [setModels]:";
    console.log(funcName);

    // build table
    let html = $( /*html*/ `
        <div>
            <table class="table table-hover table-sm small">
                <thead>
                    <th> </th>
                    <th> ID </th>
                    <th> NAME </th>
                    <th> DATE RANGE </th>
                    <th> PHASE </th>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `);
    for(const id in data.models) {
        $(html).find("tbody").append( /*html*/ `
            <tr data-id="${id}" class="${data.models[id].visible ? "bg-success text-white":""}" style="cursor:pointer;">
                <td class="text-center" style="width:30px;">
                    <i class="fas ${data.models[id].visible ? "fa-check":""}"></i>
                </td>
                <td> ${id} </td>
                <td> ${data.models[id].Name} </td>
                <td> ${data.models[id].YearStart} &ndash; ${data.models[id].YearEnd} </td>
                <td> ${data.models[id].Phase} </td>
            </tr>
        `);
    }

    // show dialog
    util.alert(html.html(), {
        maxWidth: 600,
        title: "Select Alternatives",
        footer: /*html*/ `
            <span class="float-left small text-muted">
                <i class="fas fa-info-circle"></i> Click an alternative to toggle on or off
            </span>`
    });

    // clicking row toggles
    $("#util_ui_alert tbody tr").click(function () {
        $(this).toggleClass("bg-success text-white")
            .find(".fas").toggleClass("fa-check");
        const id = $(this).data("id");
        const visible = $(this).is(".bg-success");
        main.toggleVisible(id, visible);
    });

}; // setModels

// helper function to show (visible=true) or hide (visible=false) model in plot with id=id
main.toggleVisible = (id, visible) => {

    const labels = main.plot.getLabels();
    labels.shift(); // remove 1st "Date"
    const index = labels.findIndex(e => e === id.toString());
    main.plot.setVisibility(index, visible);
    data.models[id].visible = visible;

};


//-----------------------------------------------------------
// setDifference
//   plot normal timeseries data (diff=false) or baseline differences (diff=true)
main.setDifference = diff => {
    const funcName = "main [setDifference]:";
    console.log(`${funcName} ${diff}`);

    // do nothing if already done
    if(main.plot.isDifference === diff) return;

    // save original baseline array if not saved yet
    if(!main.baseline) {
        main.baseline = [];
        main.plot.rawData_.forEach(a => main.baseline.push(a[1]));
    }

    // toggle data
    let row = 0;
    const sign = main.plot.isDifference ? +1 : -1;
    main.plot.rawData_.forEach(a => {
        const b = main.baseline[row];
        a[0] = new Date(a[0]);
        for(let i = 1; i < a.length; i++) {
            if(b !== null && a[i] !== null) a[i] = a[i] + sign * b;
        }
        row++;
    });
    main.plot.updateOptions({
        file: main.plot.rawData_,
    });
    main.plot.isDifference = diff;

    // update label
    $(".insert-isDifference").html(diff ? " &ndash; BASELINE DIFFERENCES" : "");

}; // setDifference


//-----------------------------------------------------------
// setUnits
//   change plot units to units="imperial" or units="metric"
main.setUnits = units => {
    const funcName = "main [setUnits]:";
    console.log(`${funcName} ${units}`);

    // set conversion factor and label
    //   1 cfs  = 0.028317 cubic meters per second
    //   1 foot = 0.3048   meters
    let factor, UnitLabel;
    if(units === "imperial" && main.plot.units === "metric" && main.site.SiteType === "ST") {
        // cms => cfs
        factor = 1 / 0.028317;
        UnitLabel = "feet<sup>3</sup>/second";
    } else if(units === "imperial" && main.plot.units === "metric" && main.site.SiteType === "LK") {
        // m => ft
        factor = 1 / 0.3048;
        UnitLabel = "feet";
    } else if(units === "metric" && main.plot.units === "imperial" && main.site.SiteType === "ST") {
        // cfs => cms
        factor = 0.028317;
        UnitLabel = "meters<sup>3</sup>/second";
    } else if(units === "metric" && main.plot.units === "imperial" && main.site.SiteType === "LK") {
        // ft => m
        factor = 0.3048;
        UnitLabel = "meters";
    } else {
        console.log(`${funcName} nothing to do`);
        return;
    }

    // convert plot data and update plot
    main.plot.rawData_.forEach(a => {
        a[0] = new Date(a[0]);
        for(let i = 1; i < a.length; i++) {
            if(a[i] !== null) a[i] = a[i] * factor;
        }
    });
    main.plot.updateOptions({
        file: main.plot.rawData_,
    });
    main.plot.units = units;

    // convert static baseline data
    if(main.baseline) {
        main.baseline.forEach((a, i) => {
            if(a !== null) main.baseline[i] = a * factor;
        });
    }

    // update label
    $(".insert-UnitLabel").html(UnitLabel);

}; // setUnits


//-----------------------------------------------------------
// setLogscale
//   set logscale (logscale=true) or linear y-scale (logscale=false)
main.setLogscale = logscale => {
    const funcName = "main [setLogscale]:";
    console.log(`${funcName} logscale ${logscale}`);

    // set logscale option
    main.plot.updateOptions({
        logscale: logscale
    });

}; // setLogscale


//-----------------------------------------------------------
// clearPlot
//   clear all series from plot
main.clearPlot = () => {
    const funcName = "main [clearPlot]:";
    console.log(funcName);

    // set all series hidden
    let visibility = [];
    for(const modelId in data.models) {
        data.models[modelId].visible = false;
        visibility.push(false);
    }
    main.plot.updateOptions({
        visibility: visibility
    });

}; // clearPlot


//-----------------------------------------------------------
// info
//   popup summary info for currently viewed data
main.info = () => {
    const funcName = "main [info]:";
    console.log(funcName);

    // !!!
    util.alert("Sorry this feature is not available yet.", {
        title: "Coming Soon"
    });

}; // info


//-----------------------------------------------------------
// siteMap
//   show dialog with site map
main.siteMap = () => {
    const funcName = "main [siteMap]:";
    console.log(funcName);

    // show dialog with map
    const height = $(window).height() > 700 ? 600 : 370;
    util.alert( /*html*/ `
        <div id="siteMap" class="border bg-white m-n3" style="height:${height}px;"></div>`, {
        title: "Site Map",
        maxWidth: 700,
        center: true
    });

    // make map
    const map = new L.Map("siteMap", {
        minZoom: 3,
        maxZoom: 17,
        zoom: 5,
        center: main.site.latlng,
        scrollWheelZoom: "center",
        attributionControl: false,
        simplepickerControl: {},
        zoomerControl: {
            buttons: ["in", "home", "points", "out"],
            zoomHomeTarget: m => m.setView(main.site.latlng, 5),
            zoomPointsTarget: m => m.setView(main.site.latlng, 15)
        },
        scalebarControl: {},
        coordinatesControl: {
            position: "bottomright",
            className: "small"
        },
        layers: L.marker(main.site.latlng)
    });
    setTimeout(() => map.invalidateSize(), 300);

}; // siteMap


//-----------------------------------------------------------
// download
//   download zipped data file for site
main.download = () => {
    const funcName = "main [download]:";
    console.log(`${funcName} ${main.site.Id}`);

    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = `./data/download/${main.site.Id}.csv.zip`;
    a.download = main.site.SiteName;
    a.click();
    document.body.removeChild(a);

}; // download


//-----------------------------------------------------------
// error
//   error handler
main.error = (title = "Data Unavailable", msg = "") => {

    // clear page and show message
    $("body").empty().html( /*html*/ `
        <div class="position-fixed w-100 h-100 d-flex justify-content-center align-items-center overflow-hidden">
            <div class="alert alert-warning text-center px-5" style="max-width:800px; margin:0 auto;">
                <h2>${title}</h2>
                ${msg}
            </div>
        </div>
    `);

}; // error
